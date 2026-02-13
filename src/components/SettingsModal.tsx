import React, { useState, useEffect } from 'react';
import { Plus, X, Upload, Download, Server, Cpu, Globe, Terminal } from 'lucide-react';
import { MCPServersConfig, MCPServerConfig } from '../types/mcp-types';
import { ChatBackend, CloudLLMConfig, OllamaConfig } from '../types';
import { importCursorConfig, exportCursorConfig } from '../utils/mcp-storage';

interface SettingsModalProps {
  onClose: () => void;
  // MCP
  mcpConfig: MCPServersConfig;
  onMCPConfigChange: (config: MCPServersConfig) => void;
  // LLM
  chatBackend: ChatBackend;
  onChatBackendChange: (backend: ChatBackend) => void;
  cloudLLMConfig: CloudLLMConfig | null;
  onCloudLLMConfigChange: (config: CloudLLMConfig | null) => void;
  ollamaConfig: OllamaConfig | null;
  onOllamaConfigChange: (config: OllamaConfig | null) => void;
  // Feature flags
  webSearchEnabled: boolean;
  onWebSearchEnabledChange: (enabled: boolean) => void;
  applyPatchEnabled: boolean;
  onApplyPatchEnabledChange: (enabled: boolean) => void;
}

export default function SettingsModal({
  onClose,
  mcpConfig,
  onMCPConfigChange,
  chatBackend,
  onChatBackendChange,
  cloudLLMConfig,
  onCloudLLMConfigChange,
  ollamaConfig,
  onOllamaConfigChange,
  webSearchEnabled,
  onWebSearchEnabledChange,
  applyPatchEnabled,
  onApplyPatchEnabledChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'mcp'>('general');

  // MCP State
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
    const [jsonInput, setJsonInput] = useState(exportCursorConfig(mcpConfig));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    command: string;
    args: string;
    env: string;
  }>({
    name: '',
    command: '',
    args: '',
    env: '',
  });

  // LLM State
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);

  const fetchOllamaModels = async (baseUrl: string) => {
    setIsLoadingOllamaModels(true);
    try {
      const url = baseUrl.replace(/\/$/, '') + '/api/tags';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      setOllamaModels(models);
    } catch (e) {
      console.error(e);
      setOllamaModels([]);
    } finally {
      setIsLoadingOllamaModels(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'general' && chatBackend === 'ollama') {
        fetchOllamaModels(ollamaConfig?.baseUrl || 'http://localhost:11434');
    }
  }, [activeTab, chatBackend, ollamaConfig?.baseUrl]);


  // MCP Handlers
  const handleAddServer = () => {
    if (!formData.name || !formData.command) {
        alert('Server name and command are required');
        return;
    }
    const newConfig = { ...mcpConfig };
    const serverConfig: MCPServerConfig = {
        command: formData.command,
        args: formData.args.split('\n').filter(a => a.trim()),
        env: formData.env ? JSON.parse(formData.env) : undefined,
    };
    newConfig.mcpServers[formData.name] = serverConfig;
    onMCPConfigChange(newConfig);
    setFormData({ name: '', command: '', args: '', env: '' });
  };

  const handleDeleteServer = (serverName: string) => {
    const newConfig = { ...mcpConfig };
    delete newConfig.mcpServers[serverName];
    onMCPConfigChange(newConfig);
  };

  const handleImportJSON = () => {
      const imported = importCursorConfig(jsonInput);
      if (imported) {
          onMCPConfigChange(imported);
          setJsonError(null);
          setEditMode('form');
      } else {
          setJsonError('Invalid JSON format');
      }
  };

  const handleExportJSON = () => {
      const json = exportCursorConfig(mcpConfig);
      navigator.clipboard.writeText(json);
      alert('Configuration copied to clipboard!');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const content = e.target?.result as string;
              const imported = importCursorConfig(content);
              if (imported) {
                  onMCPConfigChange(imported);
                  setJsonError(null);
              } else {
                  setJsonError('Invalid configuration file');
              }
          };
          reader.readAsText(file);
      }
  };

  const CLOUD_MODEL_OPTIONS: Record<CloudLLMConfig['provider'], string[]> = {
    openai: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'],
    gemini: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-preview'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-background w-[900px] h-[600px] rounded-lg shadow-2xl flex border border-border overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-muted/20 p-4 flex flex-col gap-2">
            <h2 className="text-lg font-semibold px-2 mb-2">Settings</h2>
            <button
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
            >
                <Cpu className="w-4 h-4" />
                General & LLM
            </button>
            <button
                onClick={() => setActiveTab('mcp')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'mcp' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
            >
                <Server className="w-4 h-4" />
                MCP Servers
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
                <h3 className="font-semibold text-lg">
                    {activeTab === 'general' ? 'General Settings' : 'MCP Servers Configuration'}
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' ? (
                    <div className="space-y-8 max-w-2xl">
                        {/* LLM Backend Selection */}
                        <section className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Chat Backend</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${chatBackend === 'cloud-llm' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => onChatBackendChange('cloud-llm')}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Globe className="w-5 h-5 text-primary" />
                                        <div className="font-semibold">Cloud LLM</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Use providers like OpenAI, Google, or Anthropic.</p>
                                </div>
                                <div
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${chatBackend === 'ollama' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => onChatBackendChange('ollama')}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Terminal className="w-5 h-5 text-primary" />
                                        <div className="font-semibold">Local (Ollama)</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Run models locally on your machine.</p>
                                </div>
                            </div>
                        </section>

                        {/* Provider Configuration */}
                        {chatBackend === 'cloud-llm' && (
                            <section className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Provider Settings</h4>
                                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/10">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1.5">Provider</label>
                                            <select
                                                value={cloudLLMConfig?.provider || 'openai'}
                                                onChange={(e) => onCloudLLMConfigChange({
                                                    provider: e.target.value as CloudLLMConfig['provider'],
                                                    model: CLOUD_MODEL_OPTIONS[e.target.value as CloudLLMConfig['provider']][0],
                                                    apiKey: cloudLLMConfig?.apiKey || '',
                                                    baseUrl: cloudLLMConfig?.baseUrl
                                                })}
                                                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                                            >
                                                <option value="openai">OpenAI</option>
                                                <option value="gemini">Google Gemini</option>
                                                <option value="anthropic">Anthropic</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1.5">Model</label>
                                            <select
                                                value={cloudLLMConfig?.model || ''}
                                                onChange={(e) => onCloudLLMConfigChange({
                                                    ...cloudLLMConfig!,
                                                    model: e.target.value
                                                })}
                                                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                                            >
                                                {(CLOUD_MODEL_OPTIONS[cloudLLMConfig?.provider || 'openai'] || []).map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5">API Key</label>
                                        <input
                                            type="password"
                                            value={cloudLLMConfig?.apiKey || ''}
                                            onChange={(e) => onCloudLLMConfigChange({
                                                ...cloudLLMConfig!,
                                                apiKey: e.target.value
                                            })}
                                            placeholder="sk-..."
                                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Your API key is stored locally on your device.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5">Base URL (Optional)</label>
                                        <input
                                            type="text"
                                            value={cloudLLMConfig?.baseUrl || ''}
                                            onChange={(e) => onCloudLLMConfigChange({
                                                ...cloudLLMConfig!,
                                                baseUrl: e.target.value
                                            })}
                                            placeholder="https://api.openai.com/v1"
                                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {chatBackend === 'ollama' && (
                            <section className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ollama Settings</h4>
                                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/10">
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5">Base URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={ollamaConfig?.baseUrl || 'http://localhost:11434'}
                                                onChange={(e) => onOllamaConfigChange({
                                                    model: ollamaConfig?.model || '',
                                                    baseUrl: e.target.value
                                                })}
                                                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm font-mono"
                                            />
                                            <button
                                                onClick={() => fetchOllamaModels(ollamaConfig?.baseUrl || 'http://localhost:11434')}
                                                disabled={isLoadingOllamaModels}
                                                className="btn btn-secondary text-xs"
                                            >
                                                {isLoadingOllamaModels ? '...' : 'Refresh'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1.5">Model</label>
                                        <select
                                            value={ollamaConfig?.model || ''}
                                            onChange={(e) => onOllamaConfigChange({
                                                ...ollamaConfig!,
                                                model: e.target.value
                                            })}
                                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                                        >
                                            <option value="">Select a model</option>
                                            {ollamaModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Features */}
                        <section className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Features</h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-accent/20 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={webSearchEnabled}
                                        onChange={(e) => onWebSearchEnabledChange(e.target.checked)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Web Search</div>
                                        <p className="text-xs text-muted-foreground">Allow the assistant to search the web for real-time information.</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-accent/20 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={applyPatchEnabled}
                                        onChange={(e) => onApplyPatchEnabledChange(e.target.checked)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Apply Code Patches</div>
                                        <p className="text-xs text-muted-foreground">Allow the assistant to directly modify files in your workspace (Experimental).</p>
                                    </div>
                                </label>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6">
                         {/* Mode Switcher */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setEditMode('form')}
                                className={`btn btn-sm ${editMode === 'form' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                Form Editor
                            </button>
                            <button
                                onClick={() => setEditMode('json')}
                                className={`btn btn-sm ${editMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                JSON Editor
                            </button>
                            <div className="flex-1" />
                            <button onClick={handleExportJSON} className="btn btn-sm btn-secondary">
                                <Download className="icon-md" /> Export
                            </button>
                            <label className="btn btn-sm btn-secondary cursor-pointer">
                                <Upload className="icon-md" /> Import
                                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                            </label>
                        </div>

                        {editMode === 'form' ? (
                            <div className="space-y-6">
                                {/* Existing Servers */}
                                <div className="space-y-2">
                                    {Object.entries(mcpConfig.mcpServers).map(([name, serverConfig]) => (
                                        <div key={name} className="p-3 border border-border rounded-md bg-muted/30 flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm mb-1">{name}</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate">
                                                    {serverConfig.command} {serverConfig.args.join(' ')}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteServer(name)} className="btn-icon-sm hover:bg-destructive/20 hover:text-destructive ml-2">
                                                <X className="icon-md" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {/* Add New */}
                                <div className="border-t border-border pt-6 space-y-4">
                                    <h3 className="text-sm font-semibold">Add New Server</h3>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Server Name"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={formData.command}
                                        onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                                        placeholder="Command (e.g. npx, uv)"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    />
                                    <textarea
                                        value={formData.args}
                                        onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                                        placeholder="Arguments (one per line)"
                                        rows={3}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    />
                                    <textarea
                                        value={formData.env}
                                        onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                                        placeholder='Environment Variables (JSON: {"KEY": "VALUE"})'
                                        rows={2}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    />
                                    <button onClick={handleAddServer} className="btn btn-sm btn-primary">
                                        <Plus className="icon-md" /> Add Server
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    value={jsonInput}
                                    onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }}
                                    rows={15}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                />
                                {jsonError && <div className="text-sm text-destructive">{jsonError}</div>}
                                <button onClick={handleImportJSON} className="btn btn-sm btn-primary">
                                    Apply JSON Configuration
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
