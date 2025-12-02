# GraphDB MCP Server Setup Guide

This guide explains how to integrate GraphDB's Model Context Protocol (MCP) server with the MCP Manager UI.

## Overview

GraphDB provides an MCP server that exposes semantic database tools for AI agents. The server enables:
- **SPARQL Queries**: Execute SELECT, CONSTRUCT, or DESCRIBE queries against RDF data
- **Full-text Search**: Query GraphDB using full-text search and retrieve RDF triples
- **IRI Discovery**: Discover IRIs based on full-text search label matches
- **Retrieval Search**: Full-text search optimized for summarization and memory operations
- **Autocomplete Discovery**: Use GraphDB's autocomplete index to find relevant IRIs
- **Similarity Search**: Find conceptually related entities using text similarity
- **Schema Extraction**: Extract ontology schemas for building structured queries
- **Repository Listing**: Get information about available GraphDB repositories

## Prerequisites

1. **GraphDB Instance**: A running GraphDB instance (default: `http://localhost:7200`)
   - Download from: https://www.ontotext.com/products/graphdb/
   - Or use GraphDB Cloud

2. **graphdb-mcphub-gateway**: The gateway bridges stdio (used by MCP clients) and SSE/HTTP (used by GraphDB)
   ```bash
   npm install -g graphdb-mcphub-gateway
   ```

3. **Node.js**: Required for running the gateway (v18 or higher)

## Installation

### Step 1: Install the Gateway

Install the GraphDB MCP gateway globally:

```bash
npm install -g graphdb-mcphub-gateway
```

### Step 2: Configure GraphDB Access

The gateway connects to GraphDB's MCP server endpoint. Configure the connection based on your setup:

#### Option A: Open GraphDB Instance (No Authentication)

If your GraphDB instance allows free access with READ permissions:

```bash
# Default endpoint: http://localhost:7200/mcp
# No additional configuration needed
```

#### Option B: Secured GraphDB Instance (With Authentication)

For secured GraphDB instances, set environment variables:

```bash
# Custom GraphDB endpoint
export MCPHUB_SERVER_URL=https://your-graphdb-instance.com/mcp

# Authorization token (Bearer token or API key)
export MCPHUB_AUTHORIZATION_HEADER="Bearer YOUR_TOKEN_HERE"
```

> **Note**: You can add these to your shell profile (`~/.zshrc` or `~/.bashrc`) to persist across sessions.

### Step 3: Add to MCP Manager Configuration

In the MCP Manager UI:

1. Click **"Configure Servers"** in the sidebar
2. Add a new server or import the configuration below

**For Open GraphDB Instance:**

```json
{
  "mcpServers": {
    "GraphDB": {
      "command": "mcphub-gateway",
      "args": [],
      "env": {
        "MCPHUB_SERVER_URL": "http://localhost:7200/mcp"
      }
    }
  }
}
```

**For Secured GraphDB Instance:**

```json
{
  "mcpServers": {
    "GraphDB (Secured)": {
      "command": "mcphub-gateway",
      "args": [],
      "env": {
        "MCPHUB_SERVER_URL": "https://your-graphdb-instance.com/mcp",
        "MCPHUB_AUTHORIZATION_HEADER": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### Step 4: Connect to GraphDB

1. In the MCP Manager UI sidebar, find your GraphDB server entry
2. Click **"Connect"** 
3. The server should show a green connected indicator
4. Expand the server to see available tools

## Available Tools

Once connected, GraphDB exposes these tools to AI agents:

| Tool Name | Description |
|-----------|-------------|
| `list_repositories` | List available GraphDB repositories |
| `sparql_query` | Execute SPARQL queries (SELECT, CONSTRUCT, DESCRIBE) |
| `full_text_search` | Query using full-text search, returns RDF subgraph |
| `iri_discovery` | Discover IRIs based on label matches |
| `retrieval_search` | Full-text search optimized for summarization |
| `autocomplete_iri` | Autocomplete-based IRI discovery |
| `similarity_search` | Find related entities using text similarity |
| `extract_schema` | Extract ontology schemas |

## Usage in Chat

With GraphDB connected, you can ask your AI assistant to interact with the knowledge graph:

**Example Prompts:**

- "List all repositories in GraphDB"
- "Search for entities related to 'climate change' in the knowledge graph"
- "Execute this SPARQL query: SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
- "Find IRIs that match 'Einstein'"
- "Extract the ontology schema from the current repository"

The AI will automatically use the appropriate GraphDB tools to answer your questions.

## Troubleshooting

### Gateway Not Found

**Error:** `command: graphdb-mcphub-gateway: command not found`

**Solution:** Ensure the gateway is installed globally:
```bash
npm install -g graphdb-mcphub-gateway
which graphdb-mcphub-gateway  # Should show the installation path
```

### Connection Failed

**Error:** Server status shows "error" or fails to connect

**Solutions:**
1. Verify GraphDB is running: `curl http://localhost:7200/protocol`
2. Check the GraphDB endpoint URL is correct
3. For secured instances, verify your authorization token is valid
4. Check GraphDB logs for authentication/access errors

### No Tools Showing

**Error:** Server connects but no tools are listed

**Solutions:**
1. Ensure you have at least READ permissions on a GraphDB repository
2. Check GraphDB MCP server is enabled (it's enabled by default in GraphDB 11.1+)
3. Verify the repository exists and is accessible

### Authorization Issues

**Error:** 401 Unauthorized or 403 Forbidden

**Solutions:**
1. Verify `MCPHUB_AUTHORIZATION_HEADER` is set correctly
2. Check if the token has expired
3. Ensure the user/API key has sufficient permissions in GraphDB
4. For GraphDB Cloud, use the correct API key format

## Advanced Configuration

### Custom Repository

To target a specific GraphDB repository, you can configure it when calling tools through the chat interface. The repository selection is typically handled in the tool arguments.

### Multiple GraphDB Instances

You can configure multiple GraphDB servers simultaneously:

```json
{
  "mcpServers": {
    "GraphDB Local": {
      "command": "mcphub-gateway",
      "args": [],
      "env": {
        "MCPHUB_SERVER_URL": "http://localhost:7200/mcp"
      }
    },
    "GraphDB Production": {
      "command": "mcphub-gateway",
      "args": [],
      "env": {
        "MCPHUB_SERVER_URL": "https://prod.example.com/mcp",
        "MCPHUB_AUTHORIZATION_HEADER": "Bearer PROD_TOKEN"
      }
    }
  }
}
```

## References

- **GraphDB MCP Gateway**: https://github.com/Ontotext-AD/graphdb-mcphub-gateway
- **GraphDB Documentation**: https://graphdb.ontotext.com/documentation/11.1/using-graphdb-llm-tools-with-external-clients.html
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **GraphDB Download**: https://www.ontotext.com/products/graphdb/

## Support

For issues specific to:
- **GraphDB MCP Server**: Check GraphDB documentation or contact Ontotext support
- **graphdb-mcphub-gateway**: Report issues at https://github.com/Ontotext-AD/graphdb-mcphub-gateway/issues
- **MCP Manager UI**: Report issues in this repository
