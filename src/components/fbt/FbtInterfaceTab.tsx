import { FbtBasicFb, FbtVar } from '../../types/fbt-types';
import FbtBlockGraphic from './FbtBlockGraphic';

interface FbtInterfaceTabProps {
    fb: FbtBasicFb;
}

function formatVarType(v: FbtVar): string {
    if (v.arraySize) {
        return `ARRAY[${v.arraySize}] OF ${v.type}`;
    }
    return v.type;
}

export default function FbtInterfaceTab({ fb }: FbtInterfaceTabProps) {
    const eventInputs = fb.events.filter((e) => e.direction === 'input');
    const eventOutputs = fb.events.filter((e) => e.direction === 'output');
    const inputVars = fb.vars.filter((v) => v.direction === 'input');
    const outputVars = fb.vars.filter((v) => v.direction === 'output');

    const rows: Array<{
        kind: 'event-input' | 'event-output' | 'data-input' | 'data-output';
        name: string;
        type: string;
        comment?: string;
        associations?: string;
    }> = [];

    eventInputs.forEach((ev) => {
        rows.push({
            kind: 'event-input',
            name: ev.name,
            type: 'EVENT',
            comment: ev.comment,
            associations: ev.associatedVars.join(', '),
        });
    });

    eventOutputs.forEach((ev) => {
        rows.push({
            kind: 'event-output',
            name: ev.name,
            type: 'EVENT',
            comment: ev.comment,
            associations: ev.associatedVars.join(', '),
        });
    });

    inputVars.forEach((v) => {
        rows.push({
            kind: 'data-input',
            name: v.name,
            type: formatVarType(v),
            comment: v.comment,
            associations: v.usedByEvents.join(', '),
        });
    });

    outputVars.forEach((v) => {
        rows.push({
            kind: 'data-output',
            name: v.name,
            type: formatVarType(v),
            comment: v.comment,
            associations: v.usedByEvents.join(', '),
        });
    });

    const kindLabel = (kind: (typeof rows)[number]['kind']) => {
        switch (kind) {
            case 'event-input':
                return 'Event In';
            case 'event-output':
                return 'Event Out';
            case 'data-input':
                return 'Data In';
            case 'data-output':
                return 'Data Out';
            default:
                return '';
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Tabular interface details */}
            <div className="border border-border rounded bg-card">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Interface
                    </h4>
                    <span className="text-[10px] text-muted-foreground">{rows.length}</span>
                </div>
                <div className="max-h-72 overflow-auto">
                    {rows.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                            No interface elements defined.
                        </div>
                    ) : (
                        <table className="min-w-full text-[11px]">
                            <thead>
                                <tr className="text-muted-foreground text-[10px] border-b border-border">
                                    <th className="px-2 py-1 text-left font-medium">Kind</th>
                                    <th className="px-2 py-1 text-left font-medium">Name</th>
                                    <th className="px-2 py-1 text-left font-medium">Type</th>
                                    <th className="px-2 py-1 text-left font-medium">Comment / Associations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={`${row.kind}-${row.name}`}
                                        className="border-b border-border/40"
                                    >
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {kindLabel(row.kind)}
                                        </td>
                                        <td className="px-2 py-1 font-medium">{row.name}</td>
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {row.type}
                                        </td>
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {row.comment && (
                                                <span>
                                                    {row.comment}
                                                    {row.associations && ' · '}
                                                </span>
                                            )}
                                            {row.associations && (
                                                <span>Assoc: {row.associations}</span>
                                            )}
                                            {!row.comment && !row.associations && '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {fb.comment && (
                <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    <span className="font-semibold mr-1">Comment:</span>
                    <span>{fb.comment}</span>
                </div>
            )}

            {/* Graphical block view below, centered */}
            <div className="pt-2 flex justify-center">
                <FbtBlockGraphic fb={fb} />
            </div>
        </div>
    );
}
