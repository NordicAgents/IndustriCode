import { useEffect, useMemo, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { PlcopenProject } from '../../types/plcopen-types';
import { parsePlcopenProject } from '../../utils/plcopen-parser';
import { defaultEditorOptions } from '../../utils/monaco-config';

type PlcopenViewTab = 'overview' | 'pous' | 'resources' | 'raw';

interface PlcopenProjectViewProps {
    content: string;
    path: string;
    language: string;
    project?: PlcopenProject | null;
    onContentChange: (value: string) => void;
    onEditorMount?: OnMount;
    onParsed?: (project: PlcopenProject | null) => void;
}

export default function PlcopenProjectView({
    content,
    path,
    language,
    project,
    onContentChange,
    onEditorMount,
    onParsed,
}: PlcopenProjectViewProps) {
    const [activeTab, setActiveTab] = useState<PlcopenViewTab>('overview');
    const [parseFailed, setParseFailed] = useState(false);

    const parsedProject = useMemo(() => {
        if (project) {
            setParseFailed(false);
            return project;
        }
        const parsed = parsePlcopenProject(content);
        setParseFailed(!parsed);
        return parsed;
    }, [content, project]);

    useEffect(() => {
        onParsed?.(parsedProject || null);
    }, [parsedProject, onParsed]);

    useEffect(() => {
        if (parseFailed) {
            setActiveTab('raw');
        }
    }, [parseFailed]);

    const fileName = path.split(/[\\/]/).pop() || path;
    const canShowStructured = !!parsedProject;

    const tabs: { id: PlcopenViewTab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'pous', label: 'POUs' },
        { id: 'resources', label: 'Resources' },
        { id: 'raw', label: 'Raw XML' },
    ];

    const handleRawChange = (value: string | undefined) => {
        if (value !== undefined) {
            onContentChange(value);
        }
    };

    const pouSummary = useMemo(() => {
        if (!parsedProject) return null;
        const programs = parsedProject.pous.filter((pou) => pou.pouType === 'program').length;
        const functionBlocks = parsedProject.pous.filter((pou) => pou.pouType === 'functionBlock')
            .length;
        const functions = parsedProject.pous.filter((pou) => pou.pouType === 'function').length;
        return { programs, functionBlocks, functions };
    }, [parsedProject]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground truncate">{path}</div>
                    <div className="text-sm font-semibold truncate">
                        {parsedProject?.name || fileName}
                    </div>
                </div>
                {parsedProject && (
                    <div className="text-right text-[10px] text-muted-foreground">
                        {parsedProject.companyName && (
                            <div className="truncate">{parsedProject.companyName}</div>
                        )}
                        <div className="truncate">
                            {parsedProject.productName}
                            {parsedProject.productVersion && (
                                <>
                                    {' '}
                                    · v{parsedProject.productVersion}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="px-3 py-1.5 border-b border-border flex gap-2 text-xs bg-muted/40">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const disabled = !canShowStructured && tab.id !== 'raw';
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                if (!disabled) setActiveTab(tab.id);
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

            <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                {!canShowStructured && activeTab !== 'raw' && (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                        <div className="mb-2 font-semibold">
                            Structured view is only available for PLCopen projects.
                        </div>
                        <div className="mb-2 max-w-md text-center">
                            This XML file does not appear to be a PLCopen project. You can still
                            inspect and edit the raw XML.
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

                {canShowStructured && parsedProject && activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 border border-border rounded bg-muted/30">
                            <div className="text-sm font-semibold mb-2">Project Summary</div>
                            <div className="space-y-1 text-muted-foreground">
                                <div>Name: {parsedProject.name || fileName}</div>
                                {parsedProject.companyName && (
                                    <div>Company: {parsedProject.companyName}</div>
                                )}
                                {parsedProject.productName && (
                                    <div>Product: {parsedProject.productName}</div>
                                )}
                                {parsedProject.productVersion && (
                                    <div>Version: {parsedProject.productVersion}</div>
                                )}
                            </div>
                        </div>
                        <div className="p-3 border border-border rounded bg-muted/30">
                            <div className="text-sm font-semibold mb-2">POU Breakdown</div>
                            <div className="space-y-1 text-muted-foreground">
                                <div>Total POUs: {parsedProject.pous.length}</div>
                                <div>Programs: {pouSummary?.programs ?? 0}</div>
                                <div>Function Blocks: {pouSummary?.functionBlocks ?? 0}</div>
                                <div>Functions: {pouSummary?.functions ?? 0}</div>
                            </div>
                        </div>
                        <div className="p-3 border border-border rounded bg-muted/30">
                            <div className="text-sm font-semibold mb-2">Resources</div>
                            <div className="space-y-1 text-muted-foreground">
                                <div>Configurations: {parsedProject.configurations.length}</div>
                                <div>
                                    Resources:{' '}
                                    {parsedProject.configurations.reduce(
                                        (count, config) => count + config.resources.length,
                                        0
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {canShowStructured && parsedProject && activeTab === 'pous' && (
                    <div className="space-y-3 text-xs">
                        {parsedProject.pous.map((pou) => (
                            <div key={pou.name} className="border border-border rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-sm">{pou.name}</div>
                                    <div className="text-muted-foreground uppercase text-[10px]">
                                        {pou.pouType}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
                                    <div>Inputs: {pou.interface.inputs.length}</div>
                                    <div>Outputs: {pou.interface.outputs.length}</div>
                                    <div>In/Out: {pou.interface.inOuts.length}</div>
                                    <div>Locals: {pou.interface.locals.length}</div>
                                </div>
                                <div className="mt-2 text-muted-foreground">
                                    Bodies:
                                    {pou.body.st && <span className="ml-2">ST</span>}
                                    {pou.body.ldNetworks.length > 0 && <span className="ml-2">LD</span>}
                                    {pou.body.fbdNetworks.length > 0 && (
                                        <span className="ml-2">FBD</span>
                                    )}
                                    {pou.body.sfc && <span className="ml-2">SFC</span>}
                                </div>
                            </div>
                        ))}
                        {parsedProject.pous.length === 0 && (
                            <div className="text-muted-foreground">No POUs found.</div>
                        )}
                    </div>
                )}

                {canShowStructured && parsedProject && activeTab === 'resources' && (
                    <div className="space-y-3 text-xs">
                        {parsedProject.configurations.map((config) => (
                            <div key={config.name} className="border border-border rounded p-3">
                                <div className="font-semibold text-sm mb-2">{config.name}</div>
                                <div className="space-y-2 text-muted-foreground">
                                    {config.resources.map((resource) => (
                                        <div key={resource.name} className="border border-border rounded p-2">
                                            <div className="font-medium">{resource.name}</div>
                                            <div className="mt-1">
                                                Tasks: {resource.tasks.length}
                                            </div>
                                            <div className="mt-1">
                                                Instances: {resource.instances.length}
                                            </div>
                                        </div>
                                    ))}
                                    {config.resources.length === 0 && (
                                        <div>No resources configured.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {parsedProject.configurations.length === 0 && (
                            <div className="text-muted-foreground">
                                No configurations/resources found.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'raw' && (
                    <div className="h-full min-h-[200px]">
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
