# OpenAI Apply Patch Tool Integration Plan (GPT‑5.1 Only, Toggle‑Controlled)

This document describes how to integrate OpenAI’s **`apply_patch`** tool into the existing LLM Chat UI, **only for the `gpt-5.1` model**, gated behind a dedicated toggle. The goal is to enable a safe, iterative, multi‑step code editing workflow where the model:

- Proposes workspace changes via `apply_patch`.
- The application **applies those changes to the local project** (inside the configured agent root).
- The agent loop **reports back on what changed** and can continue iterating.

Key constraints and goals:
- Only **OpenAI `gpt-5.1`** may use `apply_patch`.
- The feature must be **off by default** and controlled by a UI toggle.
- Changes must stay within the **agent root directory** enforced by `mcp-backend`.
- The design should reuse the existing **ReAct‑style agent loop** and **FileSystemAPI**.

> References (consult during implementation):
> - OpenAI docs – Tools: Apply Patch: `https://platform.openai.com/docs/guides/tools-apply-patch`
> - Example using `applyPatchTool` + `Editor`:
>   `https://github.com/openai/openai-agents-js/blob/main/examples/tools/applyPatch.ts`
> - Types for `ApplyPatchOperation` and `applyDiff` (from `@openai/agents-core`):
>   - `ApplyPatchOperation` union of:
>     - `{ type: 'create_file'; path: string; diff: string }`
>     - `{ type: 'update_file'; path: string; diff: string }`
>     - `{ type: 'delete_file'; path: string }`
>   - `applyDiff(input: string, diff: string, mode?: 'default' | 'create'): string`

---

## 1. Current Implementation Overview

### 1.1 Agent loop and LLM plumbing

- File: `src/utils/llm.ts`
  - `callCloudLLM(messages, config, mode, options?)`
    - Builds `mcpTools = getAllMCPTools(mode, options)`.
    - For `config.provider`:
      - `openai` → `callOpenAIChat(messages, config, mcpTools, mode, options)`
      - `gemini` → `callGemini(messages, config, mcpTools, mode, options)`
      - `anthropic` → `callAnthropic(messages, config, mode)`
    - Wraps provider call in `runAgentLoop(...)` which:
      - Calls `callLLM(history)` up to `AgentConfig.maxIterations`.
      - Executes tools via `executeToolCall(...)`.
      - Appends synthetic tool result messages into `history`.
      - Returns `{ content, toolCalls? }` for the UI.
  - `callOllama(messages, config, mode, options?)`
    - Uses `getAllMCPTools(mode, options)` and `callOllamaOnce(...)` with the same `runAgentLoop(...)` logic.
  - `AgentConfig` and modes:
    - `agent`: `allowWrites: true`, `allowLocalTools: true`.
    - `plan` / `ask`: `allowWrites: false`, `allowLocalTools: true` (but mutating tools are blocked via `isLocalMutatingTool`).
  - `getModeSystemPrompt(mode)`:
    - Adds high‑level instructions for `ask` / `plan` / `agent`.
  - `getAgentRootPrompt()`:
    - Adds a system message describing the agent root directory from `FileSystemAPI.getAgentRootDir()`.
  - `runAgentLoop(...)`:
    - Takes `ToolCall[]` returned from providers (OpenAI/Gemini/Ollama) and executes them via:
      - `mcpClientManager.callTool` (remote MCP servers), or
      - `executeLocalTool` for tools in `LOCAL_TOOLS`.
    - Synthesizes a tool results message and loops until a final answer.

### 1.2 Local tools and tool execution

- File: `src/utils/llm.ts`
  - `LOCAL_TOOLS: MCPTool[]` (currently):
    - `create_file`, `read_file`, `list_directory`, `replace_in_file`, `web_search`.
  - `executeLocalTool(name, args)`:
    - Maps each local tool to `FileSystemAPI` calls:
      - `create_file` → `writeFile`.
      - `read_file` → `readFile`.
      - `list_directory` → `listDirectory`.
      - `replace_in_file` → `readFile` + string `replace` + `writeFile`.
      - `web_search` → `POST http://localhost:3002/api/web-search`.
  - `getAllMCPTools(mode, options?)`:
    - Collects tools from connected MCP servers (via `mcpClientManager.getServers()`).
    - **Always** adds all `LOCAL_TOOLS` (no per‑mode/per‑provider gating yet).
  - `isLocalMutatingTool(name)`:
    - Currently considers only `create_file` and `replace_in_file` as mutating.
  - `executeToolCall(toolCall, agentConfig)`:
    - Resolves whether tool is MCP or local; enforces:
      - If `!agentConfig.allowWrites && isLocalMutatingTool(name)` → returns error result instead of executing.

