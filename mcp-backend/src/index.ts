import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MCPWebSocketServer } from './websocket-server.js';
import { fileService } from './file-service.js';
import { applyPatchOperations } from './apply-patch-service.js';

const PORT = 3002;
const WS_PORT = 3003;
const AGENT_ROOT_ENV_KEY = 'AGENT_ROOT_DIR';

// Load environment variables from .env in the mcp-backend directory
dotenv.config();

const CONFIG_PATH = path.resolve(process.cwd(), '..', 'config.json');

function loadAppConfig(): any {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return {};
        }
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        if (!raw.trim()) {
            return {};
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error('[CONFIG] Failed to load config.json:', error);
        return {};
    }
}

function saveAppConfig(config: any) {
    try {
        const content = JSON.stringify(config ?? {}, null, 4);
        fs.writeFileSync(CONFIG_PATH, content + '\n', 'utf-8');
    } catch (error) {
        console.error('[CONFIG] Failed to save config.json:', error);
    }
}

/**
 * Persist the agent root directory to config.json and process.env
 */
function persistAgentRootDir(rootDir: string) {
    try {
        const resolved = path.resolve(rootDir);
        const config = loadAppConfig();
        config[AGENT_ROOT_ENV_KEY] = resolved;
        saveAppConfig(config);

        // Also update the in‑process environment so new requests see it immediately
        process.env[AGENT_ROOT_ENV_KEY] = resolved;
        console.log(`[CONFIG] Agent root directory set to: ${resolved}`);
    } catch (error) {
        console.error('[CONFIG] Failed to persist agent root directory:', error);
    }
}

/**
 * Initialize agent root directory from environment/config if available
 */
function initializeAgentRootDir() {
    const config = loadAppConfig();
    const configRoot = typeof config[AGENT_ROOT_ENV_KEY] === 'string'
        ? config[AGENT_ROOT_ENV_KEY]
        : undefined;

    // If env is set, prefer it and optionally sync back into config
    const envRoot = process.env[AGENT_ROOT_ENV_KEY];
    let effectiveRoot = envRoot || configRoot;

    if (envRoot && envRoot !== configRoot) {
        try {
            const resolvedEnvRoot = path.resolve(envRoot);
            const nextConfig = { ...config, [AGENT_ROOT_ENV_KEY]: resolvedEnvRoot };
            saveAppConfig(nextConfig);
            effectiveRoot = resolvedEnvRoot;
        } catch (error) {
            console.error('[CONFIG] Failed to sync env AGENT_ROOT_DIR into config.json:', error);
        }
    }

    if (effectiveRoot) {
        const resolved = path.resolve(effectiveRoot);
        fileService.registerDirectory(resolved);
        process.env[AGENT_ROOT_ENV_KEY] = resolved;
        console.log(`[CONFIG] Agent root directory initialized: ${resolved}`);
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

app.post('/api/files/apply-patch', async (req, res) => {
    try {
        const { operations } = req.body as { operations?: any[] };

        if (!Array.isArray(operations) || operations.length === 0) {
            return res
                .status(400)
                .json({ error: 'operations must be a non-empty array' });
        }

        const result = await applyPatchOperations(operations as any);

        const summaryLines = result.map((item) => {
            const prefix = item.status === 'completed' ? '✓' : '✗';
            const base = `${prefix} ${item.type} ${item.path}`;
            return item.message ? `${base} — ${item.message}` : base;
        });

        res.json({
            summary: summaryLines.join('\n'),
            items: result,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/web-search', async (req, res) => {
    try {
        const { query, maxResults = 5 } = req.body as { query?: string; maxResults?: number };
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }

        const endpoint = process.env.WEB_SEARCH_ENDPOINT;
        const apiKey = process.env.WEB_SEARCH_API_KEY;

        if (!endpoint || !apiKey) {
            return res.status(500).json({
                error: 'Web search is not configured. Set WEB_SEARCH_ENDPOINT and WEB_SEARCH_API_KEY in the mcp-backend environment.',
            });
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query,
                maxResults,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return res
                .status(502)
                .json({ error: text || `Upstream web search error (${response.status})` });
        }

        const data = await response.json();
        res.json({ results: data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[HTTP] Server running on http://localhost:${PORT}`);
});

// Start WebSocket server
new MCPWebSocketServer(WS_PORT);
