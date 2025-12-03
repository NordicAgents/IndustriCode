import { useState } from 'react';
import { FileNode } from '../utils/file-api';
import {
    ChevronRight,
    ChevronDown,
    File,
    Folder,
    FolderOpen,
    FileCode,
    FileJson,
    FileText,
    MessageCircle,
} from 'lucide-react';

interface FileTreeProps {
    nodes: FileNode[];
    onFileClick: (node: FileNode) => void;
    selectedPath?: string;
    level?: number;
    onSendToChat?: (node: FileNode) => void;
}

function getFileIcon(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'json') return FileJson;
    if (['st', 'scl', 'il', 'ld', 'fbd', 'js', 'ts', 'py'].includes(ext || '')) return FileCode;
    if (ext === 'txt') return FileText;
    return File;
}

export default function FileTree({
    nodes,
    onFileClick,
    selectedPath,
    level = 0,
    onSendToChat,
}: FileTreeProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleExpand = (path: string) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpanded(newExpanded);
    };

    const handleNodeClick = (node: FileNode) => {
        if (node.type === 'directory') {
            toggleExpand(node.path);
        } else {
            onFileClick(node);
        }
    };

    const sortedNodes = [...nodes].sort((a, b) => {
        // Directories first, then alphabetically
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="select-none">
            {sortedNodes.map((node) => {
                const isExpanded = expanded.has(node.path);
                const isSelected = selectedPath === node.path;
                const isDirectory = node.type === 'directory';
                const FileIcon = isDirectory
                    ? isExpanded
                        ? FolderOpen
                        : Folder
                    : getFileIcon(node.name);

                return (
                    <div key={node.path}>
                        <div
                            className={`group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent/50 rounded ${isSelected ? 'bg-accent text-accent-foreground' : ''
                                }`}
                            style={{ paddingLeft: `${level * 12 + 8}px` }}
                            onClick={() => handleNodeClick(node)}
                            draggable={true}
                            onDragStart={(e) => {
                                // Set the file node data to transfer
                                e.dataTransfer.effectAllowed = 'copy';
                                e.dataTransfer.setData('application/file-node', JSON.stringify({
                                    name: node.name,
                                    path: node.path,
                                    type: node.type,
                                }));

                                // Store handle globally for retrieval on drop (since handles aren't serializable)
                                if (node.handle) {
                                    (window as any).__draggedFileHandle = node.handle;
                                } else {
                                    (window as any).__draggedFileHandle = null;
                                }

                                // Add visual feedback
                                e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                                // Reset visual feedback
                                e.currentTarget.style.opacity = '1';
                            }}
                        >
                            {isDirectory && (
                                <span className="flex-shrink-0">
                                    {isExpanded ? (
                                        <ChevronDown className="icon-xs text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="icon-xs text-muted-foreground" />
                                    )}
                                </span>
                            )}
                            {!isDirectory && <span className="w-4 flex-shrink-0" />}
                            <FileIcon
                                className={`icon-sm flex-shrink-0 ${isDirectory ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                            />
                            <span className="flex-1 text-sm truncate">{node.name}</span>
                            {onSendToChat && (
                                <button
                                    className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent"
                                    title="Send to chat"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSendToChat(node);
                                    }}
                                >
                                    <MessageCircle className="icon-xs text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        {isDirectory && isExpanded && node.children && node.children.length > 0 && (
                            <FileTree
                                nodes={node.children}
                                onFileClick={onFileClick}
                                selectedPath={selectedPath}
                                level={level + 1}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