### 1.3 OpenAI, Gemini, Anthropic, Ollama behavior

- OpenAI – `callOpenAIChat(...)` (already migrated to Responses API)
  - Builds `openaiMessages` as an array of `{ role, content }` with:
    - Mode system message.
    - Agent root system message.
    - Optional tool list system message.
  - Constructs `requestBody` for `POST {baseUrl}/responses`:
    - `model: config.model` (e.g. `gpt-5.1`).
    - `input: openaiMessages`.
    - `tools`:
      - `convertMCPToolsToOpenAI(mcpTools)` → `[{ type: 'function', function: { ... } }]`.
      - Adds `{ type: 'web_search' }` when `options?.webSearchEnabled`.
    - `tool_choice: 'auto'` when tools exist.
  - Parses `data.output`:
    - Filters items with `item.type === 'function_call'` and maps them into `ToolCall[]`.
    - If any tool calls → returns `{ toolCalls }`.
    - Otherwise extracts assistant text from `message` items and returns `{ finalText }`.
  - **No apply_patch support yet.**

- Gemini – `callGemini(...)`
  - Flattens prompt text + tool descriptions into a single string.
  - Adds tools via `convertMCPToolsToGemini(...)`.
  - Optionally adds `googleSearch` when `options?.webSearchEnabled`.
  - Parses `functionCall` parts into `ToolCall[]` or returns text.
  - **No apply_patch or workspace editing.**

- Anthropic – `callAnthropic(...)`
  - Plain text‑only calls, no tools.

- Ollama – `callOllamaOnce(...)`
  - Injects mode + agent root + tool descriptions into the first `system` message.
  - Provides tools via `convertMCPToolsToOllama(mcpTools)`.
  - Parses `message.tool_calls` into `ToolCall[]`.
  - **No apply_patch; workspace editing goes through existing local/MCP tools.**

### 1.4 File system access and backend

- Frontend FS API – `src/utils/file-api.ts`
  - `FileSystemAPI` talks to `http://localhost:3002` (`mcp-backend`):
    - `/api/files/list`, `/api/files/read`, `/api/files/write`,
      `/api/files/create`, `/api/files/delete`, `/api/files/rename`,
      `/api/files/search`.
  - `getAgentRootDir()` / `setAgentRootDir()` manage the agent root and cache it.
  - Paths are resolved via `resolveAgentPath` to stay inside the configured root.

- Backend – `mcp-backend/src/index.ts` + `mcp-backend/src/file-service.ts`
  - `fileService` enforces allowed directories:
    - `registerDirectory(...)` + `isPathAllowed(...)`.
  - Implements all file operations using Node `fs/promises` and `path`.
  - Also exposes `POST /api/web-search` for the `web_search` tool.
  - **No apply_patch endpoint or diff support yet.**

### 1.5 UI and configuration

- File: `src/App.tsx`
  - Holds application‑level state:
    - `chatBackend`, `cloudLLMConfig`, `ollamaConfig`, `chatMode`.
    - `webSearchEnabled` (persisted via `loadWebSearchEnabled` / `saveWebSearchEnabled`).
  - `handleSendMessage(...)`:
    - For cloud:
      - `callCloudLLM(allMessages, cloudLLMConfig, chatMode, { webSearchEnabled })`.
    - For local:
      - `callOllama(allMessages, ollamaConfig, chatMode, { webSearchEnabled })`.
  - Passes `webSearchEnabled` and its setter into `ChatPanel`.

- File: `src/utils/storage.ts`
  - `STORAGE_KEYS.WEB_SEARCH_ENABLED`.
  - `saveWebSearchEnabled(enabled)` / `loadWebSearchEnabled()`.
  - Cloud config handling is already GPT‑5‑aware (normalizes OpenAI models to GPT‑5 family).

- File: `src/components/ChatPanel.tsx`
  - Renders chat header with:
    - Mode selector, backend selector, provider + model selectors, API key input.
    - Web search toggle:
      - `webSearchEnabled` checkbox, disabled for Anthropic / missing cloud config.
  - Uses `CLOUD_MODEL_OPTIONS`:
    - `openai: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1']`.

---

## 2. Target Behavior and UX

### 2.1 High‑level behavior

- Add an **“Apply patch” capability** that:
  - Is **only available** when:
    - `chatBackend === 'cloud-llm'`
    - `cloudLLMConfig.provider === 'openai'`
    - `cloudLLMConfig.model === 'gpt-5.1'`
    - `chatMode === 'agent'` (writes allowed)
  - Is controlled by a **toggle** in the chat header.
  - When enabled:
    - `callOpenAIChat` adds the OpenAI `apply_patch` tool for GPT‑5.1.
    - When the model emits `apply_patch` operations, the app:
      - Applies patches to files under the agent root via `mcp-backend`.
      - Summarizes the applied changes back to the model as a tool result.
      - Continues the agent loop, allowing multiple iterations.

