# Agent Root Directory & File Scope Plan

This document describes how to make a single **agent root directory** the source of truth for:
- What folder the agent “talks about” in **Ask / Plan / Agent** modes.
- Which files local tools (read/write/search) are allowed to touch.
- Which folder the **File Explorer** opens on the left side.

The root directory should be:
- Persisted in the repo‑root `config.json`.
- Loaded automatically on startup (backend + frontend).
- Updated whenever the user opens a new folder in the UI.
- Passed into LLM calls so the model understands the workspace scope.

---

## 1. Current Behavior Overview

### 1.1. Root directory & env handling

- File: `config.json`
  - Currently contains:
    ```json
    {
      "AGENT_ROOT_DIR": "/Users/mx/Documents/melwin-repos/phd_task_llm_chat-/test-plc-project"
    }
    ```
  - This value is **not** read anywhere in the current code.

- File: `mcp-backend/src/index.ts`
  - Uses `dotenv.config()` to load environment variables from `mcp-backend/.env`.
  - Defines `AGENT_ROOT_ENV_KEY = 'AGENT_ROOT_DIR'`.
  - `initializeAgentRootDir()`:
    - Reads `process.env.AGENT_ROOT_DIR`.
    - If set, resolves the path and calls `fileService.registerDirectory(resolved)`.
  - `persistAgentRootDir(rootDir)`:
    - Writes `AGENT_ROOT_DIR=<rootDir>` into `mcp-backend/.env`.
    - Updates `process.env.AGENT_ROOT_DIR` and logs the value.
  - `POST /api/config/root-dir`:
    - Validates the provided path, registers it, and calls `persistAgentRootDir`.
  - `POST /api/files/register-directory`:
    - Registers any directory with `fileService.registerDirectory`.
    - If `process.env.AGENT_ROOT_DIR` is not yet set, calls `persistAgentRootDir(resolved)`.
  - `GET /api/config/root-dir`:
    - Returns `process.env.AGENT_ROOT_DIR` if set, otherwise 404.

**Implication:** the effective agent root directory currently comes from **environment / `.env`**, not from `config.json`.

### 1.2. File access backend

- File: `mcp-backend/src/file-service.ts`
  - Keeps `allowedDirectories: Set<string>`.
  - `registerDirectory(dirPath)` stores absolute normalized paths in `allowedDirectories`.
  - All operations (`listDirectory`, `readFile`, `writeFile`, `searchFiles`, `createFile`, `deleteFile`, `renameFile`) call `isPathAllowed`:
    - Only allow access if the file path is within one of the registered directories.

### 1.3. Frontend File API & Explorer

- File: `src/utils/file-api.ts`
  - `FileSystemAPI` talks to `http://localhost:3002`.
  - Maintains a **cached** `agentRootDir` (private static).
  - `getAgentRootDir()` (private):
    - Calls `GET /api/config/root-dir`.
    - Caches `data.rootDir` into `this.agentRootDir`.
  - `resolveAgentPath(path)`:
    - If `path` is absolute, returns as‑is.
    - Otherwise:
      - Looks up `agentRootDir` via `getAgentRootDir()`.
      - If present, returns `rootDir + '/' + path`.
      - If not, returns the original `path` (backend enforces boundaries).
  - All backend‑mode file operations (`listDirectory`, `readFile`, `writeFile`, `searchFiles`, `createFile`, `deleteFile`, `renameFile`) go through `resolveAgentPath`.

- File: `src/components/FileExplorer.tsx`
  - `loadDirectory(path)`:
    - Calls `FileSystemAPI.registerDirectory(path)`.
    - Then `FileSystemAPI.listDirectory(path)`.
    - Sets local `rootPath` state and persists `path` in `localStorage` (`plc-ide-root-path`).
  - `handleOpenFolder()`:
    - When the browser supports the File System Access API:
      - Uses native handles (`pickDirectoryAndBuildTree`), does **not** call the backend.
      - Clears `plc-ide-root-path` because native handles cannot be persisted.
    - Otherwise:
      - Prompts for a folder path and calls `loadDirectory(path)`.
  - `useEffect` on mount (backend mode only):
    - If native FS is **not** available:
      - Reads `lastPath = localStorage.getItem('plc-ide-root-path')`.
      - Uses a hard‑coded `testPath`:
        ```ts
        const testPath = '/Users/mx/Documents/task_phd/mcp-manager-ui/test-plc-project';
        const pathToLoad = lastPath || testPath;
        loadDirectory(pathToLoad);
        ```
    - Does **not** consult `config.json` or `/api/config/root-dir`.

