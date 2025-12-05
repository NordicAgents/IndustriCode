# Web Search Tool Integration Plan

This document describes how to add an optional **web search capability** to the existing ReAct‑style agent so that:
- The user can **toggle web search on/off in the UI**.
- OpenAI models use the **native web search tool** (via the Responses API).
- Gemini models use **Google Search grounding**.
- Ollama (local) models can still access the web via a **custom tool**.

The goal is to keep the design:
- **Provider‑aware** (use native search where available).
- **Agent‑friendly** (exposed as a tool the agent can call in multi‑step runs).
- **Safe and controllable** (off by default, clearly surfaced in the UI).

> NOTE: Exact payloads and field names for OpenAI web search and Gemini Google Search should be confirmed against the latest docs:
> - OpenAI web search (Responses API) – see the latest `tools: [{ type: "web_search", ... }]` guidance.
> - Gemini Google Search – see the current `tools` / `googleSearch` / grounding docs for the Gemini API.

---

## 1. Current Implementation Overview

### 1.1. Agent loop and tools

- File: `src/utils/llm.ts`
  - `callCloudLLM(messages, config, mode)`:
    - Computes `mcpTools = getAllMCPTools(mode)`:
      - Connected MCP tools from `mcpClientManager`.
      - `LOCAL_TOOLS` (file operations) when `mode === 'agent'`.
    - Builds a `callLLM(history)` closure that calls:
      - `callOpenAIChat(...)` (OpenAI Responses API).
      - `callGemini(...)` (Gemini `generateContent`).
      - `callAnthropic(...)` (no tools).
    - Passes `callLLM` and `mcpTools` into `runAgentLoop(...)`.
  - `callOllama(messages, config, mode)`:
    - Uses `getAllMCPTools(mode)` and `callOllamaOnce(...)` in the same `runAgentLoop(...)`.
  - `runAgentLoop(initialHistory, mcpTools, mode, callLLM)`:
    - Implements a simple ReAct‑style loop:
      - Calls `callLLM(history)` up to `AgentConfig.maxIterations`.
      - Executes any `ToolCall[]` via `executeToolCall(...)`.
      - Appends synthetic “Tool X result: ...” messages into `history` before the next iteration.
      - Returns `{ content, toolCalls?: MCPToolCall[] }` for the UI.
  - `AgentConfig` limits tools by mode:
    - `agent`: can use local tools and writes (`allowWrites: true`, `allowLocalTools: true`).
    - `ask` / `plan`: no writes, no local tools.

### 1.2. Provider‑specific behavior (no web search yet)

- **OpenAI – `callOpenAIChat`**
  - Uses `POST {baseUrl}/responses` with:
    - `input: openaiMessages` (system + tools description + chat history).
    - `tools` and `tool_choice: 'auto'` when MCP tools exist (function‑calling only).
  - Parses `data.output`:
    - If function‑call segments exist → returns `toolCalls` (for the agent loop).
    - Otherwise → returns `finalText` from assistant content.
  - No notion of “web search on/off” or native web search tool.

- **Gemini – `callGemini`**
  - Builds a flattened text prompt:
    - `modePrompt` + detailed MCP tool description + `buildPromptFromMessages(...)`.
  - Calls `...:generateContent` with:
    - `tools = convertMCPToolsToGemini(mcpTools)` when any tools exist.
  - Parses `functionCall` parts into normalized `ToolCall[]` or returns text.
  - Does **not** use Google Search / grounding.

- **Anthropic – `callAnthropic`**
  - Text‑only reasoning (`/v1/messages`), no tools.
  - No web search integration.

- **Ollama – `callOllamaOnce`**
  - Sends:
    - `messages` (with a combined system message for mode + MCP tool descriptions).
    - `tools = convertMCPToolsToOllama(mcpTools)` when tools exist.
  - Parses `message.tool_calls` into normalized `ToolCall[]` or returns text.
  - No web search capability; depends entirely on MCP + local tools.

