import { useState, useEffect } from 'react';
import { FileSystemAPI, FileNode } from '../utils/file-api';
import FileTree from './FileTree';
import { FolderOpen, Search, X, RefreshCw, Home } from 'lucide-react';
import {
    supportsFileSystemAccess,
    pickDirectoryAndBuildTree,
    refreshDirectoryFromHandle,
} from '../utils/native-fs';

interface FileExplorerProps {
    onFileSelect: (node: FileNode) => void;
    selectedPath?: string;
    onSendToChat?: (node: FileNode) => void;
    refreshTrigger?: number;
}

export default function FileExplorer({ onFileSelect, selectedPath, onSendToChat, refreshTrigger = 0 }: FileExplorerProps) {
    const [rootPath, setRootPath] = useState<string>('');
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FileNode[]>([]);
    const [useNativeFS, setUseNativeFS] = useState(false);
    const [rootHandle, setRootHandle] = useState<any | null>(null);

    const loadDirectory = async (path: string) => {
        console.log('[FileExplorer] Starting to load directory:', path);
        setLoading(true);
        setError(null);
        try {
            setUseNativeFS(false);
            setRootHandle(null);
            console.log('[FileExplorer] Step 1: Registering directory...');
            await FileSystemAPI.registerDirectory(path);
            console.log('[FileExplorer] Step 2: Listing directory...');
            const fileList = await FileSystemAPI.listDirectory(path);
            console.log('[FileExplorer] Step 3: Got files:', fileList);
            setFiles(fileList);
            setRootPath(path);
            // Save to localStorage
            localStorage.setItem('plc-ide-root-path', path);
            try {
                // Keep backend agent root directory in sync with the explorer root (backend mode)
                await FileSystemAPI.setAgentRootDir(path);
                console.log('[FileExplorer] Synced agent root directory to backend:', path);
            } catch (syncError) {
                console.error('[FileExplorer] Failed to sync agent root directory:', syncError);
            }
            console.log('[FileExplorer] Successfully loaded directory');
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to load directory';
            console.error('[FileExplorer] Error loading directory:', err);
            console.error('[FileExplorer] Error message:', errorMsg);
            setError(errorMsg);

            // Show helpful error message
            if (errorMsg.includes('ENOENT') || errorMsg.includes('not found')) {
                setError(`Directory not found. Please check the path and try again.`);
            } else if (errorMsg.includes('EACCES') || errorMsg.includes('permission')) {
                setError(`Permission denied. Try a directory you have access to.`);
            } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
                setError(`Cannot connect to backend server. Make sure it's running on port 3002.`);
            }
        } finally {
            setLoading(false);
            console.log('[FileExplorer] Loading complete');
        }
    };

    const handleOpenFolder = async () => {
        // Prefer the browser's native File System Access API when available
        if (supportsFileSystemAccess()) {
            try {
                setLoading(true);
                setError(null);
                console.log('[FileExplorer] Using native File System Access API');
                const { rootHandle: handle, rootPath: nativeRootPath, files } =
                    await pickDirectoryAndBuildTree(3);
                setUseNativeFS(true);
                setRootHandle(handle);
                setRootPath(nativeRootPath);
                setFiles(files);
                setSearchResults([]);
                // We cannot persist native handles in localStorage reliably
                localStorage.removeItem('plc-ide-root-path');
            } catch (err: any) {
                // User cancelling the picker is not an error we need to surface
                if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
                    console.warn('[FileExplorer] Directory picker cancelled by user');
                    return;
                }
                console.error('[FileExplorer] Native folder open error:', err);
                setError(err?.message || 'Failed to open folder');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Provide helpful examples based on OS
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const examplePath = isMac
            ? '/Users/yourusername/Documents/plc-projects'
            : 'C:\\Users\\yourusername\\Documents\\plc-projects';

        const defaultPath = isMac ? '/Users' : 'C:\\';

        const path = prompt(
            `Enter the absolute path to your PLC project directory:\n\nExample: ${examplePath}\n\nCommon locations:\n- Desktop\n- Documents\n- Any folder you have access to`,
            defaultPath
        );

        if (path) {
            loadDirectory(path.trim());
        }
    };

    const handleRefresh = async () => {
        if (useNativeFS && rootHandle && rootPath) {
            try {
                setLoading(true);
                setError(null);
                const refreshed = await refreshDirectoryFromHandle(rootHandle, rootPath, 3);
                setFiles(refreshed);
                setSearchResults([]);
            } catch (err: any) {
                console.error('[FileExplorer] Native refresh error:', err);
                setError(err?.message || 'Failed to refresh folder');
            } finally {
                setLoading(false);
            }
        } else if (rootPath) {
            loadDirectory(rootPath);
        }
    };

    const handleSearch = async () => {
        if (!rootPath || !searchQuery.trim()) return;

        try {
            if (useNativeFS) {
                // Client-side search over the in-memory tree when using native FS
                const query = searchQuery.toLowerCase();
                const matches: FileNode[] = [];

                const traverse = (nodes: FileNode[]) => {
                    for (const node of nodes) {
                        if (
                            node.type === 'file' &&
                            node.name.toLowerCase().includes(query)
                        ) {
                            matches.push(node);
                        }
                        if (node.children && node.children.length > 0) {
                            traverse(node.children);
                        }
                    }
                };

                traverse(files);
                setSearchResults(matches);
            } else {
                const results = await FileSystemAPI.searchFiles(rootPath, searchQuery);
                // Convert search results to FileNode format
                const searchNodes: FileNode[] = results.map((result) => ({
                    name: result.name,
                    path: result.path,
                    type: 'file' as const,
                }));
                setSearchResults(searchNodes);
            }
        } catch (err: any) {
            console.error('Search error:', err);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    // Load last opened directory on mount
    useEffect(() => {
        if (supportsFileSystemAccess()) {
            console.log(
                '[FileExplorer] Native File System Access available; waiting for user to pick a folder'
            );
            return;
        }

        const initBackendRoot = async () => {
            try {
                const agentRoot = await FileSystemAPI.getAgentRootDir();
                const lastPath = localStorage.getItem('plc-ide-root-path');

                // Prefer backend-configured agent root, then last opened path.
                const pathToLoad = agentRoot || lastPath;

                if (!pathToLoad) {
                    console.log('[FileExplorer] No agent root or last path; waiting for user to open a folder');
                    return;
                }

                console.log('[FileExplorer] useEffect - Loading path via backend:', pathToLoad);
                loadDirectory(pathToLoad);
            } catch (err) {
                console.error('[FileExplorer] Failed to initialize from backend agent root:', err);
            }
        };

        void initBackendRoot();
    }, []);

    // Auto-refresh when trigger changes
    useEffect(() => {
        if (refreshTrigger > 0) {
            handleRefresh();
        }
    }, [refreshTrigger]);

    const displayFiles = searchResults.length > 0 ? searchResults : files;

    return (
        <div className="h-full flex flex-col bg-background border-r border-border">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Explorer</h3>
                    <div className="flex gap-1">
                        <button
                            onClick={handleRefresh}
                            disabled={!rootPath || loading}
                            className="btn-icon-sm"
                            title="Refresh"
                        >
                            <RefreshCw className={`icon-xs ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleOpenFolder}
                            className="btn-icon-sm"
                            title="Open Folder"
                        >
                            <FolderOpen className="icon-xs" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <div className="relative flex items-center">
                        <Search className="icon-xs absolute left-2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search files..."
                            disabled={!rootPath}
                            className="w-full pl-7 pr-7 py-1 text-xs border border-border rounded bg-input focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-1 p-0.5 hover:bg-accent rounded"
                            >
                                <X className="icon-xs text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Current Path */}
            {rootPath && (
                <div className="px-3 py-1.5 text-xs bg-muted/30 border-b border-border flex items-center gap-1">
                    <Home className="icon-xs text-muted-foreground" />
                    <span className="truncate text-muted-foreground" title={rootPath}>
                        {rootPath}
                    </span>
                </div>
            )}

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        <RefreshCw className="icon-sm animate-spin mr-2" />
                        Loading...
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        {error}
                    </div>
                )}

                {!loading && !error && !rootPath && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <FolderOpen className="icon-xl text-muted-foreground mb-3 opacity-50" />
                        <p className="text-sm font-medium mb-1">No Folder Open</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            Open a folder to start working with PLC files
                        </p>
                        <button onClick={handleOpenFolder} className="btn btn-sm btn-primary">
                            <FolderOpen className="icon-xs mr-1" />
                            Open Folder
                        </button>
                    </div>
                )}

                {!loading && !error && rootPath && displayFiles.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                        {searchResults.length === 0 && searchQuery
                            ? 'No files found matching search'
                            : 'No files in this directory'}
                    </div>
                )}

                {!loading && !error && displayFiles.length > 0 && (
                    <>
                        {searchResults.length > 0 && (
                            <div className="px-2 py-1 mb-2 text-xs text-muted-foreground">
                                Search Results ({searchResults.length})
                            </div>
                        )}
                        <FileTree
                            nodes={displayFiles}
                            onFileClick={onFileSelect}
                            selectedPath={selectedPath}
                            onSendToChat={onSendToChat}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
