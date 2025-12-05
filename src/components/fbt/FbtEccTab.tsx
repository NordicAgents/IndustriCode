import { FbtBasicFb } from '../../types/fbt-types';

interface FbtEccTabProps {
    fb: FbtBasicFb;
}

export default function FbtEccTab({ fb }: FbtEccTabProps) {
    const ecc = fb.ecc;

    if (!ecc || (ecc.states.length === 0 && ecc.transitions.length === 0)) {
        return (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No ECC defined for this Basic Function Block.
            </div>
        );
    }

    const { states, transitions } = ecc;

    // Simple grid layout for states
    const nodeWidth = 140;
    const nodeHeight = 48;
    const horizontalGap = 80;
    const verticalGap = 60;
    const cols = Math.max(1, Math.ceil(Math.sqrt(states.length)));

    const positions = new Map<
        string,
        {
            x: number;
            y: number;
        }
    >();

    states.forEach((state, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = 40 + col * (nodeWidth + horizontalGap);
        const y = 40 + row * (nodeHeight + verticalGap);
        positions.set(state.name, { x, y });
    });

    const rows = Math.ceil(states.length / cols);
    const svgWidth = cols * (nodeWidth + horizontalGap) + 80;
    const svgHeight = rows * (nodeHeight + verticalGap) + 80;

    const isInitialState = (name: string) => name.toUpperCase() === 'START';

    return (
        <div className="h-full flex flex-col gap-3">
            <div className="border border-border rounded bg-card p-2">
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                    Execution Control Chart
                </div>
                <div className="w-full overflow-auto">
                    <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full max-h-96"
                    >
                        <defs>
                            <marker
                                id="ecc-arrow"
                                markerWidth="10"
                                markerHeight="10"
                                refX="10"
                                refY="3"
                                orient="auto"
                                markerUnits="strokeWidth"
                            >
                                <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
                            </marker>
                        </defs>

                        {/* Transitions */}
                        {transitions.map((t, index) => {
                            const from = positions.get(t.source);
                            const to = positions.get(t.destination);
                            if (!from || !to) {
                                return null;
                            }
                            const startX = from.x + nodeWidth / 2;
                            const startY = from.y + nodeHeight;
                            const endX = to.x + nodeWidth / 2;
                            const endY = to.y;
                            const midX = (startX + endX) / 2;
                            const midY = (startY + endY) / 2;

                            return (
                                <g key={`${t.source}-${t.destination}-${index}`}>
                                    <line
                                        x1={startX}
                                        y1={startY}
                                        x2={endX}
                                        y2={endY}
                                        stroke="#6b7280"
                                        strokeWidth={1.5}
                                        markerEnd="url(#ecc-arrow)"
                                    />
                                    <text
                                        x={midX}
                                        y={midY - 4}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fill="#6b7280"
                                    >
                                        {t.condition || '1'}
                                    </text>
                                </g>
                            );
                        })}

                        {/* States */}
                        {states.map((state) => {
                            const pos = positions.get(state.name);
                            if (!pos) {
                                return null;
                            }
                            const { x, y } = pos;
                            const initial = isInitialState(state.name);
                            const label = state.name;
                            const actions = state.actions
                                .map((a) => a.algorithm || a.output)
                                .filter(Boolean)
                                .join(', ');

                            return (
                                <g key={state.name}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={nodeWidth}
                                        height={nodeHeight}
                                        rx={6}
                                        ry={6}
                                        fill={initial ? '#111827' : '#1f2937'}
                                        stroke={initial ? '#f97316' : '#4b5563'}
                                        strokeWidth={initial ? 2 : 1.25}
                                    />
                                    <text
                                        x={x + nodeWidth / 2}
                                        y={y + 18}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#e5e7eb"
                                        fontWeight={initial ? 'bold' : 'normal'}
                                    >
                                        {label}
                                    </text>
                                    {actions && (
                                        <text
                                            x={x + nodeWidth / 2}
                                            y={y + 34}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fill="#d1d5db"
                                        >
                                            {actions}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[160px]">
                {/* States table */}
                <div className="border border-border rounded bg-card flex flex-col">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                            States
                        </span>
                        <span className="text-[10px] text-muted-foreground">{states.length}</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full text-[11px]">
                            <thead>
                                <tr className="text-muted-foreground text-[10px] border-b border-border">
                                    <th className="px-2 py-1 text-left font-medium">Name</th>
                                    <th className="px-2 py-1 text-left font-medium">Comment</th>
                                    <th className="px-2 py-1 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {states.map((s) => (
                                    <tr key={s.name} className="border-b border-border/40">
                                        <td className="px-2 py-1 font-medium">
                                            {s.name}
                                            {isInitialState(s.name) && (
                                                <span className="ml-1 text-[10px] text-orange-400">
                                                    (initial)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {s.comment || '-'}
                                        </td>
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {s.actions.length > 0
                                                ? s.actions
                                                    .map((a) =>
                                                        [a.algorithm, a.output]
                                                            .filter(Boolean)
                                                            .join(' → ')
                                                    )
                                                    .join(', ')
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transitions table */}
                <div className="border border-border rounded bg-card flex flex-col">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                            Transitions
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {transitions.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {transitions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                No transitions defined.
                            </div>
                        ) : (
                            <table className="min-w-full text-[11px]">
                                <thead>
                                    <tr className="text-muted-foreground text-[10px] border-b border-border">
                                        <th className="px-2 py-1 text-left font-medium">Source</th>
                                        <th className="px-2 py-1 text-left font-medium">Destination</th>
                                        <th className="px-2 py-1 text-left font-medium">Condition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transitions.map((t, index) => (
                                        <tr
                                            key={`${t.source}-${t.destination}-${index}`}
                                            className="border-b border-border/40"
                                        >
                                            <td className="px-2 py-1 text-muted-foreground">
                                                {t.source}
                                            </td>
                                            <td className="px-2 py-1 text-muted-foreground">
                                                {t.destination}
                                            </td>
                                            <td className="px-2 py-1 text-muted-foreground">
                                                {t.condition || '1'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

