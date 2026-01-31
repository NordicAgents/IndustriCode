import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import IDELayout from './components/IDELayout';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import ChatPanel, { ChatPanelHandle } from './components/ChatPanel';
import MCPServerConfigPanel from './components/MCPServerConfig';
import Sidebar from './components/Sidebar';
import ActivityBar, { ActivityView } from './components/ActivityBar';
import {
  ChatMessage,
  ChatSession,
  ChatBackend,
  CloudLLMConfig,
  OllamaConfig,
} from './types';
import { EditorTab } from './types/ide-types';
import type { ChatMode } from './types/ide-types';
import { MCPServer, MCPServersConfig } from './types/mcp-types';
import { FileNode, FileSystemAPI } from './utils/file-api';
import { PlcopenProject } from './types/plcopen-types';
import { parsePlcopenProject } from './utils/plcopen-parser';
import { serializePlcopenProject } from './utils/plcopen-export';
import {
  loadSessions,
  saveSessions,
  loadChatBackend,
  saveChatBackend,
  loadCloudLLMConfig,
  saveCloudLLMConfig,
  loadOllamaConfig,
  saveOllamaConfig,
  loadWebSearchEnabled,
  saveWebSearchEnabled,
  loadApplyPatchEnabled,
  saveApplyPatchEnabled,
} from './utils/storage';
import {
  loadMCPServersConfig,
  saveMCPServersConfig,
  configToServers,
} from './utils/mcp-storage';
import { mcpClientManager } from './utils/mcp-client';
import { getTheme, setTheme as setAppTheme } from './utils/theme';
import { format } from 'date-fns';
import { callCloudLLM, callOllama } from './utils/llm';

