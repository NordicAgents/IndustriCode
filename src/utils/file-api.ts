const API_BASE = 'http://localhost:3002';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modified?: Date;
    children?: FileNode[];
    // When using the browser File System Access API, we attach the native handle here.
    handle?: any;
}

export interface FileSearchResult {
    path: string;
    name: string;
    matches: number;
}

export class FileSystemAPI {
    private static agentRootDir: string | null = null;

    /**
     * Fetch and cache the agent root directory from the backend.
     */
    private static async getAgentRootDir(): Promise<string | null> {
        if (this.agentRootDir) {
            return this.agentRootDir;
        }

        try {
            const response = await fetch(`${API_BASE}/api/config/root-dir`);
            if (!response.ok) {
                // Root not configured yet
                return null;
            }
            const data = await response.json();
            if (data && typeof data.rootDir === 'string') {
                this.agentRootDir = data.rootDir;
                return this.agentRootDir;
            }
        } catch (error) {
            console.error('[FileAPI] Failed to load agent root directory:', error);
        }

        return null;
    }

    /**
     * Resolve a potentially relative path against the agent root directory.
     * Absolute paths are returned unchanged.
     */
    private static async resolveAgentPath(path: string): Promise<string> {
        // If path looks absolute, just return it
        if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) {
            return path;
        }

        const root = await this.getAgentRootDir();
        if (!root) {
            // Fall back to the given path if root is not configured;
            // backend will enforce its own restrictions.
            return path;
        }

        // Simple join; backend will normalize and enforce boundaries.
        return `${root.replace(/[/\\]$/, '')}/${path.replace(/^[/\\]/, '')}`;
    }
    static async registerDirectory(path: string): Promise<void> {
        try {
            console.log('[FileAPI] Registering directory:', path);
            const response = await fetch(`${API_BASE}/api/files/register-directory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });

            console.log('[FileAPI] Register response:', response.status, response.statusText);

            if (!response.ok) {
                const error = await response.json();
                console.error('[FileAPI] Register error:', error);
                throw new Error(error.error || 'Failed to register directory');
            }

            console.log('[FileAPI] Directory registered successfully');
        } catch (error) {
            console.error('[FileAPI] Register directory exception:', error);
            throw error;
        }
    }

    static async listDirectory(path: string, maxDepth: number = 3): Promise<FileNode[]> {
        try {
            const resolvedPath = await this.resolveAgentPath(path);
            console.log('[FileAPI] Listing directory:', resolvedPath, 'maxDepth:', maxDepth);
            const response = await fetch(`${API_BASE}/api/files/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: resolvedPath, maxDepth }),
            });

            console.log('[FileAPI] List response:', response.status, response.statusText);

            if (!response.ok) {
                const error = await response.json();
                console.error('[FileAPI] List error:', error);
                throw new Error(error.error || 'Failed to list directory');
            }

            const data = await response.json();
            console.log('[FileAPI] Received files:', data.files?.length || 0, 'files');
            return data.files;
        } catch (error) {
            console.error('[FileAPI] List directory exception:', error);
            throw error;
        }
    }

    static async readFile(path: string): Promise<string> {
        const resolvedPath = await this.resolveAgentPath(path);
        const response = await fetch(`${API_BASE}/api/files/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: resolvedPath }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to read file');
        }

        const data = await response.json();
        return data.content;
    }

    static async writeFile(path: string, content: string): Promise<void> {
        const resolvedPath = await this.resolveAgentPath(path);
        const response = await fetch(`${API_BASE}/api/files/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: resolvedPath, content }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to write file');
        }
    }

    static async searchFiles(path: string, pattern: string): Promise<FileSearchResult[]> {
        const resolvedPath = await this.resolveAgentPath(path);
        const response = await fetch(`${API_BASE}/api/files/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: resolvedPath, pattern }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to search files');
        }

        const data = await response.json();
        return data.results;
    }

    static async createFile(path: string, content: string = ''): Promise<void> {
        const resolvedPath = await this.resolveAgentPath(path);
        const response = await fetch(`${API_BASE}/api/files/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: resolvedPath, content }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create file');
        }
    }

    static async deleteFile(path: string): Promise<void> {
        const resolvedPath = await this.resolveAgentPath(path);
        const response = await fetch(`${API_BASE}/api/files/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: resolvedPath }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete file');
        }
    }

    static async renameFile(oldPath: string, newPath: string): Promise<void> {
        const resolvedOldPath = await this.resolveAgentPath(oldPath);
        const resolvedNewPath = await this.resolveAgentPath(newPath);
        const response = await fetch(`${API_BASE}/api/files/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: resolvedOldPath, newPath: resolvedNewPath }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to rename file');
        }
    }

    static getFileLanguage(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'st': 'structured-text',
            'scl': 'structured-text',
            'il': 'instruction-list',
            'ld': 'ladder-logic',
            'fbd': 'function-block',
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'json': 'json',
            'xml': 'xml',
            'txt': 'plaintext',
        };
        return languageMap[ext || ''] || 'plaintext';
    }
}
