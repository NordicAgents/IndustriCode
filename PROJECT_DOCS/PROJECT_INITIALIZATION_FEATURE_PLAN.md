# Project Initialization Docs Feature – Implementation Plan

This document describes how to add a **project initialization feature** that, for the current PLC skills project, creates a `docs` folder under the **agent root directory** (e.g. `TASK_DOCS/FESTO_DS_skills`) and populates it with structured markdown files that help the LLM understand the project:

- `docs/Readme.md` – Human‑oriented overview of the PLC project.
- `docs/ProjectStructure.md` – Folder architecture and key assets.
- `docs/FunctionBlockInfo.md` – IEC 61499 function block / HMI overview.
- `docs/SkillInfo.md` – Atomic vs composite skill descriptions.
- `docs/MCP_Info.md` – Overview of configured/connected MCP servers (GraphDB, OPC UA, MQTT, etc.).

The initialization should be started from the UI via a **single button**, using the **currently selected model and backend** in Agent mode, and rely on existing local tools (`list_directory`, `read_file`, `create_file`, etc.) plus MCP tools where helpful.

---

## 1. Scope & Goals

- **In scope (first iteration)**
  - Support a **single project root** driven by `AGENT_ROOT_DIR` in `config.json` (already wired through `mcp-backend` and `FileSystemAPI`).
  - Create a `docs` subfolder under the agent root if it does not exist.
  - Generate the five markdown files listed above, tailored to the existing FESTO skills project:
    - Use the **IEC 61499** folder (`<AGENT_ROOT_DIR>/IEC61499`) as the primary source for FBs/skills.
    - Use the **HMI** folder (`<AGENT_ROOT_DIR>/HMI`) for UI / HMI details.
    - Use `mcp-config.json` (repo root) and runtime MCP connections for `MCP_Info.md`.
  - Drive the generation via the LLM in **Agent** mode, using **local tools** and MCP tools:
    - `list_directory`, `read_file`, `create_file`, optionally `replace_in_file` / `apply_patch`.
  - Provide a **visible button in the UI** to trigger initialization using the **selected model** (OpenAI / Gemini / Anthropic / Ollama) and backend (cloud vs local).

- **Out of scope (first iteration)**
  - Multi‑project management or per‑subfolder docs (one `docs` folder per agent root only).
  - Continuous regeneration / live maintenance of docs as the project changes.
  - Rich visualizations (diagrams) in docs beyond what markdown tables and lists can express.
  - Deep static parsing of `.fbt` beyond what the LLM can infer from reading selected files (we rely on tools + prompting rather than a dedicated parser in this feature).

---

## 2. Current Implementation Overview (Relevant Parts)

### 2.1 Agent root & project structure

- File: `config.json`
  - Holds `AGENT_ROOT_DIR`, currently set to:
    ```json
    {
        "AGENT_ROOT_DIR": "/Users/mx/Documents/melwin-repos/phd_task_llm_chat-/TASK_DOCS/FESTO_DS_skills"
    }
    ```
  - This path is treated as the **project root** for the IDE and agent.

- File: `mcp-backend/src/index.ts`
  - Uses `loadAppConfig()` and `saveAppConfig()` to read/write repo‑root `config.json`.
  - `initializeAgentRootDir()`:
    - Reads `AGENT_ROOT_DIR` from config/env.
    - Registers it with `fileService.registerDirectory(resolvedRoot)`.
  - `persistAgentRootDir(rootDir)`:
    - Normalizes the path, writes it to `config.json` under `AGENT_ROOT_DIR`, and updates `process.env.AGENT_ROOT_DIR`.
  - `GET /api/config/root-dir` / `POST /api/config/root-dir` expose and update the agent root directory to/from the frontend.

- File: `mcp-backend/src/file-service.ts`
  - `FileService` enforces allowed directories:
    - All file operations (`listDirectory`, `readFile`, `writeFile`, `createFile`, `searchFiles`, etc.) only work inside registered roots (including the agent root).
  - `createFile(path, content)` ensures the parent directory exists (`fs.mkdir(..., { recursive: true })`), so writing into `docs/...` is safe as long as the path is under the agent root.

- FESTO skills project structure (under `TASK_DOCS/FESTO_DS_skills`)
  - `IEC61499/` – Function blocks, skills and CAT/OPC UA mapping files.
  - `HMI/` – HMI canvas definitions, C# code‑behind and related assets.
  - `HwConfiguration/`, `Topology/`, `AssetLinkData/`, etc. – Additional project assets useful for high‑level documentation.

### 2.2 Frontend file access & explorer

- File: `src/utils/file-api.ts`
  - `FileSystemAPI.getAgentRootDir()`:
    - Calls `GET /api/config/root-dir` and caches `rootDir` in a static field.
  - `resolveAgentPath(path)`:
    - Absolute paths are used as‑is.
    - Relative paths are resolved against the cached agent root.
  - `listDirectory`, `readFile`, `writeFile`, `createFile`, `searchFiles`, etc. all go through `resolveAgentPath`.

