import { ChatMessage, CloudLLMConfig, OllamaConfig } from '../types';
import { MCPTool, MCPToolCall } from '../types/mcp-types';
import { mcpClientManager } from './mcp-client';
import { FileSystemAPI } from './file-api';
import type {
  ChatMode,
  AgentConfig,
  LLMCallResult,
  ToolCall,
  AgentRuntimeOptions,
} from '../types/ide-types';

const buildPromptFromMessages = (messages: ChatMessage[]): string => {
  const sorted = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  return sorted
    .map((message) => {
      const label =
        message.role === 'user'
          ? 'User'
          : message.role === 'assistant'
            ? 'Assistant'
            : message.role === 'tool'
              ? 'Tool'
              : 'System';
      return `${label}: ${message.content}`;
    })
    .join('\n\n');
};

const getModeSystemPrompt = (mode: ChatMode): string | null => {
  if (mode === 'ask') {
    return [
      'You are in Ask mode.',
      'Focus on learning, planning, and answering questions.',
      'Treat this as read-only exploration: do not make edits or run commands that change state.',
      'If you use tools, prefer search and read-only tools (e.g., read file, codebase search, grep) and avoid tools that write or mutate external systems.',
    ].join(' ');
  }

  if (mode === 'plan') {
    return [
      'You are in Plan mode.',
      'First, produce a concise, numbered plan (3–7 steps) for how you will solve the user’s request before executing any changes.',
      'Ask the user to confirm or adjust the plan before you start editing files or running tools.',
      'Do not make edits or run tools until the plan is confirmed.',
    ].join(' ');
  }

  if (mode === 'agent') {
    return [
      'You are in Agent mode.',
      'You may autonomously use tools, run commands, and edit files as needed to solve the task.',
      'Keep the user informed of major steps, and fix errors you encounter when reasonable.',
    ].join(' ');
  }

  return null;
};

const getCloudApiKey = (config: CloudLLMConfig): string => {
  if (config.apiKey) {
    return config.apiKey;
  }

  let envKey: string | undefined;
  if (config.provider === 'openai') {
    envKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  } else if (config.provider === 'gemini') {
    envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  } else if (config.provider === 'anthropic') {
    envKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  }

  if (!envKey) {
    throw new Error(
      'No API key configured. Set it in a .env file (VITE_OPENAI_API_KEY / VITE_GEMINI_API_KEY / VITE_ANTHROPIC_API_KEY) or enter it in the UI.',
    );
  }

  return envKey;
};

const getAgentRootPrompt = async (): Promise<string | null> => {
  try {
    const root = await FileSystemAPI.getAgentRootDir();
    if (!root) {
      return null;
    }

    const docsDir = `${root.replace(/[/\\]$/, '')}/docs`;

    return [
      `You are working inside the project root directory: ${root}.`,
      `The primary documentation/knowledge base for this project is the docs folder under the agent root: ${docsDir} (if it exists).`,
      'In any mode (Ask, Plan, or Agent), when you need to understand the project, first look for and read relevant markdown files under this docs/ folder before deeply exploring raw IEC 61499, HMI, or configuration files.',
      'Use these docs as your starting point for project structure, function blocks, skills, and MCP integrations, and only open additional source/config files when the docs are missing or insufficient.',
      'When using filesystem tools (read_file, list_directory, create_file, replace_in_file), interpret relative paths as rooted at this directory unless the user explicitly provides an absolute path.',
      'Do not attempt to read or write files outside this project root.',
    ].join(' ');
  } catch (error) {
    console.error('[LLM] Failed to load agent root directory:', error);
    return null;
  }
};

/**
 * Convert MCP tools to OpenAI function format
 */
const convertMCPToolsToOpenAI = (mcpTools: MCPTool[]) => {
  return mcpTools.map(tool => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema,
  }));
};

/**
 * Convert MCP tools to Gemini function declaration format
 */
const convertMCPToolsToGemini = (mcpTools: MCPTool[]) => {
  if (!mcpTools.length) {
    return [];
  }

  const sanitizeSchema = (schema: any): any => {
    if (schema === null || schema === undefined) return schema;
    if (Array.isArray(schema)) {
      return schema.map((item) => sanitizeSchema(item));
    }
    if (typeof schema !== 'object') {
      return schema;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'additionalProperties') {
        // Gemini tools parameters schema does not support additionalProperties
        continue;
      }
      result[key] = sanitizeSchema(value);
    }
    return result;
  };

  return [
    {
      functionDeclarations: mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        parameters: sanitizeSchema(tool.inputSchema),
      })),
    },
  ];
};

