import { Settings } from 'lucide-react';
import { MCPServer } from '../types/mcp-types';
import MCPServerList from './MCPServerList';

interface SidebarProps {
  mcpServers: MCPServer[];
  onMCPConnect: (serverId: string) => void;
  onMCPDisconnect: (serverId: string) => void;
  onMCPConfigOpen: () => void;
}

export default function Sidebar({
  mcpServers,
  onMCPConnect,
  onMCPDisconnect,
  onMCPConfigOpen,
}: SidebarProps) {
  const connectedCount = mcpServers.filter(s => s.status === 'connected').length;

  return (
    <div className="bg-background flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">MCP SERVERS</h2>
          {connectedCount > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {connectedCount}
            </span>
          )}
        </div>
        <button
          onClick={onMCPConfigOpen}
          className="p-1 hover:bg-accent/50 rounded-md transition-colors"
          title="Configure Servers"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <MCPServerList
          servers={mcpServers}
          onConnect={onMCPConnect}
          onDisconnect={onMCPDisconnect}
        />
      </div>
    </div>
  );
}
