import { FbtBasicFb, FbtVar } from '../../types/fbt-types';

interface FbtBlockGraphicProps {
    fb: FbtBasicFb;
}

function formatVarType(v: FbtVar): string {
    if (v.arraySize) {
        return `ARRAY[${v.arraySize}] OF ${v.type}`;
    }
    return v.type;
}

export default function FbtBlockGraphic({ fb }: FbtBlockGraphicProps) {
    const eventInputs = fb.events.filter((e) => e.direction === 'input');
    const eventOutputs = fb.events.filter((e) => e.direction === 'output');
    const inputVars = fb.vars.filter((v) => v.direction === 'input');
    const outputVars = fb.vars.filter((v) => v.direction === 'output');

    const blockLabel = fb.name;

    return (
        <div className="flex flex-col items-start gap-2 text-[11px]">
            <div className="text-[10px] text-muted-foreground">Function Block View</div>
            <div className="flex items-stretch gap-3">
                {/* Left side labels (types) */}
                <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
                    <div className="flex flex-col items-end gap-1 mb-2">
                        {eventInputs.map((_, idx) => (
                            <span key={`evt-in-type-${idx}`}>EVENT</span>
                        ))}
                    </div>
                    <div className="flex flex-col items-end gap-1 mt-2">
                        {inputVars.map((v) => (
                            <span key={`var-in-type-${v.name}`}>{formatVarType(v)}</span>
                        ))}
                    </div>
                </div>

                {/* Block */}
                <div className="border border-border rounded bg-muted/60 px-3 py-2 min-w-[180px] flex flex-col justify-between shadow-sm">
                    {/* Event area */}
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex flex-col items-start gap-1">
                            {eventInputs.map((ev) => (
                                <div
                                    key={`evt-in-${ev.name}`}
                                    className="flex items-center gap-1"
                                >
                                    <div className="w-2 h-2 border border-foreground bg-background rounded-sm" />
                                    <span className="text-[11px] font-medium">{ev.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {eventOutputs.map((ev) => (
                                <div
                                    key={`evt-out-${ev.name}`}
                                    className="flex items-center gap-1"
                                >
                                    <span className="text-[11px] font-medium">{ev.name}</span>
                                    <div className="w-2 h-2 border border-foreground bg-background rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Block label */}
                    <div className="flex items-center justify-center my-1">
                        <div className="px-2 py-1 bg-background rounded border border-border text-[11px] font-semibold truncate max-w-[140px]">
                            {blockLabel}
                        </div>
                    </div>

                    {/* Data area */}
                    <div className="flex justify-between items-end gap-4 mt-2 pt-2 border-t border-border/60">
                        <div className="flex flex-col items-start gap-1">
                            {inputVars.map((v) => (
                                <div
                                    key={`var-in-${v.name}`}
                                    className="flex items-center gap-1"
                                >
                                    <div className="w-2 h-2 border border-foreground bg-background rounded-sm" />
                                    <span className="text-[11px] font-medium">{v.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {outputVars.map((v) => (
                                <div
                                    key={`var-out-${v.name}`}
                                    className="flex items-center gap-1"
                                >
                                    <span className="text-[11px] font-medium">{v.name}</span>
                                    <div className="w-2 h-2 border border-foreground bg-background rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side labels (types) */}
                <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
                    <div className="flex flex-col items-start gap-1 mb-2">
                        {eventOutputs.map((_, idx) => (
                            <span key={`evt-out-type-${idx}`}>EVENT</span>
                        ))}
                    </div>
                    <div className="flex flex-col items-start gap-1 mt-2">
                        {outputVars.map((v) => (
                            <span key={`var-out-type-${v.name}`}>{formatVarType(v)}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