- File: `src/components/FileExplorer.tsx`
  - `loadDirectory(path)`:
    - Calls `FileSystemAPI.registerDirectory(path)` and then `FileSystemAPI.listDirectory(path)`.
    - Persists the chosen path in `localStorage` (`plc-ide-root-path`) and syncs the backend agent root via `FileSystemAPI.setAgentRootDir(path)`.
  - Shows the **current root path** in a header row.
  - Does not yet have any notion of “initialize project docs”.

### 2.3 LLM agent, tools & chat

- File: `src/utils/llm.ts`
  - Local tools (`BASE_LOCAL_TOOLS`):
    - `create_file`, `read_file`, `list_directory`, `replace_in_file`, `web_search`.
  - `APPLY_PATCH_TOOL`:
    - Local tool for multi‑file patch operations (`apply_patch` endpoint).
  - `LOCAL_TOOLS = [...BASE_LOCAL_TOOLS, APPLY_PATCH_TOOL]`.
  - `getAgentConfigForMode(mode)`:
    - `agent` → `allowWrites: true`, `allowLocalTools: true`, higher iteration limits.
    - `ask` / `plan` → `allowWrites: false`.
  - `getAllMCPTools(mode, options)`:
    - Collects tools from connected MCP servers.
    - Always includes `BASE_LOCAL_TOOLS`.
    - Adds `APPLY_PATCH_TOOL` only when:
      - `options.applyPatchEnabled` is true **and**
      - Provider is OpenAI with model `gpt-5.1` **and**
      - mode is `agent`.
  - `getAgentRootPrompt()`:
    - Uses `FileSystemAPI.getAgentRootDir()` to inject a system message like:
      > You are working inside the project root directory: <root>.
  - `callCloudLLM(...)` / `callOllama(...)`:
    - Build per‑provider requests and call a shared `runAgentLoop(...)`.
  - `runAgentLoop(...)`:
    - Implements a ReAct‑style loop:
      - Calls the LLM.
      - Executes any requested tools (`executeToolCall`), including local tools (file ops) and MCP tools, respecting `AgentConfig`.
      - Feeds tool results back into the history as assistant messages.
      - Repeats until a final answer or iteration limits are hit.

- File: `src/App.tsx`
  - Manages global state:
    - Chat messages, sessions, backend selection, cloud/Ollama configs, `chatMode`, `webSearchEnabled`, `applyPatchEnabled`, etc.
    - MCP servers configuration and connections.
    - IDE tabs (`EditorTab[]`) and file saving.
  - `handleSendMessage(content: string)`:
    - Creates a `ChatMessage` for the user.
    - Calls `callCloudLLM` or `callOllama` depending on `chatBackend`, passing:
      - `messages` history.
      - `chatMode` (Ask/Plan/Agent).
      - `webSearchEnabled`, `applyPatchEnabled`, etc.
    - Appends the assistant’s response (including any executed `toolCalls`) to `messages`.
  - Provides `ChatPanel` with handlers and state via props.

- File: `src/components/ChatPanel.tsx`
  - Header:
    - Shows `mode` (Ask / Plan / Agent), backend selection (cloud vs Ollama), model selection, theme toggles, web search toggle, apply_patch toggle.
    - Includes a `New chat` button.
  - Messages area:
    - Renders messages and any `toolCalls` (with a Zap icon and tool name/server).
  - Input area:
    - Attaches dropped files, builds prompt text, and calls `onSendMessage(finalMessage)`.
  - No dedicated UI element yet for “Initialize Project Docs”.

### 2.4 MCP configuration

- File: `mcp-config.json`
  - Defines MCP servers:
    - `GraphDB` → `mcphub-gateway` with `MCPHUB_SERVER_URL`.
    - `MQTT MCP (Python)` → `uv ... mqtt-mcp` with MQTT and Sparkplug env vars.
    - `OPCUA MCP (Python)` → `uv ... opcua-mcp-server.py` with `OPCUA_SERVER_URL`.
  - `src/utils/mcp-storage.ts` loads this config into the frontend and feeds `mcpClientManager`, which then discovers tools per server.

---

## 3. Target User Experience

### 3.1 High‑level flow

- User opens the FESTO project folder in the File Explorer (or it is auto‑loaded from `AGENT_ROOT_DIR`).
- User configures the LLM backend (OpenAI/Gemini/Anthropic/Ollama) and model in the Chat panel.
- User clicks **“Initialize Project Docs”** in the UI.
- The app:
  - Confirms or sets **Agent mode** (since writes are required).
  - Starts an **agent run** that:
    - Uses local tools to inspect the project structure.
    - Reads representative `.fbt` and HMI files.
    - Reads `mcp-config.json`.
    - Creates/overwrites markdown files under `<AGENT_ROOT_DIR>/docs`.
  - Streams the agent’s reasoning and tool calls as normal chat messages (so the user can audit what it did).