const callOpenAIChat = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mcpTools: MCPTool[] = [],
  mode: ChatMode,
  options?: AgentRuntimeOptions,
): Promise<LLMCallResult> => {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  );

  const apiKey = getCloudApiKey(config);

  const modeSystemContent = getModeSystemPrompt(mode);
  const agentRootPrompt = await getAgentRootPrompt();

  // Convert chat messages to OpenAI format
  const toolSystemMessage =
    mcpTools.length > 0
      ? {
          role: 'system',
          content:
            mcpTools
              .map(
                (tool) =>
                  `- ${tool.name}${
                    tool.description ? `: ${tool.description}` : ''
                  }`,
              )
              .join('\n'),
        }
      : null;

  const modeSystemMessage = modeSystemContent
    ? {
      role: 'system' as const,
      content: modeSystemContent,
    }
    : null;

  const agentRootSystemMessage = agentRootPrompt
    ? {
      role: 'system' as const,
      content: agentRootPrompt,
    }
    : null;

  const openaiMessages = [
    ...(modeSystemMessage ? [modeSystemMessage] : []),
    ...(agentRootSystemMessage ? [agentRootSystemMessage] : []),
    ...(toolSystemMessage ? [toolSystemMessage] : []),
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.role === 'tool' && msg.name ? { name: msg.name } : {}),
      ...(msg.role === 'tool' && msg.toolCallId
        ? { tool_call_id: msg.toolCallId }
        : {}),
    })),
  ];

  const requestBody: any = {
    model: config.model,
    input: openaiMessages,
  };

  const tools: any[] = [];
  const allowTools =
    mode === 'agent' ||
    (mode === 'plan' && options?.planApproved) ||
    (mode === 'ask' && options?.allowAskTools);

  if (allowTools && mcpTools.length > 0) {
    tools.push(...convertMCPToolsToOpenAI(mcpTools));
  }

  if (allowTools && options?.webSearchEnabled) {
    tools.push({ type: 'web_search' });
  }

  if (tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenAI error (${response.status})`);
  }

  const data: any = await response.json();
  const output = Array.isArray(data?.output) ? data.output : [];

  if (!output.length) {
    throw new Error('OpenAI returned no output');
  }

  const functionCallItems = output.filter(
    (item: any) => item?.type === 'function_call',
  );

  if (functionCallItems.length > 0) {
    const toolCalls: ToolCall[] = [];

    for (const fc of functionCallItems) {
      const functionName =
        fc.tool_name ||
        fc.name ||
        fc.function?.name;

      if (!functionName) {
        continue;
      }

      const rawArgs =
        fc.arguments ??
        fc.args ??
        fc.function?.arguments ??
        {};

      let functionArgs: any;

      if (typeof rawArgs === 'string') {
        try {
          functionArgs = JSON.parse(rawArgs);
        } catch {
          functionArgs = {};
        }
      } else {
        functionArgs = rawArgs || {};
      }

      toolCalls.push({
        id: fc.id || `tool-${Date.now()}`,
        name: functionName,
        arguments: functionArgs,
      });
    }

    if (toolCalls.length > 0) {
      return { toolCalls };
    }
  }

  const assistantItem =
    output.find(
      (item: any) => item?.type === 'message' && item?.role === 'assistant',
    ) ||
    output.find((item: any) => item?.type === 'message') ||
    output[0];

  const contentParts = Array.isArray(assistantItem?.content)
    ? assistantItem.content
    : [];

  const textParts = contentParts
    .map((part: any) => {
      if (!part) return '';
      if (typeof part.text === 'string') {
        return part.text;
      }
      if (
        part.text &&
        typeof part.text === 'object' &&
        typeof part.text.value === 'string'
      ) {
        return part.text.value;
      }
      return '';
    })
    .filter((t: string) => t.trim().length > 0);

  const content = textParts.join(' ').trim();

  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }

  return { finalText: content };
};


/**
 * Local tools definition
 */
const BASE_LOCAL_TOOLS: MCPTool[] = [
  {
    name: 'create_file',
    description: 'Create a new file or overwrite an existing one with the given content.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path of the file to create' },
        content: { type: 'string', description: 'The content to write to the file' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the content of a file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path of the file to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The directory path to list' },
      },
      required: ['path'],
    },
  },
  {
    name: 'replace_in_file',
    description: 'Replace a string in a file with another string.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path of the file to modify' },
        search: { type: 'string', description: 'The string to search for' },
        replace: { type: 'string', description: 'The string to replace it with' },
      },
      required: ['path', 'search', 'replace'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for up-to-date information and return relevant snippets and URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return',
        },
      },
      required: ['query'],
    },
  },
];

const APPLY_PATCH_TOOL: MCPTool = {
  name: 'apply_patch',
  description:
    'Apply one or more file patches (create, update, or delete files) using V4A-style diffs inside the current workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        description:
          'List of patch operations to apply in order. Each operation targets a single file.',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description:
                'Operation type: "create_file", "update_file", or "delete_file".',
            },
            path: {
              type: 'string',
              description:
                'Path of the file to create, update, or delete. Relative paths are resolved against the agent root.',
            },
            diff: {
              type: 'string',
              description:
                'Headerless V4A diff. Required for "create_file" and "update_file"; ignored for "delete_file".',
            },
          },
        },
      },
    },
    required: ['operations'],
  },
};

// Local tool registry used for execution
const LOCAL_TOOLS: MCPTool[] = [...BASE_LOCAL_TOOLS, APPLY_PATCH_TOOL];

const executeLocalTool = async (name: string, args: any) => {
  switch (name) {
    case 'create_file':
      await FileSystemAPI.writeFile(args.path, args.content);
      return { content: [{ type: 'text', text: `File created successfully at ${args.path}` }] };
    case 'read_file':
      const content = await FileSystemAPI.readFile(args.path);
      return { content: [{ type: 'text', text: content }] };
    case 'list_directory':
      const files = await FileSystemAPI.listDirectory(args.path);
      return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
    case 'replace_in_file':
      const originalContent = await FileSystemAPI.readFile(args.path);
      if (!originalContent.includes(args.search)) {
        throw new Error(`Search string not found in file: ${args.path}`);
      }
      const newContent = originalContent.replace(args.search, args.replace);
      await FileSystemAPI.writeFile(args.path, newContent);
      return { content: [{ type: 'text', text: `Successfully replaced content in ${args.path}` }] };
    case 'web_search': {
      const query = args.query;
      const maxResults = typeof args.max_results === 'number' ? args.max_results : 5;
      if (!query || typeof query !== 'string') {
        throw new Error('web_search requires a "query" string argument');
      }
      try {
        const response = await fetch('http://localhost:3002/api/web-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            maxResults,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Web search backend error (${response.status})`);
        }

        const data: any = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(String(error));
      }
    }
    case 'apply_patch': {
      const operations = Array.isArray(args?.operations) ? args.operations : [];
      if (!operations.length) {
        throw new Error('apply_patch requires a non-empty "operations" array');
      }

      const response = await fetch('http://localhost:3002/api/files/apply-patch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operations }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `apply_patch backend error (${response.status})`);
      }

      const data: any = await response.json();
      const summary =
        typeof data?.summary === 'string'
          ? data.summary
          : JSON.stringify(data, null, 2);

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
};

