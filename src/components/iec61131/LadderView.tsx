import { PlcopenLdNetwork } from '../../types/plcopen-types';

interface LadderViewProps {
    networksByPou: Array<{
        pouName: string;
        networks: PlcopenLdNetwork[];
    }>;
}

export default function LadderView({ networksByPou }: LadderViewProps) {
    if (networksByPou.length === 0) {
        return (
            <div className="text-xs text-muted-foreground">No ladder networks found.</div>
        );
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
                                <div className="space-y-2">
                                    {network.rungs.map((rung, rungIndex) => (
                                        <div key={`${rung.id || rungIndex}`}>
                                            <div className="text-[10px] uppercase text-muted-foreground mb-1">
                                                Rung {rungIndex + 1}
                                                {rung.id ? ` · ${rung.id}` : ''}
                                            </div>
                                            {rung.comment && (
                                                <div className="text-[10px] text-muted-foreground mb-1">
                                                    {rung.comment}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                {rung.elements.map((element, elementIndex) => (
                                                    <div
                                                        key={`${element.localId || elementIndex}`}
                                                        className="px-2 py-1 rounded border border-border bg-background"
                                                    >
                                                        <div className="font-medium">
                                                            {element.type}
                                                            {element.negated ? ' (Negated)' : ''}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {element.name || element.variable || element.expression ||
                                                                'Unnamed element'}
                                                        </div>
                                                    </div>
                                                ))}
                                                {rung.elements.length === 0 && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        No elements in this rung.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {entry.networks.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                                No ladder networks available for this POU.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