- After completion:
  - The File Explorer auto‑refreshes and shows the new `docs` folder and files.
  - The user can open `Readme.md`, `ProjectStructure.md`, etc. in the Code Editor.

### 3.2 UI placement of the button

- Add a new small button in the **ChatPanel header**, near the “New chat” button:
  - Label: `Init project docs` (or similar).
  - Icon: e.g. a `FileText` or `Sparkles` icon from `lucide-react`.
  - Tooltip: “Generate docs/Readme.md, ProjectStructure.md, FunctionBlockInfo.md, SkillInfo.md, MCP_Info.md for the current project (Agent mode, uses tools).”
  - Disabled state:
    - When no agent root directory is known (`FileSystemAPI.getAgentRootDir()` returns null).
    - When the chat backend is not configured (e.g. no API key / model selected).
  - Visual feedback:
    - While the agent run is executing, show a spinner or “Initializing…” state and disable the button.

### 3.3 Mode and safety behavior

- The initialization always runs in **Agent mode** semantics, regardless of the current Ask/Plan/Agent toggle:
  - We can either:
    - Explicitly set `chatMode` to `'agent'` when the button is clicked; or
    - Use a separate agent call with `mode: 'agent'` without changing the toggle (preferred to avoid surprising the user).
- Before starting:
  - If the current `chatMode` is not `'agent'`, show a confirmation or inline note:
    > Project initialization uses Agent mode to create files under docs/. Continue?
- The agent is constrained to the workspace via existing tooling:
  - Relative paths in tools are resolved against `AGENT_ROOT_DIR`.
  - Local tools (`create_file`, `list_directory`, etc.) are only allowed under the registered root.

---

## 4. Docs Content Specification

This section defines what each generated markdown file should contain, so prompts and implementation can be aligned.

### 4.1 `docs/Readme.md`

- Purpose: high‑level overview of the **FESTO DS skills project** from the perspective of an LLM or human maintainer.
- Recommended sections:
  - `# Project Overview`
    - Short description of the FESTO DS skills demo:
      - What hardware is involved (e.g. feeder, pusher, transfer modules).
      - What the IEC 61499 skills represent (BasicSKILL, skGoToLeft, skTransfer, etc.).
      - Relationship between PLC logic, skills, and HMI.
  - `## Key Components`
    - `IEC61499/` – Function blocks, skills, system configuration.
    - `HMI/` – WinCC / C# canvas definitions and skill UIs.
    - `HwConfiguration/` – Hardware configuration (IO, devices).
    - `AssetLinkData/`, `Topology/` – Asset and topology data.
  - `## Skills Concept`
    - Explain the notion of **BasicSKILL** and higher‑level skills built on top (skPick, skTransfer, skGoToLeft/Right, etc.).
  - `## How This Docs Folder Is Used`
    - Explain that other LLM agents will read these docs as a starting point to understand the project.
    - Encourage further updates by humans when the project changes.

### 4.2 `docs/ProjectStructure.md`

- Purpose: provide a **compact but informative tree view** of the project directories and the most important files.
- Recommended sections:
  - `# Project Structure`
  - `## Root Layout`
    - A tree view (markdown code block or bullet list) of key directories under `AGENT_ROOT_DIR`, e.g.:
      ```text
      FESTO_DS_skills/
        IEC61499/
          BasicSKILL/
          skGoToLeft/
          skTransfer/
          ...
        HMI/
          BasicSKILL/
          skGoToLeft/
          ...
        HwConfiguration/
        AssetLinkData/
        Topology/
      ```
    - For each top‑level folder, a one‑sentence description.
  - `## IEC 61499 Substructure`
    - Section summarizing:
      - `IEC61499/BasicSKILL` – generic skill FBs (`BasicSKILL.fbt`, `BasicSKILL_HMI.fbt`, etc.).
      - Skill subfolders (`skGoToLeft`, `skGoToRight`, `skTransfer`, `skPick`, etc.).
      - `IEC61499/System`, `Model`, `Configuration`, `SnapshotCompiles`, etc.
  - `## HMI Substructure`
    - Describe HMI canvases and code‑behind structure.
  - `## Other Notable Assets`
    - Hardware config, topology, asset link data.

Implementation note:
- The agent should primarily rely on `list_directory` calls with small `maxDepth` and then summarize rather than dumping entire listings into the docs.

### 4.3 `docs/FunctionBlockInfo.md`

- Purpose: give a **catalog of IEC 61499 function blocks and related assets**, with emphasis on:
  - Basic FBs.
  - Composite FBs.
  - “CAT”/OPC UA companion files.
  - HMI‑related FBs and UI artifacts.

