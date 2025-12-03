import { ChatMessage, CloudLLMConfig, OllamaConfig } from '../types';
import { MCPTool, MCPToolCall } from '../types/mcp-types';
import { mcpClientManager } from './mcp-client';
import type { ChatMode } from '../types/ide-types';

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
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema,
    },
  }));
};

/**
 * Call OpenAI with support for MCP tools
 */
const callOpenAIChat = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mcpTools: MCPTool[] = [],
  mode: ChatMode,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
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
            'You have access to external MCP tools for industrial protocols (MQTT, OPC UA, etc.). ' +
            'Use these tools whenever the user asks you to read, write, browse, or call methods on field devices, PLCs, or other industrial systems, ' +
            'instead of guessing.\n\n' +
            'OPC UA NodeId reminder: numeric ids use the form ns=<namespace>;i=<integer> (for example, ns=2;i=2). ' +
            'String ids must use ns=<namespace>;s=<string> (for example, ns=2;s=TEMP_NODE_ID). ' +
            'Never put non-numeric values after i=.\n\n' +
            'Available tools:\n' +
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
    messages: openaiMessages,
  };

  // Add tools if available
  if (mcpTools.length > 0) {
    requestBody.tools = convertMCPToolsToOpenAI(mcpTools);
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
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
  const choice = data?.choices?.[0];

  if (!choice) {
    throw new Error('OpenAI returned no choices');
  }

  // Check if the model wants to call tools
  if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCalls: MCPToolCall[] = [];

    // Execute each tool call
    for (const toolCall of choice.message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Find which MCP server has this tool
      const servers = mcpClientManager.getServers();
      let serverId: string | undefined;
      let serverName: string | undefined;

      for (const server of servers) {
        if (server.tools?.some(t => t.name === functionName)) {
          serverId = server.id;
          serverName = server.name;
          break;
        }
      }

      if (!serverId || !serverName) {
        console.error(`Tool ${functionName} not found in any connected MCP server`);
        continue;
      }

      // Execute the tool
      const result = await mcpClientManager.callTool(serverId, functionName, functionArgs);

      toolCalls.push({
        id: toolCall.id,
        toolName: functionName,
        serverId,
        serverName,
        arguments: functionArgs,
        result,
        timestamp: new Date(),
      });
    }

    // Format tool results as text for the response
    const toolResultsText = toolCalls
      .map(tc => {
        const resultText = tc.result?.content?.[0]?.text || JSON.stringify(tc.result);
        return `Tool ${tc.toolName} result: ${resultText}`;
      })
      .join('\n\n');

    return {
      content: toolResultsText || 'Tools executed successfully',
      toolCalls,
    };
  }

  // No tool calls, return regular response
  const content = choice.message?.content?.toString().trim() || '';

  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }

  return { content };
};


/**
 * Get all available MCP tools from connected servers
 */
const getAllMCPTools = (): MCPTool[] => {
  const allTools: MCPTool[] = [];
  const servers = mcpClientManager.getServers();

  for (const server of servers) {
    if (server.status === 'connected' && server.tools) {
      allTools.push(...server.tools);
    }
  }

  return allTools;
};

const callGemini = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mode: ChatMode,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const basePrompt = buildPromptFromMessages(messages);
  const modePrompt = getModeSystemPrompt(mode);
  const prompt = modePrompt ? `${modePrompt}\n\n${basePrompt}` : basePrompt;
  const apiKey = getCloudApiKey(config);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Gemini error (${response.status})`);
  }

  const data: any = await response.json();
  const parts: string[] =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      .filter(Boolean) || [];
  const content = parts.join(' ').trim();

  if (!content) {
    throw new Error('Gemini returned an empty response');
  }

  return { content };
};

const callAnthropic = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mode: ChatMode,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
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

  return { content };
};

export const callCloudLLM = async (
  messages: ChatMessage[],
  config: CloudLLMConfig,
  mode: ChatMode,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  // Get available MCP tools
  const mcpTools = getAllMCPTools();

  switch (config.provider) {
    case 'openai':
      return callOpenAIChat(messages, config, mcpTools, mode);
    case 'gemini':
      return callGemini(messages, config, mode);
    case 'anthropic':
      return callAnthropic(messages, config, mode);
    default:
      throw new Error(`Unsupported cloud provider: ${config.provider}`);
  }
};

/**
 * Convert MCP tools to Ollama tool format
 */
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

export const callOllama = async (
  messages: ChatMessage[],
  config: OllamaConfig,
  mode: ChatMode,
): Promise<{ content: string; toolCalls?: MCPToolCall[] }> => {
  const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(
    /\/$/,
    '',
  );

  // Get available MCP tools
  const mcpTools = getAllMCPTools();

  const modeSystemContent = getModeSystemPrompt(mode);

  // Add system message about tools if available
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
                `- ${tool.name}${
                  tool.description ? `: ${tool.description}` : ''
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

  // Add tools if available (Ollama supports tools in recent versions)
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

  // Check if the model wants to call tools
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCalls: MCPToolCall[] = [];

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = toolCall.function.arguments;

      // Find which MCP server has this tool
      const servers = mcpClientManager.getServers();
      let serverId: string | undefined;
      let serverName: string | undefined;

      for (const server of servers) {
        if (server.tools?.some(t => t.name === functionName)) {
          serverId = server.id;
          serverName = server.name;
          break;
        }
      }

      if (!serverId || !serverName) {
        console.error(`Tool ${functionName} not found in any connected MCP server`);
        continue;
      }

      // Execute the tool
      const result = await mcpClientManager.callTool(serverId, functionName, functionArgs);

      toolCalls.push({
        id: toolCall.id || `tool-${Date.now()}`,
        toolName: functionName,
        serverId,
        serverName,
        arguments: functionArgs,
        result,
        timestamp: new Date(),
      });
    }

    // Format tool results as text for the response
    const toolResultsText = toolCalls
      .map(tc => {
        const resultText = tc.result?.content?.[0]?.text || JSON.stringify(tc.result);
        return `Tool ${tc.toolName} result: ${resultText}`;
      })
      .join('\n\n');

    return {
      content: toolResultsText || 'Tools executed successfully',
      toolCalls,
    };
  }

  // No tool calls, return regular response
  const content = message.content?.toString().trim() || '';

  if (!content) {
    throw new Error('Ollama returned an empty response');
  }

  return { content };
};