- **Tools – `getAllMCPTools` and `LOCAL_TOOLS`**
  - `getAllMCPTools(mode: ChatMode)`:
    - Returns all tools from connected MCP servers.
    - Adds `LOCAL_TOOLS` (file operations) when `mode === 'agent'`.
  - `LOCAL_TOOLS` only includes file‑system tools:
    - `create_file`, `read_file`, `list_directory`, `replace_in_file`.
  - There is **no web search tool** in either MCP or local tools by default.

### 1.3. UI configuration (no web search toggle)

- File: `src/components/ChatPanel.tsx`
  - Header controls:
    - Mode selector (`Ask` / `Plan` / `Agent`).
    - Backend selector (`Cloud` vs `Local`).
    - Cloud provider + model selects (OpenAI / Google / Anthropic).
    - API key input when not provided via env.
    - Ollama base URL + model select when backend is `Local`.
  - No UI to toggle “web search” on/off.

- File: `src/App.tsx`
  - Holds state for:
    - `chatBackend`, `cloudLLMConfig`, `ollamaConfig`, `chatMode`.
  - `handleSendMessage` calls:
    - `callCloudLLM(allMessages, cloudLLMConfig, chatMode)` or
    - `callOllama(allMessages, ollamaConfig, chatMode)`.
  - No `webSearchEnabled` state, and nothing is passed down to `llm.ts` about web search.

---

## 2. Target Behavior and Requirements

### 2.1. UX requirements

- Add a **Web Search toggle** in the chat header:
  - Label: “Web search” or “Use internet”.
  - Tooltip: “Allow the model to search the web when needed (may send queries and partial context to external services).”
  - Default: **off** for safety.
  - Scope: applies to the current chat session (and optionally persisted as a preference).
- When enabled:
  - The agent may use web search as one of its tools **in any mode** that allows read‑only external data:
    - `ask`: allowed (read‑only).
    - `plan`: allowed for research; planning remains non‑mutating.
    - `agent`: allowed; may be combined with other tools.
- When disabled:
  - OpenAI/Gemini do **not** use provider web search / Google Search.
  - Ollama does **not** call the custom `web_search` tool.

### 2.2. Provider‑specific semantics

- **OpenAI (Responses API)**
  - When `webSearchEnabled` and provider is `openai`:
    - Attach the native web search tool (e.g. `tools: [{ type: "web_search", ... }]` as per docs).
    - Let the model autonomously decide when to call web search.
    - Keep existing MCP tools available in parallel.

- **Gemini**
  - When `webSearchEnabled` and provider is `gemini`:
    - Enable Google Search grounding via the Gemini tools interface:
      - E.g. add a `googleSearch` / `googleSearchRetrieval` tool in `requestBody.tools` or `toolConfig` (per current docs).
    - Keep existing MCP tools available.

- **Anthropic**
  - Anthropic does not have a first‑party web search tool in the current code:
    - Short‑term: **disable** the web search toggle (or show a tooltip “Not available for this provider yet”).
    - Longer‑term: potentially route Anthropic through the same custom `web_search` MCP/local tool used by Ollama.

- **Ollama**
  - Ollama has no built‑in web search:
    - When `webSearchEnabled` and backend is `ollama`:
      - Expose a **custom `web_search` tool** via the existing agent tool layer (LOCAL tool or MCP tool).
      - Implement the actual web call in the browser or `mcp-backend` (see §5).
    - This gives Ollama parity with cloud providers for “agent + web”.

### 2.3. Safety and observability

- **Safety**
  - Web search must be opt‑in (toggle off by default).
  - System prompts should clearly state:
    - That web search may be used when enabled.
    - That queries may be sent to external services, and the model should avoid including secrets in queries.
  - For `ask` and `plan` modes:
    - Enforce read‑only behavior:
      - Web search can retrieve data but not write anywhere.
  - For `agent` mode:
    - Allow combining search with file tools and MCP tools, but still follow existing safety constraints (max iterations, etc.).

- **Observability**
  - Each `MCPToolCall` returned from the agent loop already captures:
    - `toolName`, `arguments`, `result`.
  - For Ollama’s custom `web_search` tool:
    - Ensure the result includes enough structure (e.g. URLs, titles, snippets) for debugging and for the model to reason about.
  - (Optional) Later, surface a richer “agent log” view using existing `AgentRun`/`AgentStep` types.