- Target sources:
  - All `.fbt` files under `<AGENT_ROOT_DIR>/IEC61499` (possibly limited in depth to avoid token issues, with sampling if needed).
  - `*_CAT.offline.xml` / `*_CAT.opcua.xml` or similar CAT files under IEC61499.
  - Corresponding HMI files (e.g. `<AGENT_ROOT_DIR>/HMI/BasicSKILL`, `HMI/skGoToLeft`, `HMI/SKILL`, etc.).

- Recommended structure:
  - `# Function Block Overview`
  - `## Basic Function Blocks`
    - Table with columns:
      - `Name` (e.g. `SKILL_BFB`, any `FBType` with `<BasicFB>` or “Basic Function Block” comment).
      - `Category` (e.g. motion, IO handling, ECC engine, etc. – inferred).
      - `Key Inputs / Outputs` (events, key data variables).
      - `Used In Skills` (list of skills that reference this FB, if known).
  - `## Composite Function Blocks`
    - Composite FBs like `BasicSKILL`, `skGoToLeft`, `skTransfer`, etc. that have `<FBNetwork>` but no `<BasicFB>` body (or comment “Composite Function Block Type”).
    - For each, capture:
      - Summary description.
      - Important internal FBs (especially ones with names like `Skill_Commands`, `REG`, `Logic`, etc.).
      - External interfaces (events and data variables).
  - `## CAT / OPC UA Mapping`
    - For each `*_CAT.offline.xml` or `*_CAT.opcua.xml`:
      - Skill or FB it belongs to (by filename).
      - High‑level description: how it maps FB data/commands to OPC UA nodes.
  - `## HMI‑Related FBs and Links`
    - HMI FBs like `BasicSKILL_HMI.fbt`, `skTransfer_HMI.fbt`, etc.
    - Link them to:
      - Their associated skill/composite FBs.
      - HMI canvas files (.cnv, .cs) under `HMI`.

Implementation notes:
- The agent can:
  - Use `list_directory` on `IEC61499` and `HMI` to discover `.fbt` and CAT files.
  - Use `read_file` on representative `.fbt` files to infer Basic vs Composite types.
  - Use filename patterns (`*_HMI.fbt`, `*_CAT.*.xml`) to connect FBs, skills and mappings.
- To keep token usage under control:
  - The prompt should instruct the agent to **sample** representative files where patterns are repetitive, and to avoid pasting full XML bodies into docs.

### 4.4 `docs/SkillInfo.md`

- Purpose: provide a **skills‑centric view** of the project, focusing on atomic vs composite skills and their relation to BasicSKILL and HMI.

- Skill detection heuristics:
  - Any FB or folder that:
    - Lives under `IEC61499/BasicSKILL` or `IEC61499/SKILL`, or
    - Has an FB network that includes `BasicSKILL`, `SKILL_BFB`, or similar types, or
    - Has a name starting with `sk` (e.g. `skGoToLeft`, `skTransfer`, `skPick`, `skPlace`, etc.),
  - is considered part of the **skill library**.

- Classification:
  - **Atomic skills**:
    - Typically Basic FBs (with a `BasicFB` ECC) or single‑FB wrappers with a simple interface.
    - Provide a direct mapping from “skill commands” to IO or motion primitives.
  - **Composite skills**:
    - Composite FBs that orchestrate multiple FBs, often including `BasicSKILL` and other auxiliary FBs (register, gating, merging events).
    - Example: `skGoToLeft.fbt` which uses `BasicSKILL`, `RegisterSkill`, `SkillGoToLeft` internal logic, etc.

- Recommended structure:
  - `# Skills Overview`
  - `## Atomic Skills`
    - List each atomic skill with:
      - Name, classification (atomic).
      - Key inputs/outputs.
      - High‑level description of behavior (INIT/EXECUTE/RESET/etc.).
  - `## Composite Skills`
    - For each composite skill:
      - Name, classification (composite).
      - Which atomic/BASIC skills it composes.
      - Relevant CAT/OPC UA mappings (referenced files).
      - Linked HMI artifacts (HMI canvases and FBs sharing the same base name).
  - `## Skill Lifecycle / State Machine`
    - Brief description of the generic skill lifecycle as implemented by `BasicSKILL` and `SKILL_BFB`:
      - INIT → STARTING → EXECUTE → COMPLETING / STOPPING / ABORTING, etc.
    - This helps the LLM reason about the semantics of skills without reading every ECC.

Implementation notes:
- The agent can:
  - Use `list_directory` over `IEC61499` subfolders like `BasicSKILL`, `SKILL`, `sk*` directories.
  - Use `read_file` on key `.fbt` files (e.g. `BasicSKILL.fbt`, `skGoToLeft.fbt`, `skTransfer.fbt`) to identify skill roles and interfaces.
  - Use heuristic filename matching to link skills with HMI and CAT files.

