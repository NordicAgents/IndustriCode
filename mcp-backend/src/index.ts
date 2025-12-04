import express from 'express';
import cors from 'cors';
import { MCPWebSocketServer } from './websocket-server.js';
import { fileService } from './file-service.js';

const PORT = 3002;
const WS_PORT = 3003;

// Start Express server for health checks / static files if needed
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mcp-backend' });
});

// File System API Endpoints
app.post('/api/files/register-directory', async (req, res) => {
    try {
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        fileService.registerDirectory(path);
        res.json({ success: true, message: 'Directory registered' });
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
