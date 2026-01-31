export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modified?: Date;
    children?: FileNode[];
}

export interface FileSearchResult {
    path: string;
    name: string;
    matches: number;
}

export interface EditorTab {
    id: string;
    path: string;
    name: string;
    content: string;
    modified: boolean;
    language?: string;
    // When using the browser File System Access API, we keep the native file handle here.
    fileHandle?: any;
}

export type ChatMode = 'ask' | 'plan' | 'agent';

export interface AgentAction {
    id: string;
    type: 'read_file' | 'write_file' | 'list_directory' | 'search_files' | 'call_mcp_tool';
    description: string;
    input: any;
    output?: any;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp: Date;
}

export interface AgentTask {
    id: string;
    goal: string;
    plan: string[];
    currentStep: number;
    actions: AgentAction[];
    status: 'planning' | 'executing' | 'completed' | 'failed';
    result?: string;
}

export interface AgentConfig {
    maxIterations: number;
    maxToolCallsPerIteration: number;
    allowTools: boolean;
    allowWrites: boolean;
    allowLocalTools: boolean;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface LLMCallResult {
    finalText?: string;
    toolCalls?: ToolCall[];
}

export interface AgentRuntimeOptions {
    webSearchEnabled?: boolean;
    applyPatchEnabled?: boolean;
    applyPatchProvider?: string;
    applyPatchModel?: string;
    allowAskTools?: boolean;
    planApproved?: boolean;
}

export interface AgentStep {
    index: number;
    inputMessages: import('../types').ChatMessage[];
    outputText?: string;
    toolCalls?: import('./mcp-types').MCPToolCall[];
}

export interface AgentRun {
    id: string;
    goal: string;
    mode: ChatMode;
    steps: AgentStep[];
    status: 'running' | 'completed' | 'failed';
    resultText?: string;
}

export interface CodeAssistRequest {
    type: 'generate' | 'fix' | 'refactor' | 'explain';
    code?: string;
    language?: string;
    prompt: string;
    context?: string;
}

export interface CodeAssistResponse {
    success: boolean;
    result: string;
    code?: string;
    explanation?: string;
}
