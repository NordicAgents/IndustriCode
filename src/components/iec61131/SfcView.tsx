import { PlcopenSfcNetwork } from '../../types/plcopen-types';

interface SfcViewProps {
    networks: Array<{
        pouName: string;
        network: PlcopenSfcNetwork;
    }>;
}

export default function SfcView({ networks }: SfcViewProps) {
    if (networks.length === 0) {
        return <div className="text-xs text-muted-foreground">No SFC networks found.</div>;
    }

    return (
        <div className="space-y-4 text-xs">
            {networks.map((entry) => (
                <div key={entry.pouName} className="border border-border rounded p-3">
                    <div className="text-sm font-semibold mb-2">{entry.pouName}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="border border-border rounded p-2 bg-muted/20">
                            <div className="font-medium mb-2">Steps</div>
                            <div className="space-y-2">
                                {entry.network.steps.map((step) => (
                                    <div key={step.name} className="border border-border rounded p-2">
                                        <div className="font-medium">
                                            {step.name}
                                            {step.initial ? ' (Initial)' : ''}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Actions: {step.actionBlocks.join(', ') || 'None'}
                                        </div>
                                    </div>
                                ))}
                                {entry.network.steps.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        No steps defined.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border border-border rounded p-2 bg-muted/20">
                            <div className="font-medium mb-2">Transitions</div>
                            <div className="space-y-2">
                                {entry.network.transitions.map((transition, index) => (
                                    <div
                                        key={`${transition.name || 'transition'}-${index}`}
                                        className="border border-border rounded p-2"
                                    >
                                        <div className="font-medium">
                                            {transition.name || `Transition ${index + 1}`}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            From: {transition.from.join(', ') || 'Unknown'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            To: {transition.to.join(', ') || 'Unknown'}
                                        </div>
                                        {transition.condition && (
                                            <div className="text-[10px] text-muted-foreground mt-1">
                                                Condition: {transition.condition}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {entry.network.transitions.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        No transitions defined.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border border-border rounded p-2 bg-muted/20">
                            <div className="font-medium mb-2">Actions</div>
                            <div className="space-y-2">
                                {entry.network.actions.map((action) => (
                                    <div key={action.name} className="border border-border rounded p-2">
                                        <div className="font-medium">{action.name}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {action.body?.code || 'No structured text provided.'}
                                        </div>
                                    </div>
                                ))}
                                {entry.network.actions.length === 0 && (
                                    <div className="text-[10px] text-muted-foreground">
                                        No actions defined.
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