### 4.5 `docs/MCP_Info.md`

- Purpose: provide a **rich, cross‑linked reference** describing:
  - All **MCP servers** configured for the project (GraphDB, OPC UA, MQTT, etc.).
  - **Runtime‑level details** fetched via MCP tools (SPARQL results, OPC UA NodeIds, topics).
  - How each MCP is **connected to PLC code and skills** (IEC 61499 FBs, skills, CAT files).
  - This document is a **key input for future agents** and should be as concrete and machine‑useful as possible.

- Primary static data sources:
  - `mcp-config.json` at the repo root.
    - For each entry under `mcpServers`:
      - `name`, `command`, `args`, `env`.
      - Look especially for:
        - `GraphDB` (GraphDB / ontology backend).
        - `MQTT MCP (Python)` (MQTT / Sparkplug).
        - `OPCUA MCP (Python)` (OPC UA connectivity).
  - IEC 61499 / PLC files under `<AGENT_ROOT_DIR>/IEC61499`:
    - Skills and FBs that are mapped to external systems via CAT/OPC UA or MQTT.
  - HMI and configuration folders that reference external systems.

- Runtime data via MCP tools (when servers are connected during initialization):
  - **GraphDB MCP**
    - Use the GraphDB MCP tools (e.g. `sparql_query`, `graph_query`, or similarly named tools exposed by the GraphDB server) to:
      - Execute SPARQL queries that reveal:
        - Available ontologies / namespaces.
        - Key classes and properties related to PLC skills, devices, and IO.
        - Example individuals (instances) that correspond to concrete skills, equipment or tags.
      - Summarize:
        - Which ontologies are loaded (URIs, prefixes).
        - How skills and hardware are represented (classes, relationships).
        - Any graph patterns that mirror IEC 61499 or skill structures (e.g. “Skill”, “Device”, “Transition” nodes).
    - Include in the doc:
      - A short list of **representative SPARQL queries** run and a **natural‑language summary** of their results (not full result tables).
      - Where possible, cross‑references to specific skills or FBs, e.g.:
        - “Ontology class `Skill` corresponds to IEC 61499 skills such as `skGoToLeft`, `skTransfer`.”
  - **OPC UA MCP**
    - Use OPC UA MCP tools (e.g. browse / read tools exposed by the OPC UA server) to:
      - Browse relevant NodeIds under the configured root (from `OPCUA_SERVER_URL`).
      - Identify NodeIds that correspond to:
        - Skill states (e.g. CURRENT_STATE).
        - Commands / events (e.g. START, STOP, RESET).
        - IO points used by key IEC 61499 FBs / skills.
      - Summarize:
        - For each important skill or FB, the associated OPC UA NodeIds and browse paths.
    - Include in the doc:
      - Tables that map **PLC concepts to OPC UA NodeIds**, e.g.:
        - `Skill name` → `Variable / event` → `OPC UA NodeId` → `Browse path`.
      - Any notable OPC UA namespaces and how they relate to PLC tags.
  - **MQTT MCP**
    - Use MQTT MCP tools (if available) to:
      - List or infer relevant topics and payload structures.
      - Map topics to skills, states, or alarms where possible.
    - Include:
      - Broker URL and Sparkplug identifiers.
      - Topic patterns linked to specific PLC skills or states.

- Recommended structure:
  - `# MCP Integration Overview`
  - `## MCP Servers Summary`
    - Table of all configured MCPs with:
      - Name, type (GraphDB / OPC UA / MQTT / other), command, key env vars.
  - `## GraphDB`
    - Configuration summary (`MCPHUB_SERVER_URL` and related env).
    - Ontology overview:
      - List of key ontologies/prefixes (from SPARQL).
      - Description of how skills, devices, and IO are modeled.
    - Example SPARQL queries and summarized results.
    - Links to related PLC skills / FBs (by name).
  - `## OPC UA MCP`
    - Configuration summary (`OPCUA_SERVER_URL`).
    - NodeId mapping tables:
      - For each major skill or FB:
        - Events/variables ↔ NodeIds ↔ browse paths.
      - Any higher‑level structures (e.g. folder hierarchy for skills, devices).
    - Relationship to CAT/OPC UA files under `IEC61499`.
  - `## MQTT MCP`
    - Configuration summary (`MQTT_BROKER_URL`, `MQTT_CLIENT_ID`, Sparkplug fields).
    - Topics and payloads linked to PLC skills/events where known.
  - `## PLC–MCP Mapping`
    - A cross‑reference section tying everything together:
      - Skills / FBs ↔ GraphDB ontologies ↔ OPC UA NodeIds ↔ MQTT topics.
      - This should act as a **central lookup table** for future agents.
  - `## Other MCPs`
    - Any additional MCP entries discovered in `mcp-config.json` (with whatever details can be inferred or fetched via tools).

