import { useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import {
    registerPLCLanguages,
    getEditorTheme,
    defaultEditorOptions,
} from '../utils/monaco-config';
import { Save, X, FileText, Circle } from 'lucide-react';
import { EditorTab } from '../types/ide-types';
import FbtBasicFbView from './fbt/FbtBasicFbView';
import PlcopenProjectView from './plcopen/PlcopenProjectView';
import { PlcopenProject } from '../types/plcopen-types';

interface CodeEditorProps {
    tabs: EditorTab[];
    activeTabId: string | null;
    onTabChange: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onContentChange: (tabId: string, content: string) => void;
    onSave: (tabId: string) => void;
    isDark?: boolean;
    plcopenProjects?: Record<string, PlcopenProject>;
    onPlcopenParsed?: (tabId: string, project: PlcopenProject | null) => void;
}

export default function CodeEditor({
    tabs,
    activeTabId,
    onTabChange,
    onTabClose,
    onContentChange,
    onSave,
    isDark = false,
    plcopenProjects,
    onPlcopenParsed,
}: CodeEditorProps) {
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(
        null
    );
    const [languagesRegistered, setLanguagesRegistered] = useState(false);

    const activeTab = tabs.find((t) => t.id === activeTabId);
    const isFbtFile =
        activeTab && activeTab.name.toLowerCase().endsWith('.fbt');
    const isPlcopenFile =
        activeTab &&
        activeTab.name.toLowerCase().endsWith('.xml') &&
        !isFbtFile;
    const cachedPlcopenProject = activeTabId
        ? plcopenProjects?.[activeTabId]
        : undefined;

    // Register PLC languages once
    useEffect(() => {
        if (!languagesRegistered) {
            try {
                registerPLCLanguages();
                setLanguagesRegistered(true);
            } catch (error) {
                console.error('Failed to register PLC languages:', error);
            }
        }
    }, [languagesRegistered]);

    // Handle editor mount
    const handleEditorMount: OnMount = (editor, monaco) => {
        setEditorInstance(editor);

        // Set custom theme
        monaco.editor.defineTheme('plc-theme', getEditorTheme(isDark));
        monaco.editor.setTheme('plc-theme');

        // Add keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (activeTabId) {
                onSave(activeTabId);
            }
        });
    };

    // Update theme when dark mode changes
    useEffect(() => {
        if (editorInstance) {
            const monaco = (window as any).monaco;
            if (monaco) {
                monaco.editor.defineTheme('plc-theme', getEditorTheme(isDark));
                monaco.editor.setTheme('plc-theme');
            }
        }
    }, [isDark, editorInstance]);

    // Handle content changes
    const handleContentChange = (value: string | undefined) => {
        if (activeTabId && value !== undefined) {
            onContentChange(activeTabId, value);
        }
    };

    const handleSaveClick = () => {
        if (activeTabId) {
            onSave(activeTabId);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Tabs Bar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border overflow-x-auto">
                {tabs.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                        <FileText className="icon-xs" />
                        <span>No file open</span>
                    </div>
                ) : (
                    tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer group text-xs ${tab.id === activeTabId
                                    ? 'bg-background border-t border-l border-r border-border'
                                    : 'bg-muted/50 hover:bg-muted'
                                }`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            <FileText className="icon-xs flex-shrink-0" />
                            <span className="max-w-[120px] truncate">{tab.name}</span>
                            {tab.modified && (
                                <Circle className="icon-xs fill-primary text-primary flex-shrink-0" />
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                }}
                                className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-0.5"
                            >
                                <X className="icon-xs" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Editor or Empty State */}
            <div className="flex-1 relative">
                {!activeTab ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <FileText className="icon-2xl text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No File Open</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Select a file from the explorer to open it in the editor.
                        </p>
                    </div>
                ) : (
                    <>
                        {isFbtFile ? (
                            <FbtBasicFbView
                                content={activeTab.content}
                                path={activeTab.path}
                                language={activeTab.language || 'xml'}
                                onContentChange={(value) => handleContentChange(value)}
                                onEditorMount={handleEditorMount}
                            />
                        ) : isPlcopenFile ? (
                            <PlcopenProjectView
                                content={activeTab.content}
                                path={activeTab.path}
                                language={activeTab.language || 'xml'}
                                project={cachedPlcopenProject}
                                onContentChange={(value) => handleContentChange(value)}
                                onEditorMount={handleEditorMount}
                                onParsed={(project) => {
                                    if (activeTabId) {
                                        onPlcopenParsed?.(activeTabId, project);
                                    }
                                }}
                            />
                        ) : (
                            <Editor
                                height="100%"
                                language={activeTab.language || 'plaintext'}
                                value={activeTab.content}
                                onChange={handleContentChange}
                                onMount={handleEditorMount}
                                options={defaultEditorOptions}
                                theme="plc-theme"
                            />
                        )}

                        {/* Save Indicator */}
                        {activeTab.modified && (
                            <div className="absolute top-2 right-2">
                                <button
                                    onClick={handleSaveClick}
                                    className="btn btn-sm btn-primary shadow-lg"
                                    title="Save (Ctrl/Cmd + S)"
                                >
                                    <Save className="icon-xs mr-1" />
                                    Save
                                </button>
                            </div>
                        )}

                        {/* Status Bar */}
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1 bg-muted/80 backdrop-blur-sm border-t border-border text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                    {activeTab.language || 'plaintext'}
                                </span>
                                <span className="text-muted-foreground">
                                    {activeTab.content.split('\n').length} lines
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeTab.modified && (
                                    <span className="text-primary font-medium">● Modified</span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