### 2.2 UX: Apply patch toggle

- New toggle in the Chat header, next to “Web search”:
  - Label: `Apply patch (GPT‑5.1)`
  - Tooltip:
    - “Allow GPT‑5.1 to propose and apply file diffs inside your configured workspace. Changes are limited to the agent root directory.”
  - Default: **off** (opt‑in).
  - Visibility/availability:
    - Visible when `chatBackend === 'cloud-llm'`.
    - Enabled only when:
      - Provider is `openai`.
      - Model is exactly `gpt-5.1`.
      - Mode is `agent`.
    - Disabled (with explanatory tooltip) in all other combinations:
      - Different provider or model.
      - `ask` / `plan` modes.
      - `chatBackend === 'ollama'`.
  - State persisted across reloads via `localStorage`.

### 2.3 Safety and scope

- **Model & mode gating**
  - Only `gpt-5.1` (OpenAI) can request `apply_patch` operations.
  - Only in `agent` mode, where `AgentConfig.allowWrites === true`.
  - For `ask` / `plan`:
    - Toggle is disabled; no patch tool is exposed; agent remains read‑only.

- **File system boundaries**
  - The backend will apply patches only inside directories registered with `fileService.registerDirectory(...)` (agent root).
  - Attempts to patch files outside allowed directories must be rejected with a clear error message passed back to the model.

- **Observability**
  - Every patch operation should be summarized in tool results:
    - Example: `Created src/new-feature.ts`, `Updated src/utils/llm.ts`, `Deleted old/file.ts`.
  - Errors (e.g., patch fails to apply) must be surfaced in the tool result and appear in the chat.

---

## 3. Data Model and Configuration Changes

### 3.1 Extend AgentRuntimeOptions

- File: `src/types/ide-types.ts`
  - Current:
    ```ts
    export interface AgentRuntimeOptions {
      webSearchEnabled?: boolean;
    }
    ```
  - Extend to carry apply‑patch state and light model context:
    ```ts
    export interface AgentRuntimeOptions {
      webSearchEnabled?: boolean;
      applyPatchEnabled?: boolean;
      applyPatchProvider?: string; // e.g., 'openai'
      applyPatchModel?: string;    // e.g., 'gpt-5.1'
    }
    ```
  - These fields are **hints** passed from `App.tsx` into `llm.ts`:
    - `applyPatchEnabled` → user toggle.
    - `applyPatchProvider` / `applyPatchModel` → derived from `cloudLLMConfig` when backend is cloud.

### 3.2 Persist apply patch preference

- File: `src/utils/storage.ts`
  - Extend `STORAGE_KEYS`:
    ```ts
    const STORAGE_KEYS = {
      // existing...
      WEB_SEARCH_ENABLED: 'web_search_enabled',
      APPLY_PATCH_ENABLED: 'apply_patch_enabled',
    } as const;
    ```
  - Add helpers:
    ```ts
    export const saveApplyPatchEnabled = (enabled: boolean) => {
      localStorage.setItem(STORAGE_KEYS.APPLY_PATCH_ENABLED, enabled ? '1' : '0');
    };

    export const loadApplyPatchEnabled = (): boolean => {
      const stored = localStorage.getItem(STORAGE_KEYS.APPLY_PATCH_ENABLED);
      if (stored === '1') return true;
      if (stored === '0') return false;
      return false;
    };
    ```

### 3.3 Wire state into App

- File: `src/App.tsx`
  - Add state:
    ```ts
    const [applyPatchEnabled, setApplyPatchEnabled] = useState<boolean>(false);
    ```
  - Initialize from storage in the initial `useEffect`:
    ```ts
    const loadedApplyPatchEnabled = loadApplyPatchEnabled();
    setApplyPatchEnabled(loadedApplyPatchEnabled);
    ```
  - Persist on change:
    ```ts
    useEffect(() => {
      saveApplyPatchEnabled(applyPatchEnabled);
    }, [applyPatchEnabled]);
    ```
  - When calling LLM helpers:
    - For cloud:
      ```ts
      if (chatBackend === 'cloud-llm' && cloudLLMConfig) {
        const isOpenAIGpt51 =
          cloudLLMConfig.provider === 'openai' &&
          cloudLLMConfig.model === 'gpt-5.1';

        assistantResponse = await callCloudLLM(
          allMessages,
          cloudLLMConfig,
          chatMode,
          {
            webSearchEnabled,
            applyPatchEnabled: applyPatchEnabled && isOpenAIGpt51 && chatMode === 'agent',
            applyPatchProvider: isOpenAIGpt51 ? 'openai' : undefined,
            applyPatchModel: isOpenAIGpt51 ? 'gpt-5.1' : undefined,
          },
        );
      }
      ```
    - For Ollama:
      ```ts
      else if (chatBackend === 'ollama' && ollamaConfig) {
        assistantResponse = await callOllama(
          allMessages,
          ollamaConfig,
          chatMode,
          {
            webSearchEnabled,
            // Apply patch is only supported for OpenAI GPT‑5.1; keep disabled here.
            applyPatchEnabled: false,
          },
        );
      }
      ```
  - Pass state down to `ChatPanel`:
    ```tsx
    <ChatPanel
      // existing props...
      webSearchEnabled={webSearchEnabled}
      onWebSearchEnabledChange={setWebSearchEnabled}
      applyPatchEnabled={applyPatchEnabled}
      onApplyPatchEnabledChange={setApplyPatchEnabled}
    />
    ```