Implementation notes:
- The agent should:
  - **Read `mcp-config.json`** via `read_file` (using an absolute or relative path from the agent root) and parse it as JSON in‑prompt.
  - For each configured MCP:
    - Use the **MCP tool list** (as exposed to the model) to detect capabilities:
      - For GraphDB: prefer tools that accept SPARQL queries and return JSON/RDF results.
      - For OPC UA: prefer browse/read tools that expose NodeIds, namespaces, and attributes.
      - For MQTT: prefer tools that show topics, publish/subscribe capabilities, or Sparkplug status.
  - When GraphDB or OPC UA MCPs are **connected and tools are available**, always:
    - Execute at least a **small set of SPARQL queries** (GraphDB) and **browse operations** (OPC UA) to gather concrete details for `MCP_Info.md`.
    - Reflect any errors (e.g. connection failures) in the doc with a short explanation instead of failing the whole run.
  - Build the **PLC–MCP mapping section** by:
    - Combining:
      - IEC 61499 skill / FB names and interfaces (`FunctionBlockInfo.md` / `SkillInfo.md` content).
      - GraphDB ontology entities and relationships from SPARQL.
      - OPC UA NodeIds and MQTT topics discovered via tools.
    - Presenting them in tables and concise descriptions that can be easily consumed by downstream agents.
- If MCP servers are not connected or tools are unavailable:
  - `MCP_Info.md` should still be generated using configuration‑only information from `mcp-config.json`, clearly stating that runtime queries were not executed.

---

## 5. Orchestration & Agent Prompt Design

### 5.1 Orchestration strategy

- Implement initialization as a **dedicated agent run**:
  - Triggered by a new handler in `App.tsx`, e.g. `handleInitializeProjectDocs()`.
  - Uses the **same backend/model configuration** as the Chat panel:
    - `chatBackend` (cloud vs Ollama).
    - `cloudLLMConfig` / `ollamaConfig`.
  - Always calls `callCloudLLM` / `callOllama` with `mode: 'agent'`.
  - Passes through `webSearchEnabled` and `applyPatchEnabled` as runtime options.
- This keeps:
  - All tool execution funnelled through `runAgentLoop` and `executeToolCall`.
  - Tool results visible in the Chat panel (via `toolCalls` rendering).

### 5.2 Synthetic messages for initialization

- When the user clicks the button:
  - Create a new **user message** describing the initialization task, e.g.:
    - “Initialize project docs for the current IEC 61499 FESTO DS skills project. Use local tools to inspect the project and create the following markdown files under a docs folder at the project root: Readme.md, ProjectStructure.md, FunctionBlockInfo.md, SkillInfo.md, MCP_Info.md. Follow these constraints: …”
  - Optionally prepend a **system message** (only for this run) with tighter instructions, e.g.:
    - “You are an agent responsible for analyzing the IEC 61499 skills project at `<AGENT_ROOT_DIR>` and generating documentation files under `docs/`. Use `list_directory`, `read_file`, and `create_file` tools instead of printing file contents inline. Do not write files outside `docs`.”
- Include explicit instructions on how to use tools:
  - For file inspection:
    - `list_directory` on `./IEC61499` and `./HMI`.
    - `read_file` on key `.fbt` / `.xml` / `.cs` files.
  - For docs creation:
    - `create_file` for each markdown file path (e.g. `docs/Readme.md`).
  - For idempotency:
    - If a doc already exists, **overwrite it completely** with the new generated content (v1 behavior).
  - For **MCP_Info.md** specifically:
    - Instruct the agent to:
      - Inspect `mcp-config.json` to detect available MCPs (GraphDB, OPC UA, MQTT, etc.).
      - Use any exposed GraphDB tools to run a few focused SPARQL queries and summarize ontologies and key entities.
      - Use OPC UA tools (if available) to browse NodeIds relevant to skills and FBs and record them.
      - Build a PLC–MCP mapping table that links skills/FBs to GraphDB and OPC UA identifiers, as described in section 4.5.

### 5.3 Interaction with existing chat history

- Options:
  - **Option A (simpler)**: Append the initialization request to the current chat `messages` and reuse `handleSendMessage`:
    - Pros: no new plumbing, user sees the question and answer inline.
    - Cons: `handleSendMessage` uses the existing `chatMode` (which might not be `agent`), affecting tool permissions.
  - **Option B (preferred)**: Implement `handleInitializeProjectDocs` as a **separate call** that:
    - Constructs a small synthetic history (1–2 messages for this task only).
    - Passes `mode: 'agent'` directly to `callCloudLLM` / `callOllama`.
    - Still appends the resulting assistant message (and tool calls) to the global `messages` so the user can see what happened.

We will follow **Option B** so that:
- The “Ask / Plan / Agent” toggle does not need to be changed by the user to run initialization.
- The run is more deterministic and not influenced by prior conversation context.

