import { useEffect, useMemo, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { parseFbtBasicFb } from '../../utils/fbt-parser';
import { FbtBasicFb } from '../../types/fbt-types';
import { defaultEditorOptions } from '../../utils/monaco-config';
import FbtInterfaceTab from './FbtInterfaceTab';
import FbtEccTab from './FbtEccTab';
import FbtAlgorithmsTab from './FbtAlgorithmsTab';

type FbtViewTab = 'interface' | 'ecc' | 'algorithms' | 'raw';

interface FbtBasicFbViewProps {
    content: string;
    path: string;
    language: string;
    onContentChange: (value: string) => void;
    onEditorMount?: OnMount;
}

export default function FbtBasicFbView({
    content,
    path,
    language,
    onContentChange,
    onEditorMount,
}: FbtBasicFbViewProps) {
    const [activeTab, setActiveTab] = useState<FbtViewTab>('interface');
    const [parseFailed, setParseFailed] = useState(false);

    const parsedFb: FbtBasicFb | null = useMemo(() => {
        const fb = parseFbtBasicFb(content);
        setParseFailed(!fb);
        return fb;
    }, [content]);

    useEffect(() => {
        if (parseFailed) {
            setActiveTab('raw');
        }
    }, [parseFailed]);

    const fileName = path.split(/[\\/]/).pop() || path;

    const handleRawChange = (value: string | undefined) => {
        if (value !== undefined) {
            onContentChange(value);
        }
    };

    const tabs: { id: FbtViewTab; label: string }[] = [
        { id: 'interface', label: 'Interface' },
        { id: 'ecc', label: 'ECC' },
        { id: 'algorithms', label: 'Algorithms' },
        { id: 'raw', label: 'Raw XML' },
    ];

    const canShowStructured = !!parsedFb;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground truncate">{path}</div>
                    <div className="text-sm font-semibold truncate">
                        {parsedFb?.name || fileName}
                    </div>
                </div>
                {parsedFb && (
                    <div className="text-right text-[10px] text-muted-foreground">
                        {parsedFb.namespace && (
                            <div className="truncate">Namespace: {parsedFb.namespace}</div>
                        )}
                        <div className="truncate">
                            {parsedFb.version && <>v{parsedFb.version}</>}
                            {parsedFb.author && (
                                <>
                                    {' '}
                                    · {parsedFb.author}
                                </>
                            )}
                            {parsedFb.date && (
                                <>
                                    {' '}
                                    · {parsedFb.date}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sub tabs */}
            <div className="px-3 py-1.5 border-b border-border flex gap-2 text-xs bg-muted/40">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const disabled =
                        !canShowStructured && tab.id !== 'raw';
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                if (!disabled) {
                                    setActiveTab(tab.id);
                                }
                            }}
                            className={`px-2 py-1 rounded border text-xs ${
                                isActive
                                    ? 'bg-background border-border'
                                    : 'bg-muted/60 border-border/60 hover:bg-muted'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 p-3">
                {!canShowStructured && activeTab !== 'raw' && (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                        <div className="mb-2 font-semibold">
                            Structured view is only available for Basic Function Blocks.
                        </div>
                        <div className="mb-2 max-w-md text-center">
                            This `.fbt` file could not be parsed as a BasicFB or uses a
                            different FB type. You can still inspect and edit the raw XML.
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab('raw')}
                            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Switch to Raw XML
                        </button>
                    </div>
                )}

                {canShowStructured && parsedFb && activeTab === 'interface' && (
                    <FbtInterfaceTab fb={parsedFb} />
                )}

                {canShowStructured && parsedFb && activeTab === 'ecc' && (
                    <FbtEccTab fb={parsedFb} />
                )}

                {canShowStructured && parsedFb && activeTab === 'algorithms' && (
                    <FbtAlgorithmsTab fb={parsedFb} />
                )}

                {activeTab === 'raw' && (
                    <div className="h-full">
                        <Editor
                            height="100%"
                            language={language || 'xml'}
                            value={content}
                            onChange={handleRawChange}
                            onMount={onEditorMount}
                            options={defaultEditorOptions}
                            theme="plc-theme"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

