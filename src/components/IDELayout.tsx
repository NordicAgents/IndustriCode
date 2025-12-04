import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface IDELayoutProps {
    fileExplorer: ReactNode;
    codeEditor: ReactNode;
    chatPanel: ReactNode;
}

export default function IDELayout({ fileExplorer, codeEditor, chatPanel }: IDELayoutProps) {
    return (
        <div className="h-full w-full overflow-hidden">
            <PanelGroup direction="horizontal">
                {/* File Explorer - Left Panel */}
                <Panel
                    id="explorer"
                    defaultSize={20}
                    minSize={15}
                    maxSize={35}
                    className="bg-background"
                >
                    {fileExplorer}
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

                {/* Code Editor - Center Panel */}
                <Panel
                    id="editor"
                    defaultSize={50}
                    minSize={30}
                    className="bg-background"
                >
                    {codeEditor}
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

                {/* Chat Panel - Right Panel */}
                <Panel
                    id="chat"
                    defaultSize={30}
                    minSize={25}
                    maxSize={50}
                    className="bg-background"
                >
                    {chatPanel}
                </Panel>
            </PanelGroup>
        </div>
    );
}