/**
 * Get all available MCP tools from connected servers
 */
const getAllMCPTools = (mode: ChatMode, options?: AgentRuntimeOptions): MCPTool[] => {
  if (mode === 'plan' && !options?.planApproved) {
    return [];
  }

  if (mode === 'ask' && !options?.allowAskTools) {
    return [];
  }

  const allTools: MCPTool[] = [];
  const servers = mcpClientManager.getServers();

  for (const server of servers) {
    if (server.status === 'connected' && server.tools) {
      allTools.push(...server.tools);
    }
  }

  // Always expose base local tools; AgentConfig controls which can write
  allTools.push(...BASE_LOCAL_TOOLS);

  const applyPatchActive =
    !!options?.applyPatchEnabled &&
    options.applyPatchProvider === 'openai' &&
    options.applyPatchModel === 'gpt-5.1' &&
    mode === 'agent';

  if (applyPatchActive) {
    allTools.push(APPLY_PATCH_TOOL);
  }

  return allTools;
};

const callGemini = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mcpTools: MCPTool[] = [],
  mode: ChatMode,
  options?: AgentRuntimeOptions,
): Promise<LLMCallResult> => {
  const apiKey = getCloudApiKey(config);

  const basePrompt = buildPromptFromMessages(messages);
  const modePrompt = getModeSystemPrompt(mode);
  const agentRootPrompt = await getAgentRootPrompt();

  const promptSections: string[] = [];

  if (modePrompt) {
    promptSections.push(modePrompt);
  }

  if (agentRootPrompt) {
    promptSections.push(agentRootPrompt);
  }

  if (mcpTools.length > 0) {
    const toolDescription = [
      'Available tools:',
      ...mcpTools.map(
        (tool) =>
          `- ${tool.name}${tool.description ? `: ${tool.description}` : ''}`,
      ),
    ].join('\n');

    promptSections.push(toolDescription);
  }

  promptSections.push(basePrompt);

  const prompt = promptSections.join('\n\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model,
  )}:generateContent`;

  const requestBody: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const tools: any[] = [];

  if (mcpTools.length > 0) {
    tools.push(...convertMCPToolsToGemini(mcpTools));
  }

  if (options?.webSearchEnabled) {
    tools.push({ googleSearch: {} });
  }

  if (tools.length > 0) {
    requestBody.tools = tools;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Gemini error (${response.status})`);
  }

  const data: any = await response.json();

  const functionCallParts: any[] = [];

  if (Array.isArray(data?.candidates)) {
    for (const candidate of data.candidates) {
      const parts = candidate?.content?.parts;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (part?.functionCall) {
          functionCallParts.push(part.functionCall);
        }
      }
    }
  }

  if (functionCallParts.length > 0) {
    const toolCalls: ToolCall[] = [];

    for (const fnCall of functionCallParts) {
      const functionName = fnCall?.name;
      if (!functionName) {
        continue;
      }

      const rawArgs = fnCall.args ?? {};

      let functionArgs: any;
      if (typeof rawArgs === 'string') {
        try {
          functionArgs = JSON.parse(rawArgs);
        } catch {
          functionArgs = {};
        }
      } else {
        functionArgs = rawArgs || {};
      }

      toolCalls.push({
        id: fnCall.id || `tool-${Date.now()}`,
        name: functionName,
        arguments: functionArgs,
      });
    }

    if (toolCalls.length > 0) {
      return { toolCalls };
    }
  }

  const textParts: string[] =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => {
        if (!part) return '';
        if (typeof part.text === 'string') return part.text;
        return '';
      })
      .filter((t: string) => t.trim().length > 0) || [];

  const content = textParts.join(' ').trim();

  if (!content) {
    throw new Error('Gemini returned an empty response');
  }

  return { finalText: content };
};