---

## 4. UI Changes: ChatPanel Toggle

### 4.1 Extend ChatPanel props and header UI

- File: `src/components/ChatPanel.tsx`
  - Update `ChatPanelProps`:
    ```ts
    interface ChatPanelProps {
      // existing...
      webSearchEnabled: boolean;
      onWebSearchEnabledChange: (enabled: boolean) => void;
      applyPatchEnabled: boolean;
      onApplyPatchEnabledChange: (enabled: boolean) => void;
    }
    ```
  - Destructure new props in `ChatPanelInner`.
  - In the header controls area (where the Web search toggle lives), add an Apply patch toggle:
    ```tsx
    const isOpenAIGpt51 =
      chatBackend === 'cloud-llm' &&
      cloudLLMConfig?.provider === 'openai' &&
      cloudLLMConfig?.model === 'gpt-5.1';

    const applyPatchToggleDisabled =
      !isOpenAIGpt51 || mode !== 'agent';

    // ...
    <div className="flex items-center gap-1 ml-2">
      <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={applyPatchEnabled && isOpenAIGpt51 && mode === 'agent'}
          onChange={(e) =>
            onApplyPatchEnabledChange(e.target.checked)
          }
          disabled={applyPatchToggleDisabled}
          className="h-3 w-3 rounded border-border text-primary focus:ring-0"
          title={
            !isOpenAIGpt51
              ? 'Apply patch is only available for OpenAI gpt-5.1 in Agent mode.'
              : mode !== 'agent'
                ? 'Switch to Agent mode to allow apply_patch editing.'
                : 'Allow GPT-5.1 to propose and apply code patches inside your workspace.'
          }
        />
        <span>Apply patch (GPT-5.1)</span>
      </label>
    </div>
    ```

### 4.2 UX notes

- Toggle semantics:
  - The top‑level `applyPatchEnabled` state represents **user preference**.
  - Actual runtime activation is further gated in `App.tsx` by provider/model/mode.
- When the user switches away from GPT‑5.1 or OpenAI:
  - The checkbox should appear disabled and (optionally) unchecked.
  - We **do not** need to clear the stored value; instead, the runtime layer ignores it.
- When switching modes:
  - In `ask` / `plan`, the toggle is disabled with a tooltip explaining that apply patch only runs in Agent mode.

---

## 5. Tool Definitions and Agent Plumbing

### 5.1 Define apply_patch as a local tool (schema only)

- File: `src/utils/llm.ts`
  - Introduce a dedicated tool definition for `apply_patch` using the `ApplyPatchOperation` schema from the docs:
    ```ts
    const APPLY_PATCH_TOOL: MCPTool = {
      name: 'apply_patch',
      description:
        'Apply one or more file patches (create, update, or delete files) using V4A-style diffs inside the current workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description:
              'List of patch operations to apply in order. Each operation targets a single file.',
            items: {
              type: 'object',
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    type: { const: 'create_file' },
                    path: { type: 'string' },
                    diff: {
                      type: 'string',
                      description:
                        'Headerless V4A diff to create the file contents; every line should start with "+".',
                    },
                  },
                  required: ['type', 'path', 'diff'],
                },
                {
                  type: 'object',
                  properties: {
                    type: { const: 'update_file' },
                    path: { type: 'string' },
                    diff: {
                      type: 'string',
                      description:
                        'Headerless V4A diff to transform the existing file into the new version.',
                    },
                  },
                  required: ['type', 'path', 'diff'],
                },
                {
                  type: 'object',
                  properties: {
                    type: { const: 'delete_file' },
                    path: { type: 'string' },
                  },
                  required: ['type', 'path'],
                },
              ],
            },
          },
        },
        required: ['operations'],
      },
    };
    ```
  - Keep existing `LOCAL_TOOLS` for `create_file`, `read_file`, etc. unchanged apart from how they are aggregated (see next subsection).

