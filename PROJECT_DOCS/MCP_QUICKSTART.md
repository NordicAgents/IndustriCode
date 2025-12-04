# MCP Server Integration Quick Start

This guide helps you quickly get started with MCP (Model Context Protocol) server integration in the LLM Chat UI.

## What is MCP?

MCP (Model Context Protocol) allows LLMs to interact with external systems through "tools". For example, an MQTT MCP server provides tools to publish/subscribe to MQTT topics, while an OPC UA MCP server provides tools to read/write PLC data.

## Quick Setup (Using Included MCP Servers)

### 1. Configure Your MCP Servers

This project already includes ready-to-run MCP servers under the `MCPs/` folder (relative to your project root):
- `MCPs/MQTT-Project/mqtt-python` — **MQTT + Sparkplug B MCP server**
- `MCPs/OPCUA-Project/opcua-mcp-server` — **OPC UA MCP server**

You have three options to configure them in the UI:

**Option A: Import from File**
1. Click "Configure Servers" in the sidebar
2. Click "Import File"
3. Select `mcp-config-example.json` from this directory

**Option B: Import from JSON**
1. Click "Configure Servers"
2. Switch to "JSON Editor" mode
3. Paste the example configuration from `mcp-config-example.json`
4. Click "Apply JSON Configuration"

**Option C: Manual Form Entry (using bundled MQTT MCP)**
1. Click "Configure Servers"
2. Fill in the form:
   - **Server Name**: `MQTT MCP (Python)`
   - **Command**: `uv`
   - **Arguments** (one per line):
     ```
     --directory
     /absolute/path/to/your/project/MCPs/MQTT-Project/mqtt-python
     run
     mqtt-mcp
     ```
   - **Environment Variables**:
     ```json
     {
       "MQTT_BROKER_URL": "mqtt://127.0.0.1:1883",
       "MQTT_CLIENT_ID": "mqtt-mcp-cursor",
       "SPARKPLUG_GROUP_ID": "factory",
       "SPARKPLUG_EDGE_NODE_ID": "edge-node-1"
     }
     ```
3. (Optional) Add another server for OPC UA:
   - **Server Name**: `OPCUA MCP (Python)`
   - **Command**: `uv`
   - **Arguments** (one per line):
     ```
     --directory
     /absolute/path/to/your/project/MCPs/OPCUA-Project/opcua-mcp-server
     run
     opcua-mcp-server.py
     ```
   - **Environment Variables**:
     ```json
     {
       "OPCUA_SERVER_URL": "opc.tcp://localhost:4840"
     }
     ```
4. Click "Add Server"

### 2. Start Your MCP Servers

**Important**: This UI runs in the browser and cannot spawn server processes automatically. You must start your MCP servers manually.

For MQTT MCP server (Python, using bundled project):
```bash
# (optional) start the MQTT mock broker first
cd /absolute/path/to/your/project/MCPs/MQTT-Project/mqtt-mock-server
uv sync
uv run mqtt-mock-server  # listens on mqtt://127.0.0.1:1883

# in a separate terminal, start the MCP server
cd /absolute/path/to/your/project/MCPs/MQTT-Project/mqtt-python
export MQTT_BROKER_URL=mqtt://127.0.0.1:1883
export MQTT_CLIENT_ID=mqtt-mcp-cursor
export SPARKPLUG_GROUP_ID=factory
export SPARKPLUG_EDGE_NODE_ID=edge-node-1
uv sync
uv run mqtt-mcp
```

For OPC UA MCP server (Python, using bundled project):
```bash
cd /absolute/path/to/your/project/MCPs/OPCUA-Project/opcua-mcp-server
export OPCUA_SERVER_URL=opc.tcp://localhost:4840
uv sync
uv run opcua-mcp-server.py
```

### 3. Connect in the UI

1. In the sidebar, expand "MCP Servers"
2. Click "Connect" next to your server
3. Wait for the status to turn green
4. Expand the server to view available tools

### 4. Use MCP Tools in Chat

Once connected, you can reference MCP capabilities in your chat:
- "List all available MCP tools"
- "Publish 'hello world' to MQTT topic 'test'"
- "Read the temperature value from OPC UA node ns=2;s=Temperature"

## Current Implementation Status

✅ **Implemented:**
- MCP server configuration UI (form & JSON)
- Import/Export Cursor-style configuration
- Server connection management
- Tool listing and display
- Persistent configuration storage

⏳ **Simulated (Mock) in UI:**
- The UI can still operate in a mock mode (no backend) if you don't start real servers
- Some example tool listings/responses may be mocked when no MCP server is connected

✅ **Real (when using `MCPs/` servers):**
- Actual MCP server communication via the Python MCP servers in `MCPs/`
- Real tool execution with live MQTT / OPC UA operations

🔜 **Future Enhancements:**
- Real MCP server communication via WebSocket/HTTP
- Backend service to spawn and manage MCP processes
- Actual tool execution with real results
- Tool call integration in LLM responses

## Troubleshooting

**Server won't connect:**
- Ensure the MCP server process is running
- Check that paths in configuration are correct
- Verify environment variables are set properly

**No tools showing:**
- Make sure the server status is "connected" (green)
- Click the expand arrow next to the server name
- Check browser console for errors

**Configuration not saving:**
- Check browser localStorage is enabled
- Try exporting and re-importing the configuration

## Example Configuration Format

The configuration follows Cursor IDE's format:

```json
{
  "mcpServers": {
    "Server Name": {
      "command": "executable_name",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

For more examples, see `mcp-config-example.json`.