---

## 3. Data Model and Configuration Changes

### 3.1. Introduce web search feature flag in App state

- File: `src/App.tsx`
  - Add a new piece of state:
    - `const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);`
  - Persist it with localStorage helpers (see §3.2).
  - Pass it into:
    - `ChatPanel` for rendering and toggling the UI control.
    - `handleSendMessage` so it can forward the flag into `callCloudLLM` / `callOllama`.

### 3.2. Persisting the preference

- File: `src/utils/storage.ts`
  - Extend `STORAGE_KEYS` with:
    - `WEB_SEARCH_ENABLED: 'web_search_enabled'`.
  - Add helpers:
    - `saveWebSearchEnabled(enabled: boolean)`:
      - `localStorage.setItem(STORAGE_KEYS.WEB_SEARCH_ENABLED, enabled ? '1' : '0');`
    - `loadWebSearchEnabled(): boolean`:
      - Read the item, default to `false` if missing or invalid.
  - Wire them from `App.tsx`:
    - Load on mount:
      - `const initialWebSearch = loadWebSearchEnabled();`
    - Save on change:
      - `useEffect(() => { saveWebSearchEnabled(webSearchEnabled); }, [webSearchEnabled]);`

### 3.3. Passing the flag to LLM helpers

- File: `src/utils/llm.ts`
  - Introduce an optional options type:
    ```ts
    export interface AgentRuntimeOptions {
      webSearchEnabled?: boolean;
    }
    ```
  - Update signatures:
    - `callCloudLLM(messages, config, mode, options?: AgentRuntimeOptions)`
    - `callOllama(messages, config, mode, options?: AgentRuntimeOptions)`
  - From `App.tsx`:
    - Call:
      - `callCloudLLM(allMessages, cloudLLMConfig, chatMode, { webSearchEnabled })`
      - `callOllama(allMessages, ollamaConfig, chatMode, { webSearchEnabled })`
  - Inside `callCloudLLM` / `callOllama`:
    - Pass `options?.webSearchEnabled` down to provider adapters and/or to `getAllMCPTools` (for the Ollama/local tool case).

---

## 4. OpenAI Web Search Integration

### 4.1. High‑level design

- File: `src/utils/llm.ts`
  - Extend `callOpenAIChat` to accept `webSearchEnabled: boolean`:
    ```ts
    const callOpenAIChat = async (
      messages: ChatMessage[],
      config: CloudLLMConfig,
      mcpTools: MCPTool[] = [],
      mode: ChatMode,
      webSearchEnabled: boolean,
    ): Promise<LLMCallResult> => { ... }
    ```
  - Use this flag to decide whether to attach the native web search tool in the Responses request.
  - Keep MCP tools working exactly as today via `convertMCPToolsToOpenAI`.

### 4.2. Request construction

- When `webSearchEnabled && config.provider === 'openai'`:
  - Extend `requestBody` for `/responses` with the web search tool per docs, for example:
    ```ts
    const requestBody: any = {
      model: config.model,
      input: openaiMessages,
      tools: [
        ...convertMCPToolsToOpenAI(mcpTools),
        // Pseudocode: confirm exact shape in docs
        { type: 'web_search', /* optional config */ },
      ],
      tool_choice: 'auto',
    };
    ```
  - If `webSearchEnabled` is `false`, do **not** include the `web_search` tool; keep the current `tools` behavior for MCP only.
  - Be careful not to double‑send tools:
    - If `mcpTools` is empty and `webSearchEnabled` is true, `tools` should still be an array with the single `web_search` entry.

### 4.3. System prompt updates

- In `getModeSystemPrompt(mode)` (still in `src/utils/llm.ts`):
  - When `webSearchEnabled && provider === 'openai'`, consider appending an extra sentence in the system prompt for OpenAI calls:
    - E.g. “When you need up‑to‑date information from the internet, you may call the web_search tool. Avoid including secrets or unnecessary personal data in your search queries.”
  - Implementation detail:
    - Because `getModeSystemPrompt` currently does not know the provider, we can:
      - Either keep it provider‑agnostic and add a generic sentence about “web search tools” when `webSearchEnabled` is true, or
      - Introduce a provider‑aware variant used by `callOpenAIChat` and `callGemini` (optional).

