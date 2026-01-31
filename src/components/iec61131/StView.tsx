import Editor, { OnMount } from '@monaco-editor/react';
import { defaultEditorOptions } from '../../utils/monaco-config';

interface StViewProps {
    items: Array<{
        pouName: string;
        code: string;
    }>;
    onEditorMount?: OnMount;
}

export default function StView({ items, onEditorMount }: StViewProps) {
    if (items.length === 0) {
        return <div className="text-xs text-muted-foreground">No structured text bodies found.</div>;
    }

    const readOnlyOptions = {
        ...defaultEditorOptions,
        readOnly: true,
        minimap: { enabled: false },
        lineNumbersMinChars: 3,
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
        },
    };

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div key={item.pouName} className="border border-border rounded p-3">
                    <div className="text-sm font-semibold mb-2">{item.pouName}</div>
                    <div className="h-64 border border-border rounded overflow-hidden">
                        <Editor
                            height="100%"
                            language="structured-text"
                            value={item.code}
                            onMount={onEditorMount}
                            options={readOnlyOptions}
                            theme="plc-theme"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