### 5.2 Conditionally expose apply_patch via getAllMCPTools

- File: `src/utils/llm.ts`
  - Refactor local tools grouping:
    ```ts
    const BASE_LOCAL_TOOLS: MCPTool[] = [
      // existing create_file, read_file, list_directory, replace_in_file, web_search
    ];
    ```
  - Update `getAllMCPTools` to include `APPLY_PATCH_TOOL` only when appropriate:
    ```ts
    const getAllMCPTools = (mode: ChatMode, options?: AgentRuntimeOptions): MCPTool[] => {
      const allTools: MCPTool[] = [];
      const servers = mcpClientManager.getServers();

      for (const server of servers) {
        if (server.status === 'connected' && server.tools) {
          allTools.push(...server.tools);
        }
      }

      // Always expose base local tools; AgentConfig controls mutating writes.
      allTools.push(...BASE_LOCAL_TOOLS);

      const applyPatchActive =
        !!options?.applyPatchEnabled &&
        options.applyPatchProvider === 'openai' &&
        options.applyPatchModel === 'gpt-5.1' &&
        mode === 'agent';

      if (applyPatchActive) {
        allTools.push(APPLY_PATCH_TOOL);
      }

      return allTools;
    };
    ```
  - This ensures:
    - Other providers and models never see `apply_patch` in tool descriptions.
    - `ask` / `plan` modes never expose `apply_patch`, even if the user’s toggle is on.

### 5.3 Mark apply_patch as mutating

- File: `src/utils/llm.ts`
  - Update `isLocalMutatingTool`:
    ```ts
    const isLocalMutatingTool = (name: string): boolean => {
      return (
        name === 'create_file' ||
        name === 'replace_in_file' ||
        name === 'apply_patch'
      );
    };
    ```
  - This ensures that:
    - Even if `apply_patch` somehow appears in non‑agent modes, `executeToolCall` will block it when `allowWrites` is `false`.

### 5.4 Implement executeLocalTool('apply_patch', ...)

- File: `src/utils/llm.ts`
  - Extend `executeLocalTool`:
    ```ts
    const executeLocalTool = async (name: string, args: any) => {
      switch (name) {
        // existing cases...
        case 'apply_patch': {
          const operations = Array.isArray(args?.operations) ? args.operations : [];
          if (!operations.length) {
            throw new Error('apply_patch requires a non-empty "operations" array');
          }

          const response = await fetch('http://localhost:3002/api/files/apply-patch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operations }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `apply_patch backend error (${response.status})`);
          }

          const data: any = await response.json();
          const summary =
            typeof data?.summary === 'string'
              ? data.summary
              : JSON.stringify(data, null, 2);

          return {
            content: [
              {
                type: 'text',
                text: summary,
              },
            ],
          };
        }
        // ...
      }
    };
    ```
  - The new backend endpoint is described in §6.

---

## 6. Backend Apply Patch Executor (`mcp-backend`)

### 6.1 Add dependencies

- File: `mcp-backend/package.json`
  - Add (or verify) dependency:
    ```json
    {
      "dependencies": {
        "@openai/agents-core": "^0.3.4",
        // existing deps...
      }
    }
    ```
  - Rationale:
    - We use `@openai/agents-core` for:
      - `ApplyPatchOperation` type and validation logic (optional).
      - `applyDiff` utility to apply V4A diffs safely.

### 6.2 Implement applyPatch service