### 4.4. Response parsing

- `callOpenAIChat` already parses Responses output into:
  - `toolCalls` (for function calls).
  - `finalText` (for plain text).
- With the web search tool:
  - Web search invocations will appear as **tool calls**, similar to MCP tools:
    - The model will emit a `function_call` (or equivalent) for the `web_search` tool.
  - Because the **provider executes the web search internally**, we do **not** execute `web_search` from the frontend:
    - The model will receive and reason over the search results and then emit final text or additional tool calls.
  - Implementation detail:
    - Confirm in the docs whether web search calls appear in `output` as steps or function‑call segments.
    - Only treat **MCP/local tools** as executable via `executeToolCall`; do not try to call `web_search` from our side.

### 4.5. Wiring from `callCloudLLM`

- In `callCloudLLM(...)`:
  - When `config.provider === 'openai'`, call:
    ```ts
    return callOpenAIChat(history, config, mcpTools, mode, options?.webSearchEnabled ?? false);
    ```
  - Keep behavior for other providers unchanged.

---

## 5. Gemini Google Search Integration

### 5.1. High‑level design

- File: `src/utils/llm.ts`
  - Extend `callGemini` to accept `webSearchEnabled: boolean`:
    ```ts
    const callGemini = async (
      messages: ChatMessage[],
      config: CloudLLMConfig,
      mcpTools: MCPTool[] = [],
      mode: ChatMode,
      webSearchEnabled: boolean,
    ): Promise<LLMCallResult> => { ... }
    ```
  - Use this flag to enable Google Search as an additional tool in the `generateContent` request.

### 5.2. Request construction

- When `webSearchEnabled && config.provider === 'gemini'`:
  - Extend the `requestBody` for `generateContent` to include Google Search, following current docs. Conceptually:
    ```ts
    const requestBody: any = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [
        ...convertMCPToolsToGemini(mcpTools),   // existing MCP tools
        // Pseudocode: confirm exact field names and nesting
        { googleSearch: {} },
      ],
      // or use `toolConfig` / `groundingConfig` depending on the latest Gemini API
    };
    ```
  - Ensure Gemini’s schema requirements for tools (e.g. no `additionalProperties`) are still respected.

### 5.3. Prompt guidance

- Adjust the `toolDescription` block in `callGemini` to mention web search when enabled:
  - E.g. “You can also use Google Search to retrieve up‑to‑date information from the internet when needed.”
  - Clarify that:
    - The model should favor MCP tools for **internal systems** (MQTT, OPC UA, GraphDB, etc.).
    - Use web search only when external information is necessary.

### 5.4. Response parsing

- Gemini’s `functionCall` parts for MCP tools already map into `ToolCall[]`.
- For Google Search:
  - The Gemini service will perform the search and return results as part of the standard response (candidates + content parts).
  - As with OpenAI:
    - The frontend should **not** try to execute web search itself.
    - The agent loop continues to treat MCP/local tools as executable, while Gemini handles Google Search internally.

### 5.5. Wiring from `callCloudLLM`

- In `callCloudLLM(...)`:
  - For Gemini:
    ```ts
    return callGemini(history, config, mcpTools, mode, options?.webSearchEnabled ?? false);
    ```
  - Anthropic remains unchanged for now (no web search; see §2.2).

---

## 6. Ollama Web Search Integration (Custom Tool)

### 6.1. Approach

Because Ollama does not provide a built‑in web search tool, we will:
- Introduce a **custom `web_search` tool** implemented by our application:
  - Exposed to the model as a standard tool (via Ollama’s `tools` function interface).
  - Implemented either:
    - As a new **LOCAL tool** in `LOCAL_TOOLS`, or
    - As an MCP server (e.g. `WebSearch` MCP) that the agent can call.
- Use this tool only when `webSearchEnabled` is true.

