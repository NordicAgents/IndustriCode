import { Plug, Unplug, AlertCircle, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MCPServer } from '../types/mcp-types';

interface MCPServerListProps {
    servers: MCPServer[];
    onConnect: (serverId: string) => void;
    onDisconnect: (serverId: string) => void;
}

export default function MCPServerList({
    servers,
    onConnect,
    onDisconnect,
}: MCPServerListProps) {
    const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

    const toggleExpanded = (serverId: string) => {
        const newExpanded = new Set(expandedServers);
        if (newExpanded.has(serverId)) {
            newExpanded.delete(serverId);
        } else {
            newExpanded.add(serverId);
        }
        setExpandedServers(newExpanded);
    };

    const getStatusColor = (status: MCPServer['status']) => {
        switch (status) {
            case 'connected':
                return 'text-green-500';
            case 'connecting':
                return 'text-yellow-500';
            case 'error':
                return 'text-destructive';
            default:
                return 'text-muted-foreground';
        }
    };

    const getStatusIcon = (server: MCPServer) => {
        if (server.status === 'connecting') {
            return <Loader2 className="icon-sm animate-spin" />;
        } else if (server.status === 'error') {
            return <AlertCircle className="icon-sm" />;
        } else if (server.status === 'connected') {
            return <Plug className="icon-sm" />;
        }
        return <Unplug className="icon-sm" />;
    };

    if (servers.length === 0) {
        return (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No MCP servers configured
            </div>
        );
    }

    return (
        <div className="pb-1">
            {servers.map((server) => {
                const isExpanded = expandedServers.has(server.id);
                const hasTools = server.tools && server.tools.length > 0;

                return (
                    <div key={server.id} className="border-b border-border last:border-b-0">
                        {/* Server Header */}
                        <div className="px-4 py-2.5 hover:bg-accent/30 transition-all">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={getStatusColor(server.status)}>
                                        {getStatusIcon(server)}
                                    </div>
                                    <span className="text-sm font-medium truncate">{server.name}</span>
                                </div>

                                {hasTools && (
                                    <button
                                        onClick={() => toggleExpanded(server.id)}
                                        className="btn-icon-sm"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="icon-sm text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="icon-sm text-muted-foreground" />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Connection Button */}
                            <div className="flex items-center gap-2">
                                {server.status === 'connected' ? (
                                    <button
                                        onClick={() => onDisconnect(server.id)}
                                        className="btn btn-xs btn-destructive"
                                    >
                                        <Unplug className="icon-xs" />
                                        Disconnect
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onConnect(server.id)}
                                        disabled={server.status === 'connecting'}
                                        className="btn btn-xs btn-primary"
                                    >
                                        <Plug className="icon-xs" />
                                        {server.status === 'connecting' ? 'Connecting...' : 'Connect'}
                                    </button>
                                )}

                                {server.status === 'connected' && hasTools && (
                                    <span className="text-xs text-muted-foreground">
                                        {server.tools!.length} {server.tools!.length === 1 ? 'tool' : 'tools'}
                                    </span>
                                )}
                            </div>

                            {/* Error Message */}
                            {server.error && (
                                <div className="mt-2 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                                    {server.error}
                                </div>
                            )}
                        </div>

                        {/* Tools List (Expanded) */}
                        {isExpanded && hasTools && (
                            <div className="px-4 pb-2 space-y-1">
                                {server.tools!.map((tool) => (
                                    <div
                                        key={tool.name}
                                        className="pl-6 py-1.5 text-xs bg-muted/30 rounded-md"
                                    >
                                        <div className="font-mono font-medium">{tool.name}</div>
                                        {tool.description && (
                                            <div className="text-muted-foreground mt-0.5">
                                                {tool.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