function AppContent() {
  // Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatBackend, setChatBackend] = useState<ChatBackend>('cloud-llm');
  const [cloudLLMConfig, setCloudLLMConfig] = useState<CloudLLMConfig | null>(null);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ask');
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [applyPatchEnabled, setApplyPatchEnabled] = useState<boolean>(false);

  // MCP state
  const [mcpConfig, setMcpConfig] = useState<MCPServersConfig>({ mcpServers: {} });
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [showMCPConfig, setShowMCPConfig] = useState(false);

  // IDE state
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [fileSystemVersion, setFileSystemVersion] = useState(0);
  const [plcopenProjects, setPlcopenProjects] = useState<Record<string, PlcopenProject>>({});
  const chatPanelRef = useRef<ChatPanelHandle | null>(null);
  const [activeActivityView, setActiveActivityView] = useState<ActivityView>('explorer');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedSessions = loadSessions();
    const loadedChatBackend = loadChatBackend();
    const loadedCloudConfig = loadCloudLLMConfig();
    const loadedOllamaConfig = loadOllamaConfig();
    const loadedMCPConfig = loadMCPServersConfig();
    const loadedWebSearchEnabled = loadWebSearchEnabled();
    const loadedApplyPatchEnabled = loadApplyPatchEnabled();

    setSessions(loadedSessions);
    setChatBackend(loadedChatBackend);
    setWebSearchEnabled(loadedWebSearchEnabled);
    setApplyPatchEnabled(loadedApplyPatchEnabled);
    if (loadedCloudConfig) {
      setCloudLLMConfig(loadedCloudConfig);
    }
    if (loadedOllamaConfig) {
      setOllamaConfig(loadedOllamaConfig);
    }

    // Load MCP configuration
    setMcpConfig(loadedMCPConfig);
    const servers = configToServers(loadedMCPConfig);
    servers.forEach((server) => {
      mcpClientManager.addServer(server);
    });
    setMcpServers(servers);

    // Initialize theme
    const currentTheme = getTheme();
    setAppTheme(currentTheme);
    setTheme(currentTheme);

    // Listen for MCP connection changes
    const unsubscribe = mcpClientManager.onConnectionChange((updatedServers) => {
      setMcpServers(updatedServers);
    });

    return () => unsubscribe();
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  useEffect(() => {
    saveChatBackend(chatBackend);
  }, [chatBackend]);

  useEffect(() => {
    saveCloudLLMConfig(cloudLLMConfig);
  }, [cloudLLMConfig]);

  useEffect(() => {
    saveOllamaConfig(ollamaConfig);
  }, [ollamaConfig]);

  useEffect(() => {
    saveWebSearchEnabled(webSearchEnabled);
  }, [webSearchEnabled]);

  useEffect(() => {
    saveApplyPatchEnabled(applyPatchEnabled);
  }, [applyPatchEnabled]);

  // File operations
  const handleFileSelect = async (node: FileNode) => {
    if (node.type === 'file') {
      // Check if file is already open
      const existing = editorTabs.find((tab) => tab.path === node.path);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      try {
        let content: string;

        // If this node came from the browser File System Access API, it will have a handle
        if (node.handle) {
          const fileHandle: any = node.handle;
          const file = await fileHandle.getFile();
          content = await file.text();
        } else {
          // Fallback: use backend HTTP API
          content = await FileSystemAPI.readFile(node.path);
        }

        const language = FileSystemAPI.getFileLanguage(node.name);

        const newTab: EditorTab = {
          id: `tab-${Date.now()}`,
          path: node.path,
          name: node.name,
          content,
          modified: false,
          language,
          fileHandle: node.handle,
        };

        setEditorTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);

        if (node.name.toLowerCase().endsWith('.xml')) {
          const parsed = parsePlcopenProject(content);
          if (parsed) {
            setPlcopenProjects((prev) => ({ ...prev, [newTab.id]: parsed }));
          }
        }
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string) => {
    const tab = editorTabs.find((t) => t.id === tabId);
    if (tab?.modified) {
      const confirm = window.confirm(`File "${tab.name}" has unsaved changes. Close anyway?`);
      if (!confirm) return;
    }

    setEditorTabs((prev) => prev.filter((t) => t.id !== tabId));
    setPlcopenProjects((prev) => {
      if (!prev[tabId]) return prev;
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    if (activeTabId === tabId) {
      const remaining = editorTabs.filter((t) => t.id !== tabId);
      setActiveTabId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleContentChange = (tabId: string, content: string) => {
    setEditorTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, content, modified: true } : tab
      )
    );
  };

  const handlePlcopenParsed = (tabId: string, project: PlcopenProject | null) => {
    setPlcopenProjects((prev) => {
      if (!project) {
        if (!prev[tabId]) return prev;
        const next = { ...prev };
        delete next[tabId];
        return next;
      }
      return { ...prev, [tabId]: project };
    });
  };

  const handleImportPlcopen = async (file: File) => {
    try {
      const content = await file.text();
      const parsed = parsePlcopenProject(content);
      const tabId = `plcopen-${Date.now()}`;

      const newTab: EditorTab = {
        id: tabId,
        path: `plcopen-import/${file.name}`,
        name: file.name,
        content,
        modified: false,
        language: 'xml',
      };

      setEditorTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);

      if (parsed) {
        setPlcopenProjects((prev) => ({ ...prev, [tabId]: parsed }));
      }
    } catch (error) {
      console.error('Failed to import PLCopen XML:', error);
      alert(
        `Failed to import PLCopen XML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleSave = async (tabId: string) => {
    const tab = editorTabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      if (tab.fileHandle) {
        // Save via browser File System Access API
        const fileHandle: any = tab.fileHandle;
        const writable = await fileHandle.createWritable();
        await writable.write(tab.content);
        await writable.close();
      } else {
        // Fallback: save via backend HTTP API
        await FileSystemAPI.writeFile(tab.path, tab.content);
      }
      setEditorTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, modified: false } : t))
      );
      // Trigger explorer refresh
      setFileSystemVersion(v => v + 1);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportPlcopen = async (tabId: string, target: string) => {
    const tab = editorTabs.find((t) => t.id === tabId);
    if (!tab) return;

    const project = plcopenProjects[tabId] || parsePlcopenProject(tab.content);
    if (!project) {
      alert('Unable to export: the current PLCopen XML could not be parsed.');
      return;
    }

    if (target !== 'plcopen-xml') {
      alert(`Export target "${target}" is not supported yet.`);
      return;
    }

    const xml = serializePlcopenProject(project);
    const baseName = tab.name.replace(/\.[^.]+$/, '') || 'plcopen-project';
    const suggestedFileName = `${baseName}-export.xml`;
    const suggestedPath = tab.path.includes('/')
      ? tab.path.replace(tab.name, suggestedFileName)
      : suggestedFileName;

    const targetPath = window.prompt('Export PLCopen XML to path:', suggestedPath);
    if (!targetPath) return;

    try {
      await FileSystemAPI.writeFile(targetPath, xml);
      setFileSystemVersion((v) => v + 1);
      alert(`Exported PLCopen XML to ${targetPath}`);
    } catch (error) {
      console.error('Failed to export PLCopen XML:', error);
      alert(
        `Failed to export PLCopen XML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const buildFileAttachmentForChat = (name: string, content: string): string => {
    const MAX_FILE_CHARS = 50000;
    const truncated =
      content.length > MAX_FILE_CHARS
        ? `${content.slice(
          0,
          MAX_FILE_CHARS,
        )}\n\n[...truncated: file is large, only the first ${MAX_FILE_CHARS.toLocaleString()} characters are included...]`
        : content;

    const extension =
      name.includes('.') && name.split('.').pop()
        ? name.split('.').pop()!.toLowerCase()
        : '';
    const langHint =
      extension && /^[a-z0-9]+$/i.test(extension) ? extension : '';

    return [
      'Please analyze the following workspace file:',
      '',
      `---`,
      `File: ${name}`,
      '',
      `\`\`\`${langHint}`,
      truncated,
      '```',
      '',
    ].join('\n');
  };

  const buildFolderPreviewForChat = (node: FileNode): string => {
    const lines: string[] = [];
    let count = 0;
    const MAX_NODES = 200;

    const traverse = (nodes: FileNode[], depth: number) => {
      for (const child of nodes) {
        if (count >= MAX_NODES) {
          lines.push('... (truncated, too many entries)');
          return;
        }
        const prefix = '  '.repeat(depth);
        lines.push(`${prefix}${child.type === 'directory' ? '📁' : '📄'} ${child.name}`);
        count += 1;
        if (child.children && child.children.length > 0) {
          traverse(child.children, depth + 1);
        }
      }
    };

    if (node.children && node.children.length > 0) {
      traverse(node.children, 0);
    }

    return [
      'Workspace folder context:',
      '',
      `Folder: ${node.name}`,
      `Path: ${node.path}`,
      '',
      'Contents (limited depth):',
      ...lines,
      '',
    ].join('\n');
  };

  const handleSendNodeToChat = async (node: FileNode) => {
    try {
      if (!chatPanelRef.current) {
        console.warn('Chat panel not ready to receive file context');
        return;
      }

      if (node.type === 'file') {
        let content: string;
        if (node.handle) {
          const fileHandle: any = node.handle;
          const file = await fileHandle.getFile();
          content = await file.text();
        } else {
          content = await FileSystemAPI.readFile(node.path);
        }

        const attachment = buildFileAttachmentForChat(node.name, content);
        chatPanelRef.current.appendToInput(attachment);
      } else {
        const folderText = buildFolderPreviewForChat(node);
        chatPanelRef.current.appendToInput(folderText);
      }
    } catch (error) {
      console.error('Failed to send file or folder to chat:', error);
      alert(
        `Failed to send file or folder to chat: ${error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  // Chat operations
  const handleMCPConnect = async (serverId: string) => {
    try {
      await mcpClientManager.connectToServer(serverId);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
    }
  };

  const handleMCPDisconnect = async (serverId: string) => {
    try {
      await mcpClientManager.disconnectFromServer(serverId);
    } catch (error) {
      console.error('Failed to disconnect from MCP server:', error);
    }
  };

  const handleMCPConfigChange = (newConfig: MCPServersConfig) => {
    setMcpConfig(newConfig);
    saveMCPServersConfig(newConfig);

    const servers = configToServers(newConfig);
    mcpClientManager.getServers().forEach((server) => {
      if (!servers.find((s) => s.id === server.id)) {
        mcpClientManager.removeServer(server.id);
      }
    });

    servers.forEach((server) => {
      mcpClientManager.addServer(server);
    });

    setMcpServers(mcpClientManager.getServers());
  };

  const handleSendMessage = async (content: string) => {
    const now = Date.now();
    const userMessage: ChatMessage = {
      id: `msg-${now}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const allMessages = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (selectedSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionId ? { ...s, lastActivity: new Date() } : s
        )
      );
    }

    try {
      let assistantResponse: { content: string; toolCalls?: any[] } | null = null;

      if (chatBackend === 'cloud-llm' && cloudLLMConfig) {
        const isOpenAIGpt51 =
          cloudLLMConfig.provider === 'openai' &&
          cloudLLMConfig.model === 'gpt-5.1';

        assistantResponse = await callCloudLLM(allMessages, cloudLLMConfig, chatMode, {
          webSearchEnabled,
          applyPatchEnabled: applyPatchEnabled && isOpenAIGpt51 && chatMode === 'agent',
          applyPatchProvider: isOpenAIGpt51 ? 'openai' : undefined,
          applyPatchModel: isOpenAIGpt51 ? 'gpt-5.1' : undefined,
        });
      } else if (chatBackend === 'ollama' && ollamaConfig) {
        assistantResponse = await callOllama(allMessages, ollamaConfig, chatMode, {
          webSearchEnabled,
          applyPatchEnabled: false,
        });
      } else {
        throw new Error('Chat backend is not configured.');
      }

      if (!assistantResponse || !assistantResponse.content) {
        throw new Error('Model returned an empty response');
      }

      const response: ChatMessage = {
        id: `msg-${now + 1}`,
        role: 'assistant',
        content: assistantResponse.content,
        timestamp: new Date(),
        toolCalls: assistantResponse.toolCalls,
      };

      setMessages((prev) => [...prev, response]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error while calling the chat backend';

      const response: ChatMessage = {
        id: `msg-${now + 1}`,
        role: 'assistant',
        content: `Error from chat backend: ${errorMessage}`,
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev, response]);
    } finally {
      setIsLoading(false);
    }

    if (!selectedSessionId) {
      const newSession: ChatSession = {
        id: `session-${now}`,
        name: `Chat ${format(new Date(), 'MMM d, HH:mm')}`,
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    }
  };

  const handleNewChat = () => {
    if (isLoading) return;
    setMessages([]);
    setSelectedSessionId(null);
  };


  const handleApplyCode = async (code: string, targetPath?: string) => {
    // Case 1: Target path provided (Create/Update specific file)
    if (targetPath) {
      try {
        // Check if file is already open
        const existingTab = editorTabs.find((t) => t.path === targetPath || t.name === targetPath);

        if (existingTab) {
          // Update existing tab
          setEditorTabs((prev) =>
            prev.map((tab) =>
              tab.id === existingTab.id
                ? { ...tab, content: code, modified: true }
                : tab
            )
          );
          setActiveTabId(existingTab.id);
        } else {
          // Create new file
          // If path is absolute, use it. If relative, we might need a root.
          // For now assume absolute or relative to root (which we don't track easily here except via existing tabs)
          // But FileSystemAPI needs a path.

          // If we have an active tab, we can try to resolve relative path against it?
          // Or just try to write.

          // Let's try to write using FileSystemAPI
          // Note: This assumes backend API is available. For Native FS, we might need a handle?
          // If Native FS, we can't easily create a file at arbitrary path without a handle.
          // But we can try FileSystemAPI.createFile if backend is running.

          await FileSystemAPI.writeFile(targetPath, code);

          // Open the new file
          const language = FileSystemAPI.getFileLanguage(targetPath);
          const newTab: EditorTab = {
            id: `tab-${Date.now()}`,
            path: targetPath,
            name: targetPath.split('/').pop() || targetPath,
            content: code,
            modified: false,
            language,
          };

          setEditorTabs((prev) => [...prev, newTab]);
          setActiveTabId(newTab.id);
        }
        // Trigger explorer refresh
        setFileSystemVersion(v => v + 1);
      } catch (error) {
        console.error('Failed to apply code to file:', error);
        alert(`Failed to apply code to ${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    // Case 2: No target path (Apply to active file)
    if (!activeTabId) return;

    const activeTab = editorTabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    setEditorTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, content: code, modified: true }
          : tab
      )
    );
  };

  const currentThemeIsDark = theme === 'dark';

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      <ActivityBar
        activeView={activeActivityView}
        onViewChange={setActiveActivityView}
        onSettingsClick={() => setShowMCPConfig(true)}
      />
      <div className="flex-1 min-w-0">
        <IDELayout
          fileExplorer={
            <div className="h-full flex flex-col border-r border-border bg-background">
              {activeActivityView === 'explorer' && (
                <div className="flex-1 min-h-0">
                  <FileExplorer
                    onFileSelect={handleFileSelect}
                    selectedPath={editorTabs.find((t) => t.id === activeTabId)?.path}
                    onSendToChat={handleSendNodeToChat}
                    refreshTrigger={fileSystemVersion}
                    onImportPlcopen={handleImportPlcopen}
                  />
                </div>
              )}
              {activeActivityView === 'mcp' && (
                <div className="h-full overflow-y-auto">
                  <Sidebar
                    mcpServers={mcpServers}
                    onMCPConnect={handleMCPConnect}
                    onMCPDisconnect={handleMCPDisconnect}
                    onMCPConfigOpen={() => setShowMCPConfig(true)}
                  />
                </div>
              )}
              {activeActivityView !== 'explorer' && activeActivityView !== 'mcp' && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <div className="mb-2">This view is not yet implemented.</div>
                  <div className="text-xs opacity-70">Select Explorer or MCP Servers to continue.</div>
                </div>
              )}
            </div>
          }
          codeEditor={
          <CodeEditor
            tabs={editorTabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
            onSave={handleSave}
            isDark={currentThemeIsDark}
            plcopenProjects={plcopenProjects}
            onPlcopenParsed={handlePlcopenParsed}
            onExportPlcopen={handleExportPlcopen}
          />
        }
          chatPanel={
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <ChatPanel
                  ref={chatPanelRef}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  mode={chatMode}
                  onModeChange={setChatMode}
                  chatBackend={chatBackend}
                  onChatBackendChange={setChatBackend}
                  cloudLLMConfig={cloudLLMConfig}
                  onCloudLLMConfigChange={setCloudLLMConfig}
                  ollamaConfig={ollamaConfig}
                  onOllamaConfigChange={setOllamaConfig}
                  onApplyCodeToFile={handleApplyCode}
                  onFileSelect={handleFileSelect}
                  onNewChat={handleNewChat}
                  webSearchEnabled={webSearchEnabled}
                  onWebSearchEnabledChange={setWebSearchEnabled}
                  applyPatchEnabled={applyPatchEnabled}
                  onApplyPatchEnabledChange={setApplyPatchEnabled}
                />
              </div>
            </div>
          }
        />
      </div>

      {/* MCP Config Panel */}
      {showMCPConfig && (
        <MCPServerConfigPanel
          config={mcpConfig}
          onConfigChange={handleMCPConfigChange}
          onClose={() => setShowMCPConfig(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