- New file: `mcp-backend/src/apply-patch-service.ts`
  - Implement a small service around `applyDiff` and `fileService`:
    ```ts
    import type { ApplyPatchOperation } from '@openai/agents-core/dist/types/protocol';
    import { applyDiff } from '@openai/agents-core';
    import { fileService } from './file-service.js';

    export interface ApplyPatchSummaryItem {
      type: ApplyPatchOperation['type'];
      path: string;
      status: 'completed' | 'failed';
      message?: string;
    }

    export async function applyPatchOperations(
      operations: ApplyPatchOperation[],
    ): Promise<ApplyPatchSummaryItem[]> {
      const results: ApplyPatchSummaryItem[] = [];

      for (const op of operations) {
        try {
          if (op.type === 'create_file') {
            const content = applyDiff('', op.diff, 'create');
            await fileService.writeFile(op.path, content);
            results.push({
              type: op.type,
              path: op.path,
              status: 'completed',
              message: `Created ${op.path}`,
            });
          } else if (op.type === 'update_file') {
            const original = await fileService.readFile(op.path);
            const patched = applyDiff(original, op.diff, 'default');
            await fileService.writeFile(op.path, patched);
            results.push({
              type: op.type,
              path: op.path,
              status: 'completed',
              message: `Updated ${op.path}`,
            });
          } else if (op.type === 'delete_file') {
            await fileService.deleteFile(op.path);
            results.push({
              type: op.type,
              path: op.path,
              status: 'completed',
              message: `Deleted ${op.path}`,
            });
          } else {
            results.push({
              // @ts-expect-error: type narrowed at runtime
              type: op.type,
              path: (op as any).path ?? '',
              status: 'failed',
              message: `Unsupported apply_patch operation type: ${String(op.type)}`,
            });
          }
        } catch (error: any) {
          results.push({
            type: op.type,
            path: (op as any).path ?? '',
            status: 'failed',
            message:
              error?.message ??
              `Error applying ${op.type} to ${(op as any).path ?? ''}`,
          });
        }
      }

      return results;
    }
    ```
  - Notes:
    - `fileService` already enforces allowed directories.
    - `applyDiff` throws if the diff cannot be applied; we catch and propagate as `status: 'failed'`.

### 6.3 Add HTTP endpoint

- File: `mcp-backend/src/index.ts`
  - Import the service:
    ```ts
    import { applyPatchOperations } from './apply-patch-service.js';
    ```
  - Add a new route after other `/api/files/*` handlers:
    ```ts
    app.post('/api/files/apply-patch', async (req, res) => {
      try {
        const { operations } = req.body as { operations?: any[] };

        if (!Array.isArray(operations) || operations.length === 0) {
          return res
            .status(400)
            .json({ error: 'operations must be a non-empty array' });
        }

        // Optionally: validate shape of each operation against ApplyPatchOperation
        // using zod from @openai/agents-core, or rely on runtime errors from applyDiff.

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
    ```

### 6.4 Security and logging considerations

- Ensure that:
  - `fileService.writeFile`, `readFile`, and `deleteFile` are used for all operations so that `isPathAllowed` checks apply.
  - Any unexpected errors are logged with enough context (operation type/path) for debugging, but without leaking secrets.
- Optionally:
  - Add structured logging (e.g., console logs) when apply patch is invoked:
    - Number of operations.
    - Target paths (relative to agent root).

---

## 7. OpenAI GPT‑5.1 Apply Patch Integration

### 7.1 Attach apply_patch tool in callOpenAIChat

- File: `src/utils/llm.ts`
  - `callOpenAIChat(...)` already receives `options?: AgentRuntimeOptions`.
  - After computing `tools`:
    ```ts
    const tools: any[] = [];

    if (mcpTools.length > 0) {
      tools.push(...convertMCPToolsToOpenAI(mcpTools));
    }

    if (options?.webSearchEnabled) {
      tools.push({ type: 'web_search' });
    }

    const applyPatchActive =
      !!options?.applyPatchEnabled &&
      options.applyPatchProvider === 'openai' &&
      options.applyPatchModel === 'gpt-5.1';

    if (applyPatchActive) {
      // Exact shape should follow the latest docs:
      // tools: [{ type: 'apply_patch' }]
      tools.push({ type: 'apply_patch' });
    }

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    ```
  - Implementation notes:
    - Confirm in the latest OpenAI docs that `tools: [{ type: 'apply_patch' }]` is the correct shape for Responses API.
    - Keep `apply_patch` **only** for GPT‑5.1, as required.

### 7.2 System prompt adjustments (optional but recommended)

- Still in `callOpenAIChat`:
  - When `applyPatchActive` is true, consider appending a short instruction to the mode/system prompt:
    - Example for Agent mode:
      > “You can edit files inside the configured workspace using the `apply_patch` tool. Use `create_file`, `update_file`, and `delete_file` operations with precise V4A diffs. Keep changes minimal, safe, and focused on the user’s request.”
  - Implementation options:
    - Append this text to `modeSystemContent` when `applyPatchActive`.
    - Or add a separate system message after `agentRootSystemMessage`.

### 7.3 Parsing apply_patch calls from Responses

- OpenAI Responses API will emit additional items when `apply_patch` is used. The exact shape may evolve, but is conceptually similar to `ApplyPatchCallItem` from `@openai/agents-core`:
  - Objects with:
    - `type: 'apply_patch_call'`
    - `callId: string`
    - `status: 'in_progress' | 'completed'`
    - `operation: { type: 'create_file' | 'update_file' | 'delete_file'; path: string; diff?: string }`

