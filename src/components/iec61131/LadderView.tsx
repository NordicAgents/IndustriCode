import { PlcopenLdNetwork } from '../../types/plcopen-types';

interface LadderViewProps {
    networks: PlcopenLdNetwork[];
}

export default function LadderView({ networks }: LadderViewProps) {
    if (networks.length === 0) {
        return <div className="text-xs text-muted-foreground">No ladder networks available.</div>;
    }

    return (
        <div className="space-y-4">
            {networks.map((network, networkIndex) => (
                <div
                    key={network.id ?? `network-${networkIndex}`}
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
                            {network.rungs.length} rung{network.rungs.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {network.rungs.map((rung, rungIndex) => (
                            <div
                                key={rung.id ?? `rung-${rungIndex}`}
                                className="border border-border/70 rounded-md p-3 bg-background/50"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-xs">
                                            Rung {rungIndex + 1}
                                            {rung.id ? ` · ${rung.id}` : ''}
                                        </div>
                                        {rung.comment && (
                                            <div className="text-[10px] text-muted-foreground">
                                                {rung.comment}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {rung.elements.length} element
                                        {rung.elements.length === 1 ? '' : 's'}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {rung.elements.map((element, elementIndex) => {
                                        const label =
                                            element.name ||
                                            element.variable ||
                                            element.expression ||
                                            'Unnamed element';
                                        return (
                                            <div
                                                key={element.localId ?? `element-${elementIndex}`}
                                                className="min-w-[120px] border border-border/60 rounded px-2 py-1 bg-muted/40"
                                            >
                                                <div className="text-[10px] font-semibold uppercase tracking-wide">
                                                    {element.type}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {label}
                                                </div>
                                                {element.negated && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Negated
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {rung.elements.length === 0 && (
                                        <div className="text-[11px] text-muted-foreground">
                                            No elements in this rung.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {network.rungs.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                                No rungs defined for this network.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
