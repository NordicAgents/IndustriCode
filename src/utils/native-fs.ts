import type { FileNode } from './file-api';

// Simple feature detection for the File System Access API
export function supportsFileSystemAccess(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function buildTreeFromDirectoryHandle(
    dirHandle: any,
    parentPath: string,
    depth: number,
    maxDepth: number
): Promise<FileNode[]> {
    const nodes: FileNode[] = [];

    // Use async iteration over directory entries
    for await (const [name, handle] of dirHandle.entries()) {
        if (name.startsWith('.')) {
            continue;
        }

        const nodePath = parentPath ? `${parentPath}/${name}` : name;

        if (handle.kind === 'file') {
            const fileNode: FileNode = {
                name,
                path: nodePath,
                type: 'file',
                handle,
            };
            nodes.push(fileNode);
        } else if (handle.kind === 'directory') {
            const dirNode: FileNode = {
                name,
                path: nodePath,
                type: 'directory',
                handle,
            };

            if (depth < maxDepth) {
                dirNode.children = await buildTreeFromDirectoryHandle(
                    handle,
                    nodePath,
                    depth + 1,
                    maxDepth
                );
            }

            nodes.push(dirNode);
        }
    }

    return nodes;
}

export async function pickDirectoryAndBuildTree(maxDepth: number = 3): Promise<{
    rootHandle: any;
    rootPath: string;
    files: FileNode[];
}> {
    if (!supportsFileSystemAccess()) {
        throw new Error('File System Access API is not supported in this browser.');
    }

    const dirHandle = await (window as any).showDirectoryPicker();
    const rootPath = dirHandle.name || 'Folder';
    const files = await buildTreeFromDirectoryHandle(dirHandle, rootPath, 0, maxDepth);

    return { rootHandle: dirHandle, rootPath, files };
}

export async function refreshDirectoryFromHandle(
    rootHandle: any,
    rootPath: string,
    maxDepth: number = 3
): Promise<FileNode[]> {
    return buildTreeFromDirectoryHandle(rootHandle, rootPath, 0, maxDepth);
}

export async function readFileFromNode(node: FileNode): Promise<string> {
    if (node.type !== 'file' || !node.handle) {
        throw new Error('Cannot read: missing file handle.');
    }

    const fileHandle: any = node.handle;
    const file = await fileHandle.getFile();
    return file.text();
}

export async function writeFileWithHandle(handle: any, content: string): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
}