- Implementation steps in `callOpenAIChat`:
  1. **Temporary logging (development only)**:
     - When `applyPatchActive` is true, log the raw `data` object to the console (or dev tools) to confirm where `apply_patch` calls appear:
       - E.g., `data.output`, `data.steps`, or other fields.
  2. **Extend parsing logic**:
     - In addition to `function_call` items, also scan for `apply_patch_call` items:
       ```ts
       const applyPatchItems = findApplyPatchItemsFromResponse(data); // helper to be implemented

       const toolCalls: ToolCall[] = [];

       // Existing function_call handling...

       for (const item of applyPatchItems) {
         const operation = item.operation;
         if (!operation) continue;

         toolCalls.push({
           id: item.callId || item.id || `apply-patch-${Date.now()}`,
           name: 'apply_patch',
           arguments: {
             operations: [operation],
           },
         });
       }
       ```
     - The helper `findApplyPatchItemsFromResponse(data)` should:
       - Traverse `data.output` (and/or `data.steps`) according to the latest Responses docs.
       - Collect all items whose `type` matches `'apply_patch_call'`.
     - After combining both function tools and apply patch tools, return `{ toolCalls }` if any exist.
  3. **Fall back to final text** when no tools are present, as today.

### 7.4 Agent loop behavior with apply_patch

- Once `callOpenAIChat` returns `ToolCall[]` containing `name === 'apply_patch'`:
  - `runAgentLoop`:
    - Passes each `ToolCall` into `executeToolCall`.
    - For `apply_patch`:
      - `executeToolCall` resolves it as a local tool and calls `executeLocalTool('apply_patch', args)`.
      - The backend applies the patches and returns a summary string.
    - Summaries are concatenated into:
      - `"Tool apply_patch result: ✓ create_file src/foo.ts — Created src/foo.ts\n\n✓ update_file src/bar.ts — Updated src/bar.ts"`.
    - This is appended as an assistant message before the next LLM call.
  - Iteration continues:
    - The updated workspace is now reflected in subsequent `read_file` / `list_directory` tool calls.
    - The model can chain multiple `apply_patch` calls across iterations.

### 7.5 Ensuring GPT‑5.1‑only behavior

- Enforcement layers:
  1. **UI**:
     - Toggle is only enabled when provider/model is OpenAI GPT‑5.1.
  2. **Runtime options**:
     - `applyPatchEnabled` is set `true` only in `App.tsx` when `isOpenAIGpt51 && chatMode === 'agent'`.
  3. **Tool exposure**:
     - `getAllMCPTools` includes `APPLY_PATCH_TOOL` only when:
       - `mode === 'agent'`
       - `applyPatchProvider === 'openai'`
       - `applyPatchModel === 'gpt-5.1'`
  4. **OpenAI request building**:
     - `callOpenAIChat` only adds `{ type: 'apply_patch' }` to tools when `applyPatchActive` is true.

Together, this ensures that no other provider, model, or mode advertises or uses `apply_patch`.

---

## 8. Iterative Apply Patch Workflow (End‑to‑End)

This section summarizes the intended end‑to‑end flow once all pieces are implemented.

1. **User enables Apply patch**
   - In the Chat header:
     - Backend: Cloud.
     - Provider: OpenAI.
     - Model: `gpt-5.1`.
     - Mode: Agent.
     - Toggles on “Apply patch (GPT‑5.1)”.

2. **User requests a code change**
   - Example: “Refactor `src/utils/llm.ts` to add an apply_patch tool and use it to edit files.”

3. **First LLM call with apply_patch enabled**
   - `App.tsx` calls `callCloudLLM(..., { applyPatchEnabled: true, applyPatchProvider: 'openai', applyPatchModel: 'gpt-5.1', ... })`.
   - `callOpenAIChat`:
     - Adds `apply_patch` to the tools list.
     - Sends the prompt and tool descriptions to GPT‑5.1.

4. **Model emits apply_patch operations**
   - GPT‑5.1 decides to call `apply_patch` with one or more `create_file`/`update_file`/`delete_file` operations.
   - The Responses payload includes `apply_patch_call` items.
   - `callOpenAIChat` parses them into `ToolCall[]` with `name: 'apply_patch'` and `arguments.operations`.

5. **Frontend executes apply_patch tool**
   - `runAgentLoop` sees `toolCalls` and calls:
     - `executeToolCall({ name: 'apply_patch', arguments: { operations } }, agentConfig)`.
   - `executeToolCall`:
     - Recognizes `apply_patch` as a local tool.
     - Checks `allowWrites` (true for Agent).
     - Calls `executeLocalTool('apply_patch', { operations })`.

6. **Backend applies patches**
   - `executeLocalTool` posts to `/api/files/apply-patch` with the operations.
   - `applyPatchOperations`:
     - Uses `applyDiff` and `fileService` to:
       - Create/update/delete files.
       - Ensure paths are within allowed directories.
     - Returns a list of results and a summary string.

