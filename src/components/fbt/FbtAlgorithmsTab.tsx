import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { FbtBasicFb, FbtAlgorithm } from '../../types/fbt-types';
import { defaultEditorOptions } from '../../utils/monaco-config';

interface FbtAlgorithmsTabProps {
    fb: FbtBasicFb;
}

export default function FbtAlgorithmsTab({ fb }: FbtAlgorithmsTabProps) {
    const [selectedName, setSelectedName] = useState<string | null>(
        fb.algorithms.length > 0 ? fb.algorithms[0].name : null
    );

    const selectedAlgorithm: FbtAlgorithm | undefined = useMemo(
        () => fb.algorithms.find((alg) => alg.name === selectedName),
        [fb.algorithms, selectedName]
    );

    if (fb.algorithms.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No algorithms defined for this Basic Function Block.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-3">
            {/* Algorithms list */}
            <div className="md:w-64 w-full border border-border rounded bg-card flex flex-col max-h-64 md:max-h-none">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Algorithms</span>
                    <span className="text-[10px] text-muted-foreground">
                        {fb.algorithms.length}
                    </span>
                </div>
                <div className="flex-1 overflow-auto text-[11px]">
                    {fb.algorithms.map((alg) => {
                        const isActive = alg.name === selectedName;
                        const usedIn =
                            alg.usedInStates && alg.usedInStates.length > 0
                                ? alg.usedInStates.join(', ')
                                : null;
                        return (
                            <button
                                key={alg.name}
                                type="button"
                                onClick={() => setSelectedName(alg.name)}
                                className={`w-full text-left px-3 py-2 border-b border-border/40 hover:bg-accent/40 ${
                                    isActive ? 'bg-accent/60' : ''
                                }`}
                            >
                                <div className="text-xs font-semibold">{alg.name}</div>
                                {alg.comment && (
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        {alg.comment}
                                    </div>
                                )}
                                {usedIn && (
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Used in: {usedIn}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Algorithm body viewer */}
            <div className="flex-1 min-h-[200px] border border-border rounded bg-card flex flex-col">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                        {selectedAlgorithm ? selectedAlgorithm.name : 'Select an algorithm'}
                    </span>
                    {selectedAlgorithm && (
                        <span className="text-[10px] text-muted-foreground uppercase">
                            {selectedAlgorithm.language}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-[140px]">
                    {selectedAlgorithm ? (
                        <Editor
                            height="100%"
                            language={
                                selectedAlgorithm.language === 'ST'
                                    ? 'structured-text'
                                    : 'plaintext'
                            }
                            value={selectedAlgorithm.body}
                            onChange={() => {
                                // read-only – no-op
                            }}
                            options={{
                                ...defaultEditorOptions,
                                readOnly: true,
                                minimap: { enabled: false },
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            Select an algorithm from the list to view its body.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