**Implication:** the File Explorer initial root is driven by **localStorage and a hard‑coded test path**, not by `config.json` or environment.

### 1.4. Agent & tools

- File: `src/utils/llm.ts`
  - `LOCAL_TOOLS` includes:
    - `create_file`, `read_file`, `list_directory`, `replace_in_file`, `web_search`.
  - `executeLocalTool(...)`:
    - File tools call `FileSystemAPI.*` helpers.
    - `web_search` calls `POST http://localhost:3002/api/web-search`.
  - `getAllMCPTools(mode)`:
    - Collects tools from connected MCP servers.
    - Adds `LOCAL_TOOLS` **only when `mode === 'agent'`**.
  - `getAgentConfigForMode(mode)`:
    - `agent`: `allowWrites: true`, `allowLocalTools: true`.
    - `ask` / `plan`: `allowWrites: false`, `allowLocalTools: false`.
  - `callCloudLLM` and `callOllama`:
    - Build `mcpTools = getAllMCPTools(mode, options)`.
    - Run a ReAct loop via `runAgentLoop(...)`.
  - Mode prompts (`getModeSystemPrompt`) mention Ask/Plan/Agent behavior but **do not mention** the project root directory.

**Implication:** local file tools are only available in **Agent** mode and the model is not explicitly told what root folder they operate on. The left‑side Explorer root can easily drift from what the backend considers the agent root.

---

## 2. Target Behavior & Requirements

### 2.1. Single source of truth

- `config.json` at the repo root is the **canonical source of truth** for `AGENT_ROOT_DIR`.
- On startup:
  - The backend reads `config.json` and:
    - Sets `process.env.AGENT_ROOT_DIR`.
    - Registers that directory with `fileService`.
  - `GET /api/config/root-dir` exposes this value to the frontend.
- When the user opens a new folder via the Explorer:
  - That folder becomes the new `AGENT_ROOT_DIR`.
  - The backend updates `config.json` and in‑memory `process.env.AGENT_ROOT_DIR`.
  - The File Explorer `rootPath` and the agent root stay in sync.

### 2.2. Agent awareness in all modes

- In **Ask / Plan / Agent**:
  - The model is explicitly told:
    - What the current **project root directory** is.
    - That file paths should be interpreted **relative to this root** unless explicitly absolute.
    - That tools must not access files outside this root.
- File tools behavior:
  - **Ask / Plan**:
    - Allowed to use **read‑only** local tools (`read_file`, `list_directory`, `searchFiles` handled via MCP).
    - Writes (`create_file`, `replace_in_file`, etc.) should be blocked.
  - **Agent**:
    - Can use both read and write tools.

### 2.3. Explorer alignment

- The left‑side Explorer should:
  - On first load (backend mode), attempt to open the directory from `config.json` via `/api/config/root-dir`.
  - Display that path in the UI (as it already does).
  - When the user changes the folder (backend mode), inform the backend so `config.json` is updated.
  - Prefer the **canonical agent root** over stale `localStorage` values.

### 2.4. Backward compatibility & environment overrides

- If `AGENT_ROOT_DIR` is set via environment (e.g. shell env or `mcp-backend/.env`), it should:
  - Override or seed the value from `config.json` for that process.
  - Optionally be written back into `config.json` the first time to keep them in sync.
- If neither env nor config defines a root:
  - The backend starts with “no configured root” and returns 404 for `/api/config/root-dir`.
  - The Explorer can fall back to user input or a default “Open Folder” prompt.

---

## 3. Backend Changes (mcp-backend)

### 3.1. Introduce config.json helpers

