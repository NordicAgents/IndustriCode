import { PlcopenFbdNetwork } from '../../types/plcopen-types';

interface FbdViewProps {
    networks: PlcopenFbdNetwork[];
}

export default function FbdView({ networks }: FbdViewProps) {
    if (networks.length === 0) {
        return <div className="text-xs text-muted-foreground">No FBD networks available.</div>;
    }

    return (
        <div className="space-y-4">
            {networks.map((network, networkIndex) => (
                <div
                    key={network.id ?? `fbd-${networkIndex}`}
                    className="border border-border rounded-lg p-3 bg-muted/20"
                >
                    <div className="flex items-start justify-between text-xs mb-3">
                        <div>
                            <div className="text-sm font-semibold">
                                Network {networkIndex + 1}
                                {network.id ? ` · ${network.id}` : ''}
                            </div>
                            {network.comment && (
                                <div className="text-muted-foreground">{network.comment}</div>
                            )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {network.blocks.length} block{network.blocks.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
                        <div className="border border-border/60 rounded p-2 bg-background/50">
                            <div className="font-medium text-xs mb-2">Blocks</div>
                            <div className="space-y-2">
                                {network.blocks.map((block) => (
                                    <div
                                        key={block.localId ?? block.instanceName ?? block.name ?? block.type}
                                        className="border border-border/50 rounded p-2"
                                    >
                                        <div className="font-semibold text-[11px]">{block.type}</div>
                                        {block.instanceName && (
                                            <div className="text-[10px] text-muted-foreground">
                                                Instance: {block.instanceName}
                                            </div>
                                        )}
                                        {block.name && (
                                            <div className="text-[10px] text-muted-foreground">
                                                Name: {block.name}
                                            </div>
                                        )}
                                        <div className="mt-1 text-[10px] text-muted-foreground">
                                            Inputs: {block.inputs.length} · Outputs: {block.outputs.length}
                                        </div>
                                        {(block.inputs.length > 0 || block.outputs.length > 0) && (
                                            <div className="mt-1 text-[10px] text-muted-foreground">
                                                {block.inputs.length > 0 && (
                                                    <div>In: {block.inputs.map((pin) => pin.name).join(', ') || '—'}</div>
                                                )}
                                                {block.outputs.length > 0 && (
                                                    <div>
                                                        Out:{' '}
                                                        {block.outputs.map((pin) => pin.name).join(', ') || '—'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {network.blocks.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">No blocks defined.</div>
                                )}
                            </div>
                        </div>

                        <div className="border border-border/60 rounded p-2 bg-background/50">
                            <div className="font-medium text-xs mb-2">Connections</div>
                            <div className="space-y-2">
                                {network.connections.map((connection, index) => (
                                    <div
                                        key={`${connection.source}-${connection.target}-${index}`}
                                        className="border border-border/50 rounded p-2"
                                    >
                                        <div className="text-[10px] text-muted-foreground">
                                            {connection.source} → {connection.target}
                                        </div>
                                        {connection.formalParameter && (
                                            <div className="text-[10px] text-muted-foreground">
                                                Param: {connection.formalParameter}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {network.connections.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        No connections defined.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border border-border/60 rounded p-2 bg-background/50">
                            <div className="font-medium text-xs mb-2">Variables</div>
                            <div className="space-y-2">
                                {network.variables.map((variable, index) => (
                                    <div
                                        key={variable.localId ?? variable.name ?? `var-${index}`}
                                        className="border border-border/50 rounded p-2"
                                    >
                                        <div className="text-[10px] font-semibold">
                                            {variable.name || 'Unnamed variable'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Role: {variable.role}
                                        </div>
                                    </div>
                                ))}
                                {network.variables.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        No variables defined.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