This gives Ollama a web search capability that fits naturally into the existing agent + tools architecture.

### 6.2. Tool definition

- File: `src/utils/llm.ts`
  - Extend `LOCAL_TOOLS` with a new entry (exact shape to be finalized during implementation):
    ```ts
    {
      name: 'web_search',
      description: 'Search the web for up-to-date information and return relevant snippets and URLs.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          max_results: {
            type: 'integer',
            description: 'Maximum number of results to return',
            default: 5,
          },
        },
        required: ['query'],
      },
    }
    ```
  - Decide whether this tool should be available:
    - Only in `agent` mode, or also in `ask` / `plan`.
    - For web search, it is reasonable to allow in `ask` and `plan` because it is read‑only.

- Update `getAllMCPTools` to be feature‑aware:
  - Change signature:
    ```ts
    const getAllMCPTools = (mode: ChatMode, options?: AgentRuntimeOptions): MCPTool[] => { ... }
    ```
  - Behavior:
    - Always include MCP tools from `mcpClientManager` (unchanged).
    - Include existing `LOCAL_TOOLS` file tools in `agent` mode (unchanged).
    - Include `web_search` tool **only if** `options?.webSearchEnabled` is true.
      - If we treat `web_search` as local:
        - Add it to `LOCAL_TOOLS` and gate its inclusion here.
      - If we implement `web_search` via MCP:
        - Instead, ensure the MCP server is configured and rely on `getAllMCPTools` to pick it up naturally.

### 6.3. Tool execution (backend wiring)

- File: `src/utils/llm.ts`
  - Extend `executeLocalTool` to handle `web_search`:
    - Implementation options:
      1. **Direct frontend HTTP call**:
         - Use `fetch` from the browser to call a web search API (e.g. a generic search proxy you control).
         - May require a separate backend to hide API keys and handle rate limits.
      2. **Route via `mcp-backend`** (recommended for keeping secrets server‑side):
         - Add a new REST endpoint in `mcp-backend`:
           - File: `mcp-backend/src/index.ts`
           - Route: `POST /api/web-search`
           - Body: `{ query: string, maxResults?: number }`
           - Implementation:
             - Uses environment variables (e.g. `SEARCH_API_KEY`, `SEARCH_ENDPOINT`) from `mcp-backend/.env`.
             - Calls your preferred search API.
             - Returns normalized results: `{ results: [{ title, url, snippet }, ...] }`.
         - In `executeLocalTool('web_search', args)`:
           - Call `fetch('http://localhost:3002/api/web-search', { ... })`.
           - Wrap the result in the standard MCP‑style `content` array:
             - E.g. `{ content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] }`.
    - Ensure errors are captured and surfaced the same way as other local tools.

- File: `mcp-backend/.env` / docs:
  - Document new environment variables:
    - `SEARCH_API_KEY`, `SEARCH_ENDPOINT`, etc.

### 6.4. Agent loop interaction

- Because `callOllama` already uses `runAgentLoop` with `mcpTools`:
  - Once `web_search` is part of `mcpTools` (when `webSearchEnabled`), Ollama models can:
    - See the tool in the system initialization text.
    - Emit tool calls for `web_search` during the ReAct loop.
  - `executeToolCall` already routes local tools via `executeLocalTool` when:
    - `agentConfig.allowLocalTools` is true.
  - For `ask` / `plan` modes:
    - Decide whether to set `allowLocalTools` to true for `web_search` specifically, or:
      - Optionally treat `web_search` as “read‑only local tool” and allow it even when other local mutating tools are disabled.
    - This can be handled by tweaking `isLocalMutatingTool` so that `web_search` is considered non‑mutating.

---

## 7. UI and Wiring Changes

### 7.1. ChatPanel UI