- File: `mcp-backend/src/index.ts` (or a new helper module `app-config.ts`)
  - Add functions to **read and write** the repo‑root `config.json`:
    - Resolve `CONFIG_PATH` as:
      ```ts
      const CONFIG_PATH = path.resolve(process.cwd(), '..', 'config.json');
      ```
      (Assumes backend is started with `cwd = mcp-backend`, which is true for `npm run dev:backend`.)
    - `loadAppConfig(): any`:
      - If `CONFIG_PATH` exists:
        - Read and `JSON.parse` it.
        - On parse error, log a warning and fall back to `{}`.
      - If it does not exist:
        - Return `{}`.
    - `saveAppConfig(config: any)`:
      - Serialize with `JSON.stringify(config, null, 4)` and write to `CONFIG_PATH`.
      - Ensure directory exists (`..` already exists).

### 3.2. Initialize AGENT_ROOT_DIR from config.json

- Replace or extend `initializeAgentRootDir()` with:
  - Steps:
    1. Load config via `loadAppConfig()`.
    2. Read `config.AGENT_ROOT_DIR` if present.
    3. If `process.env.AGENT_ROOT_DIR` is already set (via `dotenv` or shell):
       - Prefer the env value but **optionally sync** back into config:
         - If `config.AGENT_ROOT_DIR` is missing or different, update it and call `saveAppConfig`.
    4. Determine `effectiveRoot`:
       - `effectiveRoot = process.env.AGENT_ROOT_DIR || config.AGENT_ROOT_DIR`.
    5. If `effectiveRoot` is defined:
       - Resolve it via `path.resolve(effectiveRoot)`.
       - Call `fileService.registerDirectory(resolved)`.
       - Set `process.env.AGENT_ROOT_DIR = resolved`.
       - Log: `[CONFIG] Agent root directory initialized: ${resolved}`.
    6. If not defined:
       - Log: `[CONFIG] No agent root directory configured yet`.

**Result:** on backend startup, `config.json` and env stay in sync and `fileService` knows the root directory.

### 3.3. Persist AGENT_ROOT_DIR into config.json instead of .env

- Replace `persistAgentRootDir(rootDir: string)` with logic that:
  - Loads existing config via `loadAppConfig()`.
  - Sets `config.AGENT_ROOT_DIR = rootDir`.
  - Calls `saveAppConfig(config)`.
  - Sets `process.env.AGENT_ROOT_DIR = rootDir`.
  - Logs the new root.
- Optionally:
  - Keep writing to `mcp-backend/.env` **only if needed** for other tools, but given `.env` was removed intentionally, it is reasonable to stop persisting there for this project and rely on `config.json`.

### 3.4. Adjust config endpoints

- `GET /api/config/root-dir`:
  - No change in behavior (still returns `process.env.AGENT_ROOT_DIR` if set).
  - With the new initialization, this now reflects `config.json` correctly.

- `POST /api/config/root-dir`:
  - No change to path validation.
  - After resolving and validating the path:
    - Call `fileService.registerDirectory(resolved)`.
    - Call `persistAgentRootDir(resolved)` (now config‑backed).
  - Return `{ success: true, rootDir: resolved }`.

- `POST /api/files/register-directory`:
  - Keep existing behavior of registering directories.
  - When `process.env.AGENT_ROOT_DIR` is **not** set:
    - Treat the first registered directory as the implicit root by calling `persistAgentRootDir(resolved)`.
  - This ensures that any backend‑initiated registration (e.g. File Explorer backend mode) also updates `config.json`.

---

## 4. Frontend Changes (File Explorer & FileSystemAPI)

### 4.1. Expose agent root dir from FileSystemAPI

- File: `src/utils/file-api.ts`
  - Make `getAgentRootDir()` **public**:
    - Change it from `private static async getAgentRootDir()` to `static async getAgentRootDir()`.
  - Keep caching behavior as is.
  - This allows other frontend code (e.g. `FileExplorer`) to ask “what does the backend consider the agent root?”.

### 4.2. FileExplorer initial load from backend config

- File: `src/components/FileExplorer.tsx`
  - Update the mount `useEffect` (backend mode path) to:
    1. If `supportsFileSystemAccess()` is `true`:
       - Keep current behavior (wait for user to pick a folder via native FS).
       - In this mode, the backend cannot see the native handle paths automatically; this limitation can be documented.
    2. Otherwise (backend mode):
       - Call `FileSystemAPI.getAgentRootDir()` to fetch the root from the backend (which reflects `config.json`).
       - Read `lastPath = localStorage.getItem('plc-ide-root-path')`.
       - Decide `pathToLoad` with a clear preference:
         - If `agentRootDir` exists: use that.
         - Else if `lastPath` exists: use that.
         - Else: show “No Folder Open” and let the user pick (no more hard‑coded `testPath` in this repo).
       - If `pathToLoad` exists, call `loadDirectory(pathToLoad)`.

