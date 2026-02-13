import { PlcopenSfcNetwork } from '../../types/plcopen-types';

interface SfcViewProps {
    network?: PlcopenSfcNetwork;
}

export default function SfcView({ network }: SfcViewProps) {
    if (!network) {
        return <div className="text-xs text-muted-foreground">No SFC network available.</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
            <div className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="text-sm font-semibold mb-2">Steps</div>
                <div className="space-y-2">
                    {network.steps.map((step) => (
                        <div key={step.name} className="border border-border/60 rounded p-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">{step.name}</div>
                                {step.initial && (
                                    <span className="text-[10px] uppercase text-primary">Initial</span>
                                )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                {step.actionBlocks.length} action block
                                {step.actionBlocks.length === 1 ? '' : 's'}
                            </div>
                            {step.actionBlocks.length > 0 && (
                                <ul className="mt-1 list-disc list-inside text-[10px] text-muted-foreground">
                                    {step.actionBlocks.map((action) => (
                                        <li key={action}>{action}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                    {network.steps.length === 0 && (
                        <div className="text-muted-foreground">No steps defined.</div>
                    )}
                </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="text-sm font-semibold mb-2">Transitions</div>
                <div className="space-y-2">
                    {network.transitions.map((transition, index) => (
                        <div
                            key={transition.name ?? `transition-${index}`}
                            className="border border-border/60 rounded p-2"
                        >
                            <div className="font-medium">
                                {transition.name || `Transition ${index + 1}`}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                From: {transition.from.join(', ') || '—'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                To: {transition.to.join(', ') || '—'}
                            </div>
                            {transition.condition && (
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                    Condition: {transition.condition}
                                </div>
                            )}
                        </div>
                    ))}
                    {network.transitions.length === 0 && (
                        <div className="text-muted-foreground">No transitions defined.</div>
                    )}
                </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="text-sm font-semibold mb-2">Actions</div>
                <div className="space-y-2">
                    {network.actions.map((action) => (
                        <div key={action.name} className="border border-border/60 rounded p-2">
                            <div className="font-medium">{action.name}</div>
                            {action.body?.code ? (
                                <pre className="mt-1 whitespace-pre-wrap text-[10px] text-muted-foreground">
                                    {action.body.code}
                                </pre>
                            ) : (
                                <div className="text-[10px] text-muted-foreground">
                                    No action body.
                                </div>
                            )}
                        </div>
                    ))}
                    {network.actions.length === 0 && (
                        <div className="text-muted-foreground">No actions defined.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