- File: `src/components/ChatPanel.tsx`
  - Add props:
    ```ts
    interface ChatPanelProps {
      // existing...
      webSearchEnabled: boolean;
      onWebSearchEnabledChange: (enabled: boolean) => void;
    }
    ```
  - In the header controls area (alongside mode/backend/provider controls), add a small toggle:
    - For example, a checkbox or switch:
      - “Web search”
      - When `chatBackend === 'cloud-llm' && cloudLLMConfig?.provider === 'anthropic'`:
        - Disable the control or show a tooltip: “Not available for Anthropic yet”.
      - For other providers/backends:
        - Allow enabling/disabling normally.
  - The toggle calls `onWebSearchEnabledChange(!webSearchEnabled)`.

### 7.2. App wiring

- File: `src/App.tsx`
  - Maintain `webSearchEnabled` state and persistence (see §3.1–3.2).
  - Pass props to `ChatPanel`:
    ```tsx
    <ChatPanel
      // existing props...
      webSearchEnabled={webSearchEnabled}
      onWebSearchEnabledChange={setWebSearchEnabled}
    />
    ```
  - In `handleSendMessage`:
    - Update calls to LLM helpers:
      ```ts
      if (chatBackend === 'cloud-llm' && cloudLLMConfig) {
        assistantResponse = await callCloudLLM(
          allMessages,
          cloudLLMConfig,
          chatMode,
          { webSearchEnabled },
        );
      } else if (chatBackend === 'ollama' && ollamaConfig) {
        assistantResponse = await callOllama(
          allMessages,
          ollamaConfig,
          chatMode,
          { webSearchEnabled },
        );
      }
      ```

### 7.3. Provider‑specific guardrails

- In `ChatPanel`:
  - When provider is `anthropic`, consider:
    - Rendering the toggle disabled with an explanatory tooltip.
  - When backend is `ollama`:
    - Allow the toggle (Ollama uses the custom `web_search` tool).
  - When provider is `openai` or `gemini`:
    - The toggle controls provider‑native web/Google search as described above.

---

## 8. Testing Strategy

### 8.1. Manual testing scenarios

- **OpenAI web search**
  - Provider: OpenAI (`gpt-5-...` models).
  - Web search: Off.
    - Ask a question requiring up‑to‑date information (e.g., current date‑specific query).
    - Verify the model either declines or answers from prior knowledge.
  - Web search: On.
    - Ask the same question.
    - Verify that:
      - The model uses web search (behaviorally; tools may not be visible as MCP calls).
      - Answers are more up‑to‑date and cite or summarize external sources.

- **Gemini Google Search**
  - Provider: Gemini 2.5.
  - Repeat a similar scenario and confirm that responses improve with web search enabled.

- **Ollama custom web search**
  - Backend: `ollama`.
  - Web search: Off.
    - Ask for current events; expect approximate or generic answers.
  - Web search: On.
    - Ask for the same; verify:
      - The agent calls the `web_search` tool (visible in `toolCalls`).
      - Tool result content includes reasonable URLs/snippets.
      - The final answer uses information from the tool output.

### 8.2. Edge cases

- Toggle edge cases:
  - Toggle web search mid‑session and ensure subsequent messages respect the new setting.
  - Verify that disabling web search prevents further use in that session.
- Failure modes:
  - Simulate search API failures (custom tool) and verify:
    - The agent handles errors gracefully.
    - User‑visible messages explain that web search failed but still provide a partial answer if possible.

---

## 9. Implementation Order

1. **Plumbing & UI**
   - Add `webSearchEnabled` state, storage helpers, and ChatPanel toggle.
   - Pass the flag into `callCloudLLM` / `callOllama`.
2. **OpenAI & Gemini integration**
   - Extend `callOpenAIChat` and `callGemini` to accept `webSearchEnabled`.
   - Wire the native web/Google search tools into their requests.
   - Add minimal prompt guidance about web search usage.
3. **Ollama custom `web_search` tool**
   - Implement `web_search` as a local tool (and/or MCP tool).
   - Add backend support via `mcp-backend` if needed for API key management.
   - Ensure the agent loop can execute it when enabled.
4. **Guardrails & polish**
   - Refine prompts, disable toggle for unsupported providers, and clarify tool usage in system messages.
   - Add basic error handling and logging for the new search path.
5. **Iterate based on usage**
   - Tune web search defaults (on/off per provider, max results) based on performance and cost.