**Outcome:** When you start the app, the Explorer will automatically open the folder defined in `config.json` (if present), matching the agent root.

### 4.3. Updating config when the user opens a new folder

- File: `src/components/FileExplorer.tsx`
  - When using backend mode (`supportsFileSystemAccess() === false`), `loadDirectory(path)` already calls:
    - `FileSystemAPI.registerDirectory(path)` → backend may set root on first registration.
  - To ensure that **changing** the folder updates `config.json`:
    - Option A (minimal change):
      - Add a new method in `FileSystemAPI`:
        ```ts
        static async setAgentRootDir(path: string): Promise<void> {
          const response = await fetch(`${API_BASE}/api/config/root-dir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to set agent root directory');
          }
        }
        ```
      - At the end of `loadDirectory(path)`:
        - After a successful `listDirectory` call, call `FileSystemAPI.setAgentRootDir(path)` in a `try/catch`.
      - This keeps `fileService.registerDirectory` + `config.json` + env in sync via the backend.
    - Option B (reuse existing `register-directory` behavior):
      - Keep `loadDirectory(path)` as is; rely on `/api/files/register-directory` to set the root for the first directory, and add a UX control later for explicitly “Set as agent root”.
    - For this project, **Option A** is preferable because it keeps the left Explorer and the agent root formally aligned whenever the user changes folders.

### 4.4. Native FS mode limitations

- When `supportsFileSystemAccess()` is `true` and the user chooses a folder via the browser picker:
  - The Explorer uses native handles and does **not** call the backend.
  - The backend’s `AGENT_ROOT_DIR` will **not** automatically reflect this folder.
  - The agent’s local tools (which use the backend) will not see or be able to edit those files directly.
- Short‑term plan:
  - Document this limitation in the UI and docs (e.g. tooltip or note in `FILE_EXPLORER_GUIDE.md`).
  - Treat backend‑mode Explorer as the path where the agent can safely read/write files.
- Long‑term upgrade (optional, not part of this immediate plan):
  - Implement an MCP or backend bridge that mirrors native FS operations so that the agent can operate on the same file tree as the browser FS API.

---

## 5. Agent & LLM Prompt Changes

### 5.1. Make file tools available (read‑only) in Ask/Plan

- File: `src/utils/llm.ts`
  - Update `getAgentConfigForMode(mode)`:
    - `ask`:
      - `allowWrites: false`
      - `allowLocalTools: true`
    - `plan`:
      - `allowWrites: false`
      - `allowLocalTools: true`
    - `agent`: keep as‑is (`allowWrites: true`, `allowLocalTools: true`).
  - Keep `isLocalMutatingTool(name)` as:
    - `true` for `create_file` and `replace_in_file` (and any future mutating tools).
  - In `executeToolCall(...)`:
    - Current logic already blocks mutating tools when `agentConfig.allowWrites === false`.

**Result:** Ask/Plan modes can still use read‑only tools like `read_file` and `list_directory` while staying non‑mutating.

### 5.2. Ensure local tools are available in all modes

- File: `src/utils/llm.ts`
  - Update `getAllMCPTools(mode, options)`:
    - Instead of only adding `LOCAL_TOOLS` in `agent` mode, add them for all modes:
      ```ts
      const getAllMCPTools = (mode: ChatMode, _options?: AgentRuntimeOptions): MCPTool[] => {
        const allTools: MCPTool[] = [];
        const servers = mcpClientManager.getServers();

        for (const server of servers) {
          if (server.status === 'connected' && server.tools) {
            allTools.push(...server.tools);
          }
        }

        // Always expose local tools; AgentConfig decides which are allowed to write
        allTools.push(...LOCAL_TOOLS);

        return allTools;
      };
      ```
  - This keeps tool discovery simple; write restrictions are handled by `AgentConfig`.

### 5.3. Inject agent root directory into prompts

- File: `src/utils/llm.ts`
  - Add a helper to build an extra system message when an agent root is known:
    - Because `FileSystemAPI.getAgentRootDir()` is async, you can:
      - Add a new async helper `getAgentRootPrompt()` that:
        - Calls `FileSystemAPI.getAgentRootDir()`.
        - Returns a string like:
          > `You are working inside the project root directory: <root>. All file paths you use for tools (read_file, list_directory, create_file, replace_in_file) should be interpreted relative to this root unless explicitly absolute. Never read or write files outside this root.`
        - Returns `null` if the root is not configured.
  - In `callOpenAIChat(...)` and `callGemini(...)`:
    - Before building the final messages/prompt:
      - Await `getAgentRootPrompt()` and, if non‑null, add an extra `system` message (OpenAI) or prepend a section in `promptSections` (Gemini).
  - For `callOllamaOnce(...)`:
    - When constructing the initial system message (`combinedContent`), append the same “project root” text if available.

**Outcome:** in any mode, the model understands:
- The exact path of the project root.
- That tools and reasoning should be scoped to that folder.

### 5.4. Improve local tool descriptions with root context

- Optionally, enhance `LOCAL_TOOLS` descriptions to mention the root behavior, e.g.:
  - `read_file`:
    - “Read the content of a file in the current project. Paths are relative to the agent root directory unless absolute.”
  - `create_file` / `replace_in_file`:
    - Emphasize that they must not be used outside the project root.
- This can be done statically in `LOCAL_TOOLS` or dynamically by wrapping tool descriptions when building `mcpTools`.

---

## 6. Answering: “Is there a better way than local file system API tools?”

Within this architecture, the **current approach (backend file API + agent root dir)** is still the most practical way to let the agent safely read and write real project files, because:
- The browser cannot grant LLMs direct file system access.
- The backend provides a natural security boundary (only registered directories are accessible).
- Tool calls are logged and can be constrained by mode (read‑only vs read/write).

Alternative or future options (not required for this plan, but worth noting):
- Replace the custom HTTP file API with a **standard MCP filesystem server**, and connect it via the existing MCP client:
  - Pros: fully standardized, easier to reuse with other MCP clients.
  - Cons: more setup and configuration; requires aligning tool schemas.
- Build an **indexing/search service** for the workspace (rather than direct file access), where the agent calls tools that query a pre‑built index.
  - Pros: better performance on large repos, richer search.
  - Cons: more complexity, still needs a root directory concept.
- Deep integration with an IDE/Editor’s own APIs (e.g. VS Code extension):
  - Pros: perfect alignment with the open folder in the editor.
  - Cons: platform‑specific, more complicated than the current web‑first design.

For now, the priority should be to:
- Make `AGENT_ROOT_DIR` in `config.json` the single source of truth.
- Ensure the File Explorer, backend, and agent prompts all respect this value.

---

## 7. Implementation Order

1. **Backend config wiring**
   - Add `loadAppConfig` / `saveAppConfig` helpers.
   - Initialize `AGENT_ROOT_DIR` from `config.json` and env.
   - Update `persistAgentRootDir` to write to `config.json`.
2. **Config endpoints & registration**
   - Confirm `/api/config/root-dir` uses the new persistence.
   - Ensure `/api/files/register-directory` seeds the root when needed.
3. **Frontend FileSystemAPI & Explorer**
   - Expose `getAgentRootDir` from `FileSystemAPI`.
   - Change FileExplorer initial load to prefer the backend’s root and remove the hard‑coded test path.
   - Add `FileSystemAPI.setAgentRootDir` and call it after successful `loadDirectory` in backend mode.
4. **Agent & tools behavior**
   - Update `getAgentConfigForMode` and `getAllMCPTools` so Ask/Plan can use read‑only local tools.
   - Add agent root prompt text into `callOpenAIChat`, `callGemini`, and `callOllamaOnce`.
   - Optionally refine `LOCAL_TOOLS` descriptions with root context.
5. **Polish & docs**
   - Update `FILE_EXPLORER_GUIDE.md` and any user‑facing docs to explain:
     - The role of `AGENT_ROOT_DIR` in `config.json`.
     - The difference between backend mode and native FS mode.
     - How Ask/Plan/Agent modes interact with workspace files.