### 5.4 Handling missing configuration or root

- Before starting the run:
  - Call `FileSystemAPI.getAgentRootDir()`:
    - If it returns `null` or empty, show a UI error:
      - “Agent root directory is not configured. Open a folder in the Explorer or set AGENT_ROOT_DIR in config.json before initializing docs.”
    - Do not start the agent run in this case.
  - Verify backend configuration:
    - For `chatBackend === 'cloud-llm'`:
      - Ensure `cloudLLMConfig` has a model and API key (as `handleSendMessage` does).
    - For `chatBackend === 'ollama'`:
      - Ensure `ollamaConfig.model` is set and reachable.
  - If misconfigured, show an inline error near the button or via alert.

---

## 6. UI & App Integration Plan

### 6.1 ChatPanel changes

- File: `src/components/ChatPanel.tsx`
  - Extend `ChatPanelProps`:
    - Add:
      ```ts
      onInitializeProjectDocs?: () => void;
      isInitializingProjectDocs?: boolean;
      ```
  - In the header (next to the “New chat” button), add:
    - An `Init project docs` button:
      - `onClick={onInitializeProjectDocs}`.
      - `disabled={isLoading || isInitializingProjectDocs || !canSend}`.
      - Tooltip describing what it does.
  - Optionally:
    - When `isInitializingProjectDocs` is true, show a small inline status label:
      - “Initializing project docs…” with a spinner icon.

### 6.2 App.tsx changes

- File: `src/App.tsx`
  - Add state:
    ```ts
    const [isInitializingProjectDocs, setIsInitializingProjectDocs] = useState(false);
    ```
  - Implement `handleInitializeProjectDocs = async () => { ... }`:
    - Guard against concurrent runs:
      - If `isInitializingProjectDocs` or `isLoading` is true, return early.
    - Resolve agent root:
      - `const rootDir = await FileSystemAPI.getAgentRootDir();`
      - If missing, show an alert and return.
    - Validate backend configuration:
      - Mirror the `canSend` checks in `ChatPanel`:
        - Cloud: `cloudLLMConfig` + API key.
        - Ollama: base URL and model.
    - Build a **synthetic chat history**:
      - Optionally clear or keep existing messages; minimal version:
        - Append a new `ChatMessage` with `role: 'user'` and the initialization instruction text (including docs spec).
      - For more isolation:
        - Use a small local `history` array not tied to `messages` for the agent call, then push final messages after the run.
    - Call the LLM:
      - If `chatBackend === 'cloud-llm'`:
        ```ts
        const result = await callCloudLLM(history, cloudLLMConfig, 'agent', {
          webSearchEnabled,
          applyPatchEnabled: applyPatchEnabled && cloudLLMConfig?.provider === 'openai' && cloudLLMConfig?.model === 'gpt-5.1',
          applyPatchProvider: cloudLLMConfig?.provider,
          applyPatchModel: cloudLLMConfig?.model,
        });
        ```
      - Else if `chatBackend === 'ollama'`:
        ```ts
        const result = await callOllama(history, ollamaConfig, 'agent', {
          webSearchEnabled,
          applyPatchEnabled: false,
        });
        ```
    - After the call:
      - Append an assistant `ChatMessage` summarizing the run (`result.content`) and attach `toolCalls` so they appear in the UI.
      - Increment `fileSystemVersion` to trigger File Explorer refresh (so `docs/` appears).
    - Ensure `setIsInitializingProjectDocs(false)` in a `finally` block.
  - Pass new props into `ChatPanel`:
    ```tsx
    <ChatPanel
      ...
      onInitializeProjectDocs={handleInitializeProjectDocs}
      isInitializingProjectDocs={isInitializingProjectDocs}
    />
    ```

### 6.3 Optional: dedicated project‑init helper

- To keep `App.tsx` light, consider a helper in `src/utils/project-init.ts`:
  - Export:
    - `buildProjectInitPrompt(rootDir: string): string` – returns a detailed user message string describing:
      - The docs to create.
      - The content spec from section 4.
      - How to use tools and constraints (no writes outside `docs`, etc.).
    - Optionally constants like `PROJECT_DOCS_REL_PATH = 'docs'` and filenames.
  - `App.tsx` then imports and uses:
    ```ts
    const initPrompt = buildProjectInitPrompt(rootDir);
    const history: ChatMessage[] = [{
      id: `init-${Date.now()}`,
      role: 'user',
      content: initPrompt,
      timestamp: new Date(),
    }];
    ```

---

## 7. Behavior Details & Edge Cases

### 7.1 docs folder existence & idempotency

- If `docs/` does not exist:
  - The agent should create files using `create_file` with paths like `docs/Readme.md`.
  - The backend will create the folder automatically because `createFile` ensures parent directories exist.