const callAnthropic = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mode: ChatMode,
): Promise<LLMCallResult> => {
  const basePrompt = buildPromptFromMessages(messages);
  const modePrompt = getModeSystemPrompt(mode);
  const prompt = modePrompt ? `${modePrompt}\n\n${basePrompt}` : basePrompt;
  const apiKey = getCloudApiKey(config);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Anthropic error (${response.status})`);
  }

  const data: any = await response.json();
  const content =
    data?.content?.[0]?.text?.toString().trim() ||
    data?.content?.[0]?.content?.toString().trim() ||
    '';

  if (!content) {
    throw new Error('Anthropic returned an empty response');
  }

  return { finalText: content };
};

const convertMCPToolsToOllama = (mcpTools: MCPTool[]) => {
  return mcpTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema,
    },
  }));
};

const parseToolArguments = (rawArgs: unknown): Record<string, unknown> => {
  if (rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs as Record<string, unknown>;
  }

  if (typeof rawArgs === 'string') {
    try {
      const parsed = JSON.parse(rawArgs);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      if (parsed === null || parsed === undefined) {
        return {};
      }
      return { value: parsed };
    } catch (error) {
      console.warn('[LLM] Failed to parse tool arguments:', error);
      return {};
    }
  }

  return {};
};

const normalizeToolCallId = (toolCallId: unknown, fallback: string): string => {
  if (typeof toolCallId === 'string' && toolCallId.trim().length > 0) {
    return toolCallId;
  }
  return fallback;
};

const callOllamaOnce = async (
  messages: ChatMessage[],
  config: OllamaConfig,
  mcpTools: MCPTool[],
  mode: ChatMode,
): Promise<LLMCallResult> => {
  const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(
    /\/$/,
    '',
  );

  const modeSystemContent = getModeSystemPrompt(mode);
  const agentRootPrompt = await getAgentRootPrompt();

  const ollamaMessages = [
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.role === 'tool' && message.name ? { name: message.name } : {}),
      ...(message.role === 'tool' && message.toolCallId
        ? { tool_call_id: message.toolCallId }
        : {}),
    })),
  ];

  if (mcpTools.length > 0 || modeSystemContent || agentRootPrompt) {
    const toolPart =
      mcpTools.length > 0
        ? 
        'Available tools:\n' +
        mcpTools
          .map(
            (tool) =>
              `- ${tool.name}${tool.description ? `: ${tool.description}` : ''
              }`,
          )
          .join('\n')
        : '';

    const combinedContent = [modeSystemContent, agentRootPrompt, toolPart]
      .filter(Boolean)
      .join('\n\n');

    ollamaMessages.unshift({
      role: 'system',
      content: combinedContent,
    });
  }

  const requestBody: any = {
    model: config.model,
    messages: ollamaMessages,
    stream: false,
  };

  if (mcpTools.length > 0) {
    requestBody.tools = convertMCPToolsToOllama(mcpTools);
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Ollama error (${response.status})`);
  }

  const data: any = await response.json();
  const message = data?.message;

  if (!message) {
    throw new Error('Ollama returned no message');
  }

  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCalls: ToolCall[] = [];
    const fallbackBase = `ollama-tool-${Date.now()}`;

    for (const [index, toolCall] of message.tool_calls.entries()) {
      const functionName = toolCall.function?.name;
      if (!functionName) {
        continue;
      }
      const functionArgs = parseToolArguments(toolCall.function?.arguments);
      const toolCallId = normalizeToolCallId(
        toolCall.id,
        `${fallbackBase}-${index}`,
      );

      toolCalls.push({
        id: toolCallId,
        name: functionName,
        arguments: functionArgs,
      });
    }

    if (toolCalls.length > 0) {
      return { toolCalls };
    }
  }

  const content = message.content?.toString().trim() || '';

  if (!content) {
    throw new Error('Ollama returned an empty response');
  }

  return { finalText: content };
};

