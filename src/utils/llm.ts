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

  const openaiMessages = [
    ...(modeSystemMessage ? [modeSystemMessage] : []),
    ...(toolSystemMessage ? [toolSystemMessage] : []),
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const requestBody: any = {
    model: config.model,
    input: openaiMessages,
  };

  const tools: any[] = [];

  if (mcpTools.length > 0) {
    tools.push(...convertMCPToolsToOpenAI(mcpTools));
  }

  if (options?.webSearchEnabled) {
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
const LOCAL_TOOLS: MCPTool[] = [
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
    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
};

/**
 * Get all available MCP tools from connected servers
 */
const getAllMCPTools = (mode: ChatMode, _options?: AgentRuntimeOptions): MCPTool[] => {
  const allTools: MCPTool[] = [];
  const servers = mcpClientManager.getServers();

  for (const server of servers) {
    if (server.status === 'connected' && server.tools) {
      allTools.push(...server.tools);
    }
  }

  // Add local tools if in Agent mode
  if (mode === 'agent') {
    allTools.push(...LOCAL_TOOLS);
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

  const promptSections: string[] = [];

  if (modePrompt) {
    promptSections.push(modePrompt);
  }

  if (mcpTools.length > 0) {
    const toolDescription = [
      'You have access to external MCP tools for industrial protocols (MQTT, OPC UA, etc.).',
      'Use these tools whenever the user asks you to read, write, browse, or call methods on field devices, PLCs, or other industrial systems, instead of guessing.',
      'OPC UA NodeId reminder: numeric ids use the form ns=<namespace>;i=<integer> (for example, ns=2;i=2).',
      'String ids must use ns=<namespace>;s=<string> (for example, ns=2;s=TEMP_NODE_ID).',
      'Never put non-numeric values after i=.',
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

  const ollamaMessages = [...messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))];

  if (mcpTools.length > 0 || modeSystemContent) {
    const toolPart =
      mcpTools.length > 0
        ? 'You have access to external MCP tools for GraphDB and other systems. ' +
        'Use these tools when the user asks questions that require querying data, executing SPARQL queries, or interacting with knowledge graphs. ' +
        'Available tools:\n' +
        mcpTools
          .map(
            (tool) =>
              `- ${tool.name}${tool.description ? `: ${tool.description}` : ''
              }`,
          )
          .join('\n')
        : '';

    const combinedContent = [modeSystemContent, toolPart]
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

    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = toolCall.function.arguments;

      toolCalls.push({
        id: toolCall.id || `tool-${Date.now()}`,
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

const getAgentConfigForMode = (mode: ChatMode): AgentConfig => {
  if (mode === 'agent') {
    return {
      maxIterations: 8,
      maxToolCallsPerIteration: 8,
      allowWrites: true,
      allowLocalTools: true,
    };
  }

  if (mode === 'plan') {
    return {
      maxIterations: 3,
      maxToolCallsPerIteration: 4,
      allowWrites: false,
      allowLocalTools: false,
    };
  }

  return {
    maxIterations: 3,
    maxToolCallsPerIteration: 4,
    allowWrites: false,
    allowLocalTools: false,
  };
};

const isLocalMutatingTool = (name: string): boolean => {
  return name === 'create_file' || name === 'replace_in_file';
};

const executeToolCall = async (
  toolCall: ToolCall,
  agentConfig: AgentConfig,
): Promise<MCPToolCall | null> => {
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
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const agentConfig = getAgentConfigForMode(mode);
  const history: ChatMessage[] = [...initialHistory];
  const allToolCalls: MCPToolCall[] = [];
  let finalText: string | undefined;

  for (let iteration = 0; iteration < agentConfig.maxIterations; iteration += 1) {
    const result = await callLLM(history);
    const toolCalls = result.toolCalls || [];

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

        const toolResultsText = executedCalls
          .map(tc => {
            const resultText =
              tc.result?.content?.[0]?.text || JSON.stringify(tc.result);
            return `Tool ${tc.toolName} result: ${resultText}`;
          })
          .join('\n\n');

        history.push({
          id: `agent-tool-${Date.now()}-${iteration}`,
          role: 'assistant',
          content: toolResultsText || 'Tools executed',
          timestamp: new Date(),
        });

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

  return runAgentLoop(messages, mcpTools, mode, callLLM);
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

  return runAgentLoop(messages, mcpTools, mode, callLLM);
};
