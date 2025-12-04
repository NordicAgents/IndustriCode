import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  ArrowUp,
  Loader2,
  User,
  Sparkle,
  Copy,
  CheckCheck,
  Sparkles,
  Zap,
  Moon,
  Sun,
  X,
  Upload,
  File,
  FileCode,
  FileJson,
  FileText,
} from 'lucide-react';
import {
  ChatMessage,
  ChatBackend,
  CloudLLMConfig,
  OllamaConfig,
} from '../types';
import { FileSystemAPI, FileNode } from '../utils/file-api';
import type { ChatMode } from '../types/ide-types';
import { format } from 'date-fns';
import { useTheme } from './ThemeProvider';
import type React from 'react';

export interface ChatPanelHandle {
  appendToInput: (text: string) => void;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  chatBackend: ChatBackend;
  onChatBackendChange: (backend: ChatBackend) => void;
  cloudLLMConfig: CloudLLMConfig | null;
  onCloudLLMConfigChange: (config: CloudLLMConfig | null) => void;
  ollamaConfig: OllamaConfig | null;
  onOllamaConfigChange: (config: OllamaConfig | null) => void;
  onApplyCodeToFile?: (code: string, path?: string) => void;
  onFileSelect?: (node: FileNode) => void;
}

function ChatPanelInner(
  {
    messages,
    onSendMessage,
    isLoading = false,
    mode,
    onModeChange,
    chatBackend,
    onChatBackendChange,
    cloudLLMConfig,
    onCloudLLMConfigChange,
    ollamaConfig,
    onOllamaConfigChange,
    onApplyCodeToFile,
    onFileSelect,
  }: ChatPanelProps,
  ref: React.Ref<ChatPanelHandle>,
) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    name: string;
    path?: string;
    size: number;
    content: string;
  }>>([]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'json') return FileJson;
    if (['st', 'scl', 'il', 'ld', 'fbd', 'js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'java', 'c', 'cpp', 'h', 'rs', 'go'].includes(ext || '')) return FileCode;
    if (['txt', 'md', 'csv', 'log'].includes(ext || '')) return FileText;
    return File;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeCloudProvider = cloudLLMConfig?.provider || 'openai';
  const envCloudApiKey =
    activeCloudProvider === 'openai'
      ? (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)
      : activeCloudProvider === 'gemini'
        ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
        : (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined);
  const isCloudConfigured = Boolean(
    cloudLLMConfig?.model && (cloudLLMConfig?.apiKey || envCloudApiKey),
  );
  const isOllamaConfigured = Boolean(
    (ollamaConfig?.baseUrl || 'http://localhost:11434') && ollamaConfig?.model,
  );

  const canSend =
    chatBackend === 'cloud-llm' ? isCloudConfigured : isOllamaConfigured;

  const effectiveOllamaBaseUrl =
    ollamaConfig?.baseUrl || 'http://localhost:11434';
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchOllamaModels = async (baseUrl: string) => {
    setIsLoadingOllamaModels(true);
    setOllamaError(null);

    try {
      const url = baseUrl.replace(/\/$/, '') + '/api/tags';
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }
      const data: any = await response.json();
      const models: string[] =
        Array.isArray(data?.models) && data.models.length > 0
          ? data.models
            .map((model: any) => model?.name)
            .filter((name: unknown): name is string => typeof name === 'string')
          : [];

      setOllamaModels(models);

      if (models.length > 0) {
        const currentModel = ollamaConfig?.model || models[0];
        onOllamaConfigChange({
          baseUrl,
          model: currentModel,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load models from Ollama';
      setOllamaError(
        `Could not load models from Ollama at ${baseUrl}: ${message}`,
      );
      setOllamaModels([]);
    } finally {
      setIsLoadingOllamaModels(false);
    }
  };

  useEffect(() => {
    if (chatBackend !== 'ollama') return;
    fetchOllamaModels(effectiveOllamaBaseUrl);
    // We only want to refetch when backend or base URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatBackend, effectiveOllamaBaseUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || !canSend) return;

    const fileText = buildFileAttachmentText();
    const finalMessage = input.trim() + fileText;

    onSendMessage(finalMessage);
    setInput('');
    setAttachedFiles([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  useImperativeHandle(
    ref,
    () => ({
      appendToInput: (text: string) => {
        if (!text) return;

        setInput((prev) => {
          const hasExisting = prev.trim().length > 0;
          const prefix = hasExisting ? '\n\n' : '';
          return `${prev}${prefix}${text}`;
        });

        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          }
        });
      },
    }),
    [],
  );

  const handleFilesDropped = async (
    event: React.DragEvent<HTMLFormElement | HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    // Check if this is a FileNode drop from FileExplorer
    const fileNodeData = event.dataTransfer.getData('application/file-node');
    if (fileNodeData) {
      try {
        const fileNode = JSON.parse(fileNodeData);

        // Only handle file types, not directories
        if (fileNode.type === 'file') {
          try {
            let content: string;
            const draggedHandle = (window as any).__draggedFileHandle;

            // Check if we have a matching handle from the drag source
            if (draggedHandle && draggedHandle.name === fileNode.name) {
              const file = await draggedHandle.getFile();
              content = await file.text();
              // Clear the handle
              (window as any).__draggedFileHandle = null;
            } else {
              // Fallback to backend API
              content = await FileSystemAPI.readFile(fileNode.path);
            }

            setAttachedFiles((prev) => [...prev, {
              name: fileNode.name,
              path: fileNode.path,
              size: content.length,
              content,
            }]);

            // Auto-open the file so "Apply" works on the correct file
            if (onFileSelect) {
              onFileSelect(fileNode);
            }
          } catch (error) {
            console.error('Failed to read file from explorer:', error);
          }
        }
      } catch (error) {
        console.error('Failed to parse FileNode data:', error);
      }
      return;
    }

    // Handle OS file drops
    if (!event.dataTransfer || !event.dataTransfer.files?.length) {
      return;
    }

    const files = Array.from(event.dataTransfer.files).filter(
      (file) => file && file.size > 0,
    );
    if (files.length === 0) return;

    const newAttachedFiles: Array<{ name: string; size: number; content: string }> = [];

    for (const file of files) {
      try {
        const content = await file.text();
        newAttachedFiles.push({
          name: file.name,
          size: file.size,
          content,
        });
      } catch (error) {
        console.error('Failed to read dropped file:', error);
      }
    }

    if (newAttachedFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newAttachedFiles]);
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLFormElement | HTMLDivElement>,
  ) => {
    if (
      !event.dataTransfer ||
      (!Array.from(event.dataTransfer.types).includes('Files') &&
        !Array.from(event.dataTransfer.types).includes('application/file-node'))
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    // Only set isDragOver to false if we're leaving the main container
    const relatedTarget = event.relatedTarget as Node;
    const currentTarget = event.currentTarget as Node;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const buildFileAttachmentText = (): string => {
    if (attachedFiles.length === 0) return '';

    const MAX_FILE_CHARS = 50000;
    let fileText = attachedFiles.length > 0
      ? '\n\nPlease analyze the following file(s):\n'
      : '';

    for (const file of attachedFiles) {
      const truncated =
        file.content.length > MAX_FILE_CHARS
          ? `${file.content.slice(
            0,
            MAX_FILE_CHARS,
          )}\n\n[...truncated: file is large, only the first ${MAX_FILE_CHARS.toLocaleString()} characters are included...]`
          : file.content;

      const extension =
        file.name.includes('.') && file.name.split('.').pop()
          ? file.name.split('.').pop()!.toLowerCase()
          : '';
      const langHint =
        extension && /^[a-z0-9]+$/i.test(extension) ? extension : '';

      const pathInfo = file.path ? ` (Path: ${file.path})` : '';
      fileText += `\n---\nFile: ${file.name}${pathInfo}\n\n\`\`\`${langHint}\n${truncated}\n\`\`\`\n`;
    }

    return fileText;
  };

  const handleApplyCodeToFileFromMessage = (message: ChatMessage) => {
    if (!onApplyCodeToFile) return;

    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = Array.from(message.content.matchAll(codeBlockRegex));
    const lastMatch = matches[matches.length - 1];

    if (!lastMatch) {
      alert('No code block found in this message to apply.');
      return;
    }

    let block = lastMatch[0];
    block = block.replace(/^```[^\n]*\n/, '');
    block = block.replace(/```$/, '');

    // Check for filename comment in the first line
    const firstLine = block.split('\n')[0].trim();
    let targetPath: string | undefined;

    // Support formats: // filename.ext, // path/to/file.ext, /* filename.ext */
    const filenameMatch = firstLine.match(/^\/\/\s*(.+)$/) || firstLine.match(/^\/\*\s*(.+?)\s*\*\/$/);

    if (filenameMatch) {
      const potentialPath = filenameMatch[1].trim();
      // Basic validation to check if it looks like a file path
      if (/^[\w\-. /]+\.[\w]+$/.test(potentialPath)) {
        targetPath = potentialPath;
      }
    }

    onApplyCodeToFile(block, targetPath);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const CLOUD_MODEL_OPTIONS: Record<
    CloudLLMConfig['provider'],
    string[]
  > = {
    openai: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'],
    gemini: [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3-pro-preview',
    ],
    anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  };

  const examplePrompts = [
    'Explain this piece of code',
    'Summarize the key points from a document',
    'Help me debug a configuration issue',
    'Suggest test cases for this feature',
  ];

  const inputPlaceholder =
    chatBackend === 'cloud-llm'
      ? isCloudConfigured
        ? 'Ask the cloud model anything... (Enter to send, Shift+Enter for new line)'
        : envCloudApiKey
          ? 'Select provider and model above to start chatting...'
          : 'Select provider, model and API key above to start chatting...'
      : 'Ask the local Ollama model anything... (Enter to send, Shift+Enter for new line)';

  return (
    <div
      className="flex-1 flex flex-col h-full bg-gradient-to-b from-background to-background relative"
      onDrop={handleFilesDropped}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Drop files here</h3>
            <p className="text-sm text-muted-foreground">
              Files will be attached to your message
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-border px-6 py-3.5 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="icon-md text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Chat
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {mode === 'ask' &&
                  'Ask mode · Read-only exploration for learning and questions.'}
                {mode === 'plan' &&
                  'Plan mode · Propose a multi-step plan before making changes.'}
                {mode === 'agent' &&
                  'Agent mode · Autonomously run tools and fix errors.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-icon"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="icon-md" /> : <Moon className="icon-md" />}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) =>
                onModeChange(e.target.value as ChatMode)
              }
              className="px-2 py-1 border border-border rounded-md bg-background hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ask">Ask</option>
              <option value="plan">Plan</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={chatBackend}
              onChange={(e) =>
                onChatBackendChange(e.target.value as ChatBackend)
              }
              className="px-2 py-1 border border-border rounded-md bg-background hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="cloud-llm">Cloud</option>
              <option value="ollama">Local</option>
            </select>
          </div>

          {chatBackend === 'cloud-llm' && (
            <>
              {(() => {
                const provider = cloudLLMConfig?.provider || 'openai';
                const modelOptions = CLOUD_MODEL_OPTIONS[provider] || [];
                const currentModel =
                  cloudLLMConfig?.model || modelOptions[0] || '';
                return (
                  <>
                    <select
                      value={provider}
                      onChange={(e) => {
                        const newProvider =
                          e.target.value as CloudLLMConfig['provider'];
                        const options =
                          CLOUD_MODEL_OPTIONS[newProvider] || [];
                        onCloudLLMConfigChange({
                          provider: newProvider,
                          apiKey: cloudLLMConfig?.apiKey || '',
                          model: options[0] || '',
                          baseUrl: cloudLLMConfig?.baseUrl,
                        });
                      }}
                      className="px-2 py-1 border border-border rounded-md bg-background hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                    <select
                      value={currentModel}
                      onChange={(e) =>
                        onCloudLLMConfigChange({
                          provider,
                          apiKey: cloudLLMConfig?.apiKey || '',
                          model: e.target.value,
                          baseUrl: cloudLLMConfig?.baseUrl,
                        })
                      }
                      className="px-2 py-1 border border-border rounded-md bg-background hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring text-xs min-w-[180px]"
                    >
                      {modelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </>
                );
              })()}
              {!envCloudApiKey && (
                <input
                  type="text"
                  value={cloudLLMConfig?.apiKey || ''}
                  onChange={(e) =>
                    onCloudLLMConfigChange({
                      provider: cloudLLMConfig?.provider || 'openai',
                      apiKey: e.target.value,
                      model: cloudLLMConfig?.model || '',
                      baseUrl: cloudLLMConfig?.baseUrl,
                    })
                  }
                  placeholder="API key"
                  className="px-2 py-1 border border-border rounded-md bg-input focus:outline-none focus:ring-1 focus:ring-ring text-xs min-w-[180px]"
                />
              )}
            </>
          )}

          {chatBackend === 'ollama' && (
            <>
              <input
                type="text"
                value={effectiveOllamaBaseUrl}
                onChange={(e) =>
                  onOllamaConfigChange({
                    baseUrl: e.target.value,
                    model: ollamaConfig?.model || '',
                  })
                }
                placeholder="Ollama URL (e.g., http://localhost:11434)"
                className="px-2 py-1 border border-border rounded-md bg-input focus:outline-none focus:ring-1 focus:ring-ring text-xs min-w-[200px]"
              />
              <select
                value={ollamaConfig?.model || ''}
                onChange={(e) =>
                  onOllamaConfigChange({
                    baseUrl: effectiveOllamaBaseUrl,
                    model: e.target.value,
                  })
                }
                className="px-2 py-1 border border-border rounded-md bg-background hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring text-xs min-w-[160px]"
              >
                <option value="">
                  {isLoadingOllamaModels
                    ? 'Loading models...'
                    : 'Select Ollama model'}
                </option>
                {ollamaModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchOllamaModels(effectiveOllamaBaseUrl)}
                className="btn btn-xs btn-outline"
              >
                Refresh models
              </button>
            </>
          )}

          {ollamaError && chatBackend === 'ollama' && (
            <span className="text-[11px] text-destructive">
              {ollamaError}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="icon-xl text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Ask questions, brainstorm ideas, or get help from cloud and local language models.
              </p>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Try these examples:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleExamplePrompt(prompt)}
                      className="btn btn-outline text-left px-4 py-3 text-sm hover:border-primary/50 group flex items-start gap-2"
                    >
                      <Zap className="icon-md text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isSystem = message.role === 'system';
              const showAvatar = index === 0 || messages[index - 1]?.role !== message.role;

              return (
                <div
                  key={message.id}
                  className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {showAvatar && (
                    <div className={`flex-shrink-0 ${isUser ? 'order-2' : 'order-1'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUser
                        ? 'bg-primary text-primary-foreground'
                        : isSystem
                          ? 'bg-muted/50 text-muted-foreground'
                          : 'bg-accent text-accent-foreground border border-border'
                        }`}>
                        {isUser ? <User className="icon-lg" /> : <Sparkle className="icon-md" />}
                      </div>
                    </div>
                  )}
                  {!showAvatar && <div className="w-8 flex-shrink-0" />}

                  {/* Message Bubble */}
                  <div className={`flex-1 group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
                    <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
                      <div className="relative">
                        <div
                          className={`rounded-2xl px-4 py-3 ${isUser
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : isSystem
                              ? 'bg-muted/30 text-muted-foreground text-sm border border-border/50'
                              : message.error
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-accent/50 border border-border/50 shadow-sm'
                            }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                            {message.content}
                          </div>

                          {/* Tool Calls Display */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.toolCalls.map((toolCall, idx) => (
                                <div
                                  key={toolCall.id || idx}
                                  className="text-xs bg-primary/5 border border-primary/20 rounded-lg p-2"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Zap className="icon-xs text-primary" />
                                    <span className="font-medium text-primary">
                                      {toolCall.toolName}
                                    </span>
                                    <span className="text-muted-foreground">
                                      on {toolCall.serverName}
                                    </span>
                                  </div>
                                  {Object.keys(toolCall.arguments).length > 0 && (
                                    <div className="text-muted-foreground font-mono text-[11px] mt-1">
                                      Args: {JSON.stringify(toolCall.arguments)}
                                    </div>
                                  )}
                                  {toolCall.result && (
                                    <div className="mt-1.5 pt-1.5 border-t border-primary/10">
                                      <div className="text-muted-foreground">
                                        {toolCall.result.content?.[0]?.text ||
                                          (toolCall.result.success ? 'Success' : 'Failed')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Timestamp and Actions */}
                          <div className={`flex items-center gap-2 mt-2 ${isUser ? 'justify-end' : 'justify-between'
                            }`}>
                            <span className={`text-xs ${isUser ? 'opacity-70' : 'opacity-50'
                              }`}>
                              {format(message.timestamp, 'HH:mm')}
                            </span>

                            {!isUser && !isSystem && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onApplyCodeToFile && (
                                  <button
                                    onClick={() => handleApplyCodeToFileFromMessage(message)}
                                    className="btn-icon-sm"
                                    title="Apply last code block to active file"
                                  >
                                    <Sparkle className="icon-xs" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCopy(message.content, message.id)}
                                  className="btn-icon-sm"
                                  title="Copy message"
                                >
                                  {copiedId === message.id ? (
                                    <CheckCheck className="icon-xs text-success" />
                                  ) : (
                                    <Copy className="icon-xs" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground border border-border flex items-center justify-center flex-shrink-0">
                  <Sparkle className="icon-md" />
                </div>
                <div className="bg-accent/50 border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="border-t border-border px-6 py-4 bg-background/80 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className={`relative w-full border rounded-xl bg-input transition-all shadow-sm flex flex-col ${isDragOver
              ? 'border-dashed border-primary bg-primary/5'
              : 'border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent'
              }`}>

              {/* File Attachments (Inline) */}
              {attachedFiles.length > 0 && (
                <div className="px-3 pt-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.name);
                    return (
                      <div
                        key={index}
                        className="group flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary hover:bg-primary/20 transition-colors cursor-default"
                      >
                        <FileIcon className="icon-xs flex-shrink-0" />
                        <span className="font-medium truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors"
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                disabled={isLoading || !canSend}
                className="w-full min-h-[56px] max-h-[200px] px-4 py-3 bg-transparent border-none resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                rows={1}
              />

              <div className="flex justify-between items-center px-2 pb-2">
                <div className="flex-1"></div>
                <button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || !canSend}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                  title="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="icon-md animate-spin" />
                  ) : (
                    <ArrowUp className="icon-md" />
                  )}
                </button>
              </div>
            </div>

            {chatBackend === 'cloud-llm' && !isCloudConfigured && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {envCloudApiKey
                  ? 'Set the provider and model above to begin chatting with a cloud LLM.'
                  : 'Set the provider, model, and API key above to begin chatting with a cloud LLM.'}
              </p>
            )}
            {chatBackend === 'ollama' && !isOllamaConfigured && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Make sure Ollama is running locally and select a model above to begin.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(ChatPanelInner);

export default ChatPanel;