- If `docs/` already exists:
  - First iteration behavior: **overwrite existing docs** with new content.
    - Simpler behavior; user can re‑run initialization after significant changes.
  - Future extension:
    - Optionally ask the user whether to overwrite or append/update sections.

### 7.2 Large project / token limits

- IEC 61499 and HMI folders may contain many files; reading them all verbatim is undesirable.
- The prompt should instruct the agent to:
  - Use `list_directory` to get an overview and sample **patterns** (e.g. names starting with `sk`).
  - Only `read_file` for:
    - Representative function blocks.
    - Key HMI files.
    - Core config files (e.g. SKILL templates).
  - Summarize structures and behaviors rather than copying raw XML or C# into docs.

### 7.3 MCP availability

- If MCP servers are configured but not currently connected:
  - The agent should still fill `MCP_Info.md` using `mcp-config.json`.
  - It may mention that runtime status is “not checked” or “not connected at initialization time.”
- If some MCP connections fail during tool calls:
  - The agent will see tool errors in responses; the prompt should encourage it to log these gracefully in the docs (e.g. “GraphDB MCP tool call failed: …”) instead of failing the entire run.

### 7.4 Non‑FESTO projects

- Although the initial target is the FESTO DS skills project, the design should be robust for other PLC projects:
  - The prompt should not hard‑code exact paths beyond:
    - `./IEC61499`, `./HMI`, `./HwConfiguration`, etc. as “typical” subfolders when they exist.
  - If `IEC61499` is missing, `FunctionBlockInfo.md` / `SkillInfo.md` can state that no IEC 61499 folder was found.
  - The docs generation logic relies on **relative paths from `AGENT_ROOT_DIR`**, so changing the root in `config.json` should work automatically.

---

## 8. Implementation Phases & Tasks

### Phase 1 – Prompt design & helper

- [ ] Add `src/utils/project-init.ts` with:
  - [ ] Constants for `DOCS_DIR = 'docs'` and filenames.
  - [ ] `buildProjectInitPrompt(rootDir: string)` implementing the content specification from section 4 and tool usage instructions from section 5.
- [ ] Optionally add unit‑style tests or a small dev helper to log the generated prompt for inspection.

### Phase 2 – App orchestration

- [ ] In `src/App.tsx`:
  - [ ] Add `isInitializingProjectDocs` state.
  - [ ] Implement `handleInitializeProjectDocs()` as described in section 6.2.
  - [ ] Wire `handleInitializeProjectDocs` and `isInitializingProjectDocs` into `ChatPanel`.
  - [ ] Ensure the File Explorer refreshes after docs are created by bumping `fileSystemVersion`.

### Phase 3 – ChatPanel UI

- [ ] In `src/components/ChatPanel.tsx`:
  - [ ] Extend props with `onInitializeProjectDocs` and `isInitializingProjectDocs`.
  - [ ] Add the `Init project docs` button in the header.
  - [ ] Show disabled state and optional “initializing…” indicator during runs.

### Phase 4 – Manual validation

- Using the existing FESTO project at `TASK_DOCS/FESTO_DS_skills` (AGENT_ROOT_DIR):
  - [ ] Start backend (`npm run dev:backend`) and frontend (`npm run dev:frontend`).
  - [ ] Confirm File Explorer root is `TASK_DOCS/FESTO_DS_skills`.
  - [ ] Ensure `mcp-config.json` is loaded and MCP servers appear in the sidebar (they do not have to be connected for v1).
  - [ ] Select a capable model (e.g. GPT‑5.x or Gemini 2.5) and ensure Agent mode tools are available.
  - [ ] Click `Init project docs`:
    - [ ] Observe agent tool calls: `list_directory`, `read_file`, `create_file`, possibly MCP tools.
    - [ ] Verify `TASK_DOCS/FESTO_DS_skills/docs` is created with:
      - [ ] `Readme.md`
      - [ ] `ProjectStructure.md`
      - [ ] `FunctionBlockInfo.md`
      - [ ] `SkillInfo.md`
      - [ ] `MCP_Info.md`
    - [ ] Open each file in the Code Editor and confirm contents meet the spec.

### Phase 5 – Polish & documentation

- [ ] Add a short section to an existing project doc (or a new `PROJECT_DOCS/PROJECT_INITIALIZATION_FEATURE_README.md`) explaining:
  - What the `Init project docs` button does.
  - How the `docs` folder is structured.
  - Caveats (overwrites existing docs, depends on the quality of the selected model, etc.).
- [ ] Optionally tune prompt wording based on practical output quality (e.g. encourage more concise tables or more verbose explanations as needed).

Once these phases are complete, the PLC IDE will offer a **one‑click project initialization** flow that leverages the LLM and local/MCP tools to generate rich documentation under `docs/`, making subsequent agentic work on the project significantly easier and safer.
