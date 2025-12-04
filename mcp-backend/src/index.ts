import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MCPWebSocketServer } from './websocket-server.js';
import { fileService } from './file-service.js';

const PORT = 3002;
const WS_PORT = 3003;
const AGENT_ROOT_ENV_KEY = 'AGENT_ROOT_DIR';

// Load environment variables from .env in the mcp-backend directory
dotenv.config();

/**
 * Persist the agent root directory to a local .env file and process.env
 */
function persistAgentRootDir(rootDir: string) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        let content = '';

        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf-8');
        }

        const lines = content
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);

        let found = false;
        const updatedLines = lines.map((line) => {
            if (line.startsWith(`${AGENT_ROOT_ENV_KEY}=`)) {
                found = true;
                return `${AGENT_ROOT_ENV_KEY}=${rootDir}`;
            }
            return line;
        });

        if (!found) {
            updatedLines.push(`${AGENT_ROOT_ENV_KEY}=${rootDir}`);
        }

        fs.writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf-8');

        // Also update the in‑process environment so new requests see it immediately
        process.env[AGENT_ROOT_ENV_KEY] = rootDir;
        console.log(`[CONFIG] Agent root directory set to: ${rootDir}`);
    } catch (error) {
        console.error('[CONFIG] Failed to persist agent root directory:', error);
    }
}

/**
 * Initialize agent root directory from environment if available
 */
function initializeAgentRootDir() {
    const root = process.env[AGENT_ROOT_ENV_KEY];
    if (root) {
        const resolved = path.resolve(root);
        fileService.registerDirectory(resolved);
        console.log(`[CONFIG] Loaded agent root directory from env: ${resolved}`);
    } else {
        console.log('[CONFIG] No agent root directory configured yet');
    }
}

// Start Express server for health checks / static files if needed
const app = express();
app.use(cors());
app.use(express.json());

// Initialize file service with env-configured root directory (if present)
initializeAgentRootDir();

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mcp-backend' });
});

// Config endpoints for agent root directory
app.get('/api/config/root-dir', (req, res) => {
    const root = process.env[AGENT_ROOT_ENV_KEY];
    if (!root) {
        return res
            .status(404)
            .json({ error: 'Agent root directory not configured' });
    }
    res.json({ rootDir: root });
});

app.post('/api/config/root-dir', async (req, res) => {
    try {
        const { path: dirPath } = req.body as { path?: string };
        if (!dirPath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const resolved = path.resolve(dirPath);
        let stats;
        try {
            stats = fs.statSync(resolved);
        } catch {
            return res
                .status(400)
                .json({ error: 'Provided path does not exist' });
        }

        if (!stats.isDirectory()) {
            return res
                .status(400)
                .json({ error: 'Provided path is not a directory' });
        }

        fileService.registerDirectory(resolved);
        persistAgentRootDir(resolved);

        res.json({ success: true, rootDir: resolved });
    } catch (error: any) {
        console.error('[CONFIG] Failed to set agent root directory:', error);
        res.status(500).json({ error: error.message });
    }
});

// File System API Endpoints
app.post('/api/files/register-directory', async (req, res) => {
    try {
        const { path: dirPath } = req.body as { path?: string };
        if (!dirPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        const resolved = path.resolve(dirPath);
        fileService.registerDirectory(resolved);

        // If no agent root is configured yet, treat the first registered directory as root.
        if (!process.env[AGENT_ROOT_ENV_KEY]) {
            persistAgentRootDir(resolved);
        }

        res.json({ success: true, message: 'Directory registered', path: resolved });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/list', async (req, res) => {
    try {
        const { path, maxDepth = 3 } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        const files = await fileService.listDirectory(path, maxDepth);
        res.json({ files });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/read', async (req, res) => {
    try {
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        const content = await fileService.readFile(path);
        res.json({ content });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/write', async (req, res) => {
    try {
        const { path, content } = req.body;
        if (!path || content === undefined) {
            return res.status(400).json({ error: 'Path and content are required' });
        }
        await fileService.writeFile(path, content);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/search', async (req, res) => {
    try {
        const { path, pattern } = req.body;
        if (!path || !pattern) {
            return res.status(400).json({ error: 'Path and pattern are required' });
        }
        const results = await fileService.searchFiles(path, pattern);
        res.json({ results });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/create', async (req, res) => {
    try {
        const { path, content = '' } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        await fileService.createFile(path, content);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/delete', async (req, res) => {
    try {
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        await fileService.deleteFile(path);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/rename', async (req, res) => {
    try {
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) {
            return res.status(400).json({ error: 'oldPath and newPath are required' });
        }
        await fileService.renameFile(oldPath, newPath);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[HTTP] Server running on http://localhost:${PORT}`);
});

// Start WebSocket server
new MCPWebSocketServer(WS_PORT);