7. **Agent loop reports back and continues**
   - `executeToolCall` wraps the backend summary into `MCPToolCall.result.content[0].text`.
   - `runAgentLoop` appends an assistant message summarizing results:
     - “Tool apply_patch result: ✓ create_file src/tasks.md — Created src/tasks.md”
   - The loop continues with another `callOpenAIChat` invocation, where GPT‑5.1 can:
     - Inspect updated files using `read_file` / `list_directory`.
     - Run more `apply_patch` operations.
     - Or provide a final explanation / summary.

8. **Final answer**
   - Once the loop finishes (final text or max iterations), the UI displays:
     - The assistant’s final message (e.g., “I refactored X and created Y.”).
     - The list of executed tool calls, including detailed apply patch results.

---

## 9. Testing and Validation Plan

### 9.1 Backend tests (mcp-backend)

- Add focused tests for `applyPatchOperations`:
  - `create_file`:
    - Creates a new file with the expected contents from a `create` diff.
    - Fails when path is outside allowed directories.
  - `update_file`:
    - Applies a V4A diff to an existing file and matches expected result.
    - Fails when file is missing or diff cannot be applied.
  - `delete_file`:
    - Deletes an existing file.
    - Handles non‑existent files gracefully or with a clear error.
- Test HTTP route `/api/files/apply-patch`:
  - Valid operations array → 200 + expected summary.
  - Empty or invalid operations → 400 with helpful error.

### 9.2 Manual E2E testing

1. **Prerequisites**
   - Configure and run `mcp-backend` with:
     - `AGENT_ROOT_DIR` pointing to a test workspace.
     - `VITE_OPENAI_API_KEY` (and optionally environment variable for backend if needed).
   - Start the frontend app.

2. **Happy path: create + update**
   - Select OpenAI / `gpt-5.1`, Agent mode, enable Apply patch.
   - Ask GPT‑5.1 to:
     - “Create `tasks.md` with a TODO list of 3 items.”
     - Then: “Mark the last item as done.”
   - Verify:
     - `tasks.md` is created under the agent root.
     - Content changes match expectations after the second turn.
     - Chat shows apply patch tool results with clear summaries.

3. **Safety: mode and model gating**
   - Switch to `ask` mode with `gpt-5.1`:
     - Toggle should be disabled; model must not attempt edits.
   - Switch provider to Gemini or Anthropic:
     - Toggle disabled; no `apply_patch` usage.
   - Switch model away from `gpt-5.1` (e.g., `gpt-5-mini`):
     - Toggle disabled; patch operations not advertised.

4. **Error handling**
   - Intentionally break an operation:
     - Ask the model to update a non‑existent file.
   - Confirm:
     - Backend returns a failed status with an explanatory message.
     - Chat shows the failure in the tool result text.

### 9.3 Logging and debugging

- During initial rollout:
  - Add temporary diagnostics in `callOpenAIChat` (when apply patch is active) to log:
    - The `tools` array being sent.
    - The raw `data.output` (or `data.steps`) to confirm where `apply_patch` calls appear.
  - Remove or gate these logs behind a development flag once the behavior is stable.

---

## 10. Summary of Implementation Steps

1. **Add state and storage:**
   - Extend `AgentRuntimeOptions` with apply‑patch fields.
   - Add `APPLY_PATCH_ENABLED` storage helpers.
   - Wire `applyPatchEnabled` state into `App.tsx` and `ChatPanel`.
2. **Update UI:**
   - Add “Apply patch (GPT‑5.1)” checkbox in `ChatPanel` header.
   - Gate it by backend/provider/model/mode.
3. **Tool plumbing:**
   - Define `APPLY_PATCH_TOOL` schema.
   - Update `getAllMCPTools` to conditionally include it.
   - Mark `apply_patch` as mutating; implement `executeLocalTool('apply_patch', ...)`.
4. **Backend executor:**
   - Add `@openai/agents-core` dependency to `mcp-backend`.
   - Implement `applyPatchOperations` and `/api/files/apply-patch`.
5. **OpenAI Responses integration:**
   - Modify `callOpenAIChat` to add `{ type: 'apply_patch' }` for GPT‑5.1 when enabled.
   - Extend response parsing to detect and map `apply_patch` calls into `ToolCall[]`.
6. **Testing & validation:**
   - Add backend tests for apply patch operations.
   - Run manual end‑to‑end tests with GPT‑5.1 in Agent mode.
   - Verify safety gates and error handling.

Once these steps are completed, the app will support a **toggle‑controlled, GPT‑5.1‑only apply patch workflow** that edits the local workspace safely and iteratively through the existing agent loop.

