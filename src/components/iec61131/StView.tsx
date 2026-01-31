import Editor, { OnMount } from '@monaco-editor/react';
import { defaultEditorOptions } from '../../utils/monaco-config';

interface StViewProps {
    code: string;
    onEditorMount?: OnMount;
    height?: string;
}

export default function StView({ code, onEditorMount, height = '260px' }: StViewProps) {
    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <Editor
                height={height}
                language="structured-text"
                value={code}
                onMount={onEditorMount}
                options={{
                    ...defaultEditorOptions,
                    readOnly: true,
                    minimap: { enabled: false },
                }}
                theme="plc-theme"
            />
        </div>
    );
}