const getAgentConfigForMode = (
  mode: ChatMode,
  options?: AgentRuntimeOptions,
): AgentConfig => {
  if (mode === 'agent') {
    return {
      maxIterations: 8,
      maxToolCallsPerIteration: 8,
      allowTools: true,
      allowWrites: true,
      allowLocalTools: true,
    };
  }

  if (mode === 'plan') {
    const allowTools = !!options?.planApproved;
    return {
      maxIterations: 3,
      maxToolCallsPerIteration: 4,
      allowTools,
      allowWrites: false,
      allowLocalTools: allowTools,
    };
  }

  const allowTools = !!options?.allowAskTools;
  return {
    maxIterations: 3,
    maxToolCallsPerIteration: 4,
    allowTools,
    allowWrites: false,
    allowLocalTools: allowTools,
  };
};

const isLocalMutatingTool = (name: string): boolean => {
  return (
    name === 'create_file' ||
    name === 'replace_in_file' ||
    name === 'apply_patch'
  );
};

const executeToolCall = async (
  toolCall: ToolCall,
  agentConfig: AgentConfig,
): Promise<MCPToolCall | null> => {
  if (!agentConfig.allowTools) {
    return null;
  }

  const servers = mcpClientManager.getServers();
  let serverId: string | undefined;
  let serverName: string | undefined;

  for (const server of servers) {
    if (
      server.status === 'connected' &&
      server.tools?.some(t => t.name === toolCall.name)
    ) {
      serverId = server.id;
      serverName = server.name;
      break;
    }
  }

  let result: any;

  if (serverId && serverName) {
    result = await mcpClientManager.callTool(
      serverId,
      toolCall.name,
      toolCall.arguments,
    );
  } else if (
    agentConfig.allowLocalTools &&
    LOCAL_TOOLS.some(t => t.name === toolCall.name)
  ) {
    if (!agentConfig.allowWrites && isLocalMutatingTool(toolCall.name)) {
      result = {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool ${toolCall.name} is not allowed in this mode`,
          },
        ],
      };
    } else {
      try {
        result = await executeLocalTool(toolCall.name, toolCall.arguments);
        serverId = 'local';
        serverName = 'Local System';
      } catch (error) {
        result = {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          ],
        };
      }
    }
  } else {
    return null;
  }

  return {
    id: toolCall.id,
    toolName: toolCall.name,
    serverId: serverId || 'unknown',
    serverName: serverName || 'Unknown',
    arguments: toolCall.arguments,
    result,
    timestamp: new Date(),
  };
};

const runAgentLoop = async (
  initialHistory: ChatMessage[],
  mcpTools: MCPTool[],
  mode: ChatMode,
  callLLM: (history: ChatMessage[]) => Promise<LLMCallResult>,
  options?: AgentRuntimeOptions,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const agentConfig = getAgentConfigForMode(mode, options);
  const history: ChatMessage[] = [...initialHistory];
  const allToolCalls: MCPToolCall[] = [];
  let finalText: string | undefined;

  if (mode === 'plan' && !options?.planApproved) {
    const result = await callLLM(history);
    const planText = result.finalText?.trim();

    return {
      content:
        planText ||
        'No plan text was returned. Please ask again or refine the request.',
    };
  }

  for (let iteration = 0; iteration < agentConfig.maxIterations; iteration += 1) {
    const result = await callLLM(history);
    const toolCalls = result.toolCalls || [];

    if (!agentConfig.allowTools) {
      if (result.finalText) {
        finalText = result.finalText.trim();
        break;
      }

      if (toolCalls.length > 0) {
        finalText =
          'Tool use is disabled in the current mode. Please explicitly request tool usage if needed.';
        break;
      }
    }

    if (toolCalls.length > 0 && mcpTools.length > 0) {
      const limitedToolCalls = toolCalls.slice(
        0,
        agentConfig.maxToolCallsPerIteration,
      );
      const executedCalls: MCPToolCall[] = [];

      for (const toolCall of limitedToolCalls) {
        const executed = await executeToolCall(toolCall, agentConfig);
        if (executed) {
          executedCalls.push(executed);
        }
      }

      if (executedCalls.length > 0) {
        allToolCalls.push(...executedCalls);

        const toolMessages: ChatMessage[] = executedCalls.map((tc) => {
          const resultText =
            tc.result?.content?.[0]?.text || JSON.stringify(tc.result);
          return {
            id: `agent-tool-${tc.id}-${Date.now()}`,
            role: 'tool',
            name: tc.toolName,
            toolCallId: tc.id,
            content: resultText || 'Tool executed',
            timestamp: new Date(),
          };
        });

        history.push(...toolMessages);

        continue;
      }

      if (!result.finalText) {
        break;
      }
    }

    if (result.finalText) {
      finalText = result.finalText.trim();
      break;
    }

    break;
  }

  if (!finalText) {
    if (allToolCalls.length > 0) {
      const toolResultsText = allToolCalls
        .map(tc => {
          const resultText =
            tc.result?.content?.[0]?.text || JSON.stringify(tc.result);
          return `Tool ${tc.toolName} result: ${resultText}`;
        })
        .join('\n\n');

      finalText =
        toolResultsText ||
        'Tools executed but no final answer was generated within the configured limits.';
    } else {
      throw new Error('Model did not return a final answer');
    }
  }

  return {
    content: finalText,
    toolCalls: allToolCalls.length ? allToolCalls : undefined,
  };
};

export const callCloudLLM = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mode: ChatMode,
  options?: AgentRuntimeOptions,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const mcpTools = getAllMCPTools(mode, options);

  const callLLM = (history: ChatMessage[]): Promise<LLMCallResult> => {
    switch (config.provider) {
      case 'openai':
        return callOpenAIChat(history, config, mcpTools, mode, options);
      case 'gemini':
        return callGemini(history, config, mcpTools, mode, options);
      case 'anthropic':
        return callAnthropic(history, config, mode);
      default:
        throw new Error(`Unsupported cloud provider: ${config.provider}`);
    }
  };

  return runAgentLoop(messages, mcpTools, mode, callLLM, options);
};

export const callOllama = async (
  messages: ChatMessage[],
  config: OllamaConfig,
  mode: ChatMode,
  options?: AgentRuntimeOptions,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const mcpTools = getAllMCPTools(mode, options);

  const callLLM = (history: ChatMessage[]): Promise<LLMCallResult> =>
    callOllamaOnce(history, config, mcpTools, mode);

  return runAgentLoop(messages, mcpTools, mode, callLLM, options);
};
