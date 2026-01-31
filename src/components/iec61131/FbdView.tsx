import { PlcopenFbdNetwork } from '../../types/plcopen-types';

interface FbdViewProps {
    networksByPou: Array<{
        pouName: string;
        networks: PlcopenFbdNetwork[];
    }>;
}

export default function FbdView({ networksByPou }: FbdViewProps) {
    if (networksByPou.length === 0) {
        return <div className="text-xs text-muted-foreground">No FBD networks found.</div>;
    }

    return (
        <div className="space-y-4 text-xs">
            {networksByPou.map((entry) => (
                <div key={entry.pouName} className="border border-border rounded p-3">
                    <div className="text-sm font-semibold mb-2">{entry.pouName}</div>
                    <div className="space-y-3">
                        {entry.networks.map((network, networkIndex) => (
                            <div
                                key={`${entry.pouName}-${network.id || networkIndex}`}
                                className="border border-border rounded p-2 bg-muted/20"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">
                                        Network {networkIndex + 1}
                                        {network.id ? ` · ${network.id}` : ''}
                                    </div>
                                    {network.comment && (
                                        <div className="text-[10px] text-muted-foreground truncate">
                                            {network.comment}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                    <div>
                                        <div className="font-medium mb-1">Blocks</div>
                                        <div className="space-y-2">
                                            {network.blocks.map((block, blockIndex) => (
                                                <div key={block.localId || blockIndex} className="border border-border rounded p-2">
                                                    <div className="font-medium">{block.type}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {block.instanceName || block.name || 'Unnamed block'}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Inputs: {block.inputs.map((input) => input.name).filter(Boolean).join(', ') || 'None'}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Outputs: {block.outputs.map((output) => output.name).filter(Boolean).join(', ') || 'None'}
                                                    </div>
                                                </div>
                                            ))}
                                            {network.blocks.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground">No blocks defined.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium mb-1">Connections</div>
                                        <div className="space-y-2">
                                            {network.connections.map((connection, connectionIndex) => (
                                                <div key={`${connection.source}-${connectionIndex}`} className="border border-border rounded p-2">
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Source: {connection.source}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Target: {connection.target}
                                                    </div>
                                                    {connection.formalParameter && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            Param: {connection.formalParameter}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {network.connections.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground">No connections defined.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium mb-1">Variables</div>
                                        <div className="space-y-2">
                                            {network.variables.map((variable, variableIndex) => (
                                                <div key={variable.localId || variableIndex} className="border border-border rounded p-2">
                                                    <div className="font-medium">{variable.name || 'Unnamed variable'}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Role: {variable.role}
                                                    </div>
                                                </div>
                                            ))}
                                            {network.variables.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground">No variables defined.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {entry.networks.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                                No FBD networks available for this POU.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
