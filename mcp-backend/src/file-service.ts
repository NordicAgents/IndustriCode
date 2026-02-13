import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chokidar, { FSWatcher } from 'chokidar';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileNode[];
}

export interface FileSearchResult {
  path: string;
  name: string;
  matches: number;
}

export class FileService {
  private allowedDirectories: Set<string> = new Set();
  private watchers: Map<string, FSWatcher> = new Map();

  /**
   * Register a directory as allowed for file operations
   */
  registerDirectory(dirPath: string): void {
    // Store absolute, normalized path for security‑sensitive comparisons
    const normalized = path.resolve(dirPath);
    this.allowedDirectories.add(normalized);
  }

  /**
   * Check if a path is within allowed directories
   */
  private isPathAllowed(filePath: string): boolean {
    const normalized = path.resolve(filePath);
    for (const allowedDir of this.allowedDirectories) {
      // Require either exact match or a sub‑path with a path separator
      if (normalized === allowedDir || normalized.startsWith(allowedDir + path.sep)) {
        return true;
      }
    }
    return false;
  }

  /**
   * List directory contents recursively
   */
  async listDirectory(dirPath: string, maxDepth: number = 3): Promise<FileNode[]> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: Directory not registered');
    }

    const buildTree = async (currentPath: string, depth: number = 0): Promise<FileNode> => {
      const stats = await fs.stat(currentPath);
      const name = path.basename(currentPath);

      const node: FileNode = {
        name,
        path: currentPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        modified: stats.mtime,
      };

      if (stats.isFile()) {
        node.size = stats.size;
      } else if (stats.isDirectory() && depth < maxDepth) {
        const entries = await fs.readdir(currentPath);
        const children = await Promise.all(
          entries
            .filter(entry => !entry.startsWith('.')) // Skip hidden files
            .map(async entry => {
              const childPath = path.join(currentPath, entry);
              try {
                return await buildTree(childPath, depth + 1);
              } catch {
                // Skip entries we cannot read (permissions, broken links, etc.)
                return null;
              }
            })
        );
        node.children = children.filter((c): c is FileNode => c !== null);
      }

      return node;
    };

    const rootNode = await buildTree(dirPath);
    return rootNode.children || [];
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: File not in allowed directory');
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: File not in allowed directory');
    }

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Search files by name pattern
   */
  async searchFiles(dirPath: string, pattern: string): Promise<FileSearchResult[]> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: Directory not registered');
    }

    const searchPattern = path.join(dirPath, '**', `*${pattern}*`);
    const matches = await glob(searchPattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    });

    return matches.map(match => ({
      path: match,
      name: path.basename(match),
      matches: 1, // Could be enhanced with content matching
    }));
  }

  /**
   * Watch directory for changes
   */
  watchDirectory(dirPath: string, callback: (event: string, path: string) => void): string {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: Directory not registered');
    }

    const watcherId = `watcher-${Date.now()}`;
    const watcher = chokidar.watch(dirPath, {
      ignored: /(^|[\/\\])\../, // Ignore hidden files
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('add', path => callback('add', path))
      .on('change', path => callback('change', path))
      .on('unlink', path => callback('unlink', path));

    this.watchers.set(watcherId, watcher);
    return watcherId;
  }

  /**
   * Stop watching a directory
   */
  async stopWatching(watcherId: string): Promise<void> {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(watcherId);
    }
  }

  /**
   * Create a new file
   */
  async createFile(filePath: string, content: string = ''): Promise<void> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: File not in allowed directory');
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: File not in allowed directory');
    }

    await fs.unlink(filePath);
  }

  /**
   * Rename a file
   */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    if (!this.isPathAllowed(oldPath) || !this.isPathAllowed(newPath)) {
      throw new Error('Access denied: File not in allowed directory');
    }

    await fs.rename(oldPath, newPath);
  }
}

export const fileService = new FileService();
