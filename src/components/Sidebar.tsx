import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Server,
  Settings,
} from 'lucide-react';
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
  const [mcpExpanded, setMcpExpanded] = useState(true);

  const connectedCount = mcpServers.filter(s => s.status === 'connected').length;

  return (
    <div className="bg-background flex flex-col h-full">
      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* MCP Servers Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setMcpExpanded(!mcpExpanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Server className="icon-md text-muted-foreground" />
              <span className="font-medium text-sm">MCP Servers</span>
              {connectedCount > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {connectedCount}
                </span>
              )}
            </div>
            {mcpExpanded ? (
              <ChevronDown className="icon-md text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="icon-md text-muted-foreground transition-transform" />
            )}
          </button>
          {mcpExpanded && (
            <div>
              <MCPServerList
                servers={mcpServers}
                onConnect={onMCPConnect}
                onDisconnect={onMCPDisconnect}
              />
              <div className="px-4 py-2 border-t border-border">
                <button
                  onClick={onMCPConfigOpen}
                  className="btn btn-sm btn-outline w-full"
                >
                  <Settings className="icon-sm" />
                  Configure Servers
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Reserved for future configuration sections */}
      </div>
    </div>
  );
}
