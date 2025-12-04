# ReAct‑Style Agentic Tool‑Calling Plan

This document describes how to evolve the current LLM Chat UI into a **ReAct‑style agent** that can perform **multi‑step reasoning with multiple tool calls** across all modes and models, and then return a final, well‑grounded answer.

The focus is on:
- Adding a reusable **agent loop** that can:
  - Call tools multiple times (MCP + local tools)
  - Feed tool results back into the model
  - Decide when to stop and answer
- Keeping the design **provider‑agnostic** (OpenAI, Gemini, Anthropic, Ollama)
- Respecting existing **Ask / Plan / Agent** modes and their safety constraints

This plan is implementation‑oriented and assumes familiarity with:
- LangChain agents / ReAct pattern  
- Google ADK / OpenAI Agents concepts (tools, steps, termination)  
- The current code in `src/utils/llm.ts` and `src/App.tsx`

---

## 1. Current Implementation Overview

### 1.1. Where LLM calls happen

**Frontend only, per‑request calls**
- `src/App.tsx`
  - `handleSendMessage(...)` constructs a `ChatMessage` for the user, updates `messages` state, and calls one of:
    - `callCloudLLM(allMessages, cloudLLMConfig, chatMode)` for OpenAI/Gemini/Anthropic
    - `callOllama(allMessages, ollamaConfig, chatMode)` for local models
  - The return value is a single `{ content, toolCalls? }` which becomes **one assistant message**.

**LLM utilities**
- `src/utils/llm.ts`
  - `callCloudLLM(messages, config, mode)`
    - Computes available tools via `getAllMCPTools(mode)`:
      - Connected MCP tools from `mcpClientManager`
      - Plus `LOCAL_TOOLS` (file ops) when `mode === 'agent'`
    - Routes to:
      - `callOpenAIChat(...)`
      - `callGemini(...)`
      - `callAnthropic(...)`
  - `callOllama(...)` for local models

### 1.2. Tool‑calling today (single‑step)

**OpenAI (Responses API) – `callOpenAIChat`**
- Builds `openaiMessages`:
  - Optional system message for mode (`getModeSystemPrompt(mode)`)
  - Optional system message describing tools (names + descriptions)
  - All chat `messages` as `{ role, content }`.
- Calls `POST {baseUrl}/responses` with:
  - `model: config.model`
  - `input: openaiMessages`
  - `tools` + `tool_choice: 'auto'` when tools exist.
- Parses `data.output`:
  - If any `output[i].type === 'function_call'`:
    - Executes each call:
      - If matches an MCP tool → `mcpClientManager.callTool(...)`
      - Else if matches a `LOCAL_TOOLS` entry → `executeLocalTool(...)`
    - Builds `toolCalls: MCPToolCall[]`
    - Builds a **synthetic text summary**: `"Tool X result: ..."`  
      Returns `{ content: toolResultsText, toolCalls }`.
  - Else:
    - Treats `output` as an assistant message, collects `content` parts into a string, returns `{ content }`.
- **Important**: Tool results are **not fed back** into the model. The UI, not the LLM, turns tool results into a summary.

**Gemini – `callGemini`**
- Builds a single prompt string combining:
  - Mode guidance (ask/plan/agent)
  - Tool listing with specific instructions (e.g., how to use MCP tools)
  - User conversation rendered via `buildPromptFromMessages`.
- Calls `generateContent` with optional `tools = convertMCPToolsToGemini(mcpTools)`.
- Parses `functionCall` parts in `candidates[].content.parts`:
  - Executes each using MCP or local tools (similar to OpenAI).
  - Synthesizes a textual summary and returns `{ content, toolCalls }`.
- Otherwise returns text from the first candidate.
- Again, **no ReAct loop**; only a single round of tool calls at most.

**Anthropic – `callAnthropic`**
- No tool support yet.
- Builds a flattened text prompt: mode guidance + conversation.
- Calls `/v1/messages` and returns a single text reply.

**Ollama – `callOllama`**
- Similar approach:
  - Adds a system message describing tools (for MCP + local tools).
  - Calls `/api/chat` with `messages` and optional `tools`.
  - If `message.tool_calls` exists:
    - Executes tools via MCP/local.
    - Returns a synthesized textual summary + `toolCalls`.
  - Else returns plain chat text.

### 1.3. Modes and local tools

**Modes – `ChatMode` and prompts**
- `src/types/ide-types.ts`:
  - `ChatMode = 'ask' | 'plan' | 'agent'`.
- `getModeSystemPrompt(mode)` in `llm.ts`:
  - `ask`:
    - “Read‑only exploration; don’t change state; prefer read‑only tools.”
  - `plan`:
    - “First produce a numbered plan; ask for user confirmation before edits.”
  - `agent`:
    - “You may autonomously use tools, run commands, edit files; keep user informed.”

**Local tools – `LOCAL_TOOLS` in `llm.ts`**
- File operations via `FileSystemAPI`:
  - `create_file`
  - `read_file`
  - `list_directory`
  - `replace_in_file`
- Only added to tool list when `mode === 'agent'`.

**MCP tools**
- Managed via `mcpClientManager` and configured in the sidebar.
- `getAllMCPTools(mode)` returns:
  - All tools from connected MCP servers (for all modes)
  - Plus local tools (only in Agent mode).

**Net effect**:
- Each user message results in **one LLM call**, which may:
  - Optionally trigger **one batch** of tool calls.
  - Never see its own tool outputs.
  - Never chain multiple tool/tool+LLM steps.

---

## 2. Target Agentic Behavior (ReAct‑style)

We want a shared **agent loop** that can:
- For any provider (OpenAI, Gemini, Anthropic, Ollama) and any mode (ask/plan/agent):
  - Decide when to use tools
  - Call **multiple tools over multiple steps**
  - Observe tool outputs
  - Refine reasoning and call tools again if needed
  - Finally return a coherent, grounded answer.

### 2.1. Functional requirements

- **Multi‑step loop**
  - Agent can perform multiple LLM → Tool → LLM cycles until:
    - A termination condition is reached (e.g. model declares it is done)
    - Or a safety limit is reached (max iterations / tool calls).

- **Tool result visibility**
  - Tool outputs must be fed back to the model as context, not only summarized by the UI.
  - For OpenAI/Gemini/Ollama, leverage their native tool‑call + observation patterns where possible.

- **Provider‑agnostic**
  - Shared high‑level agent loop, separate provider adapters.
  - Providers differ only in:
    - How tools are declared
    - How tool calls are represented in responses
    - How to provide tool results back into the model.

- **Mode‑aware**
  - `ask`:
    - Read‑only tools only, conservative limits (few steps).
  - `plan`:
    - First message: planning only, no mutating tools.
    - After user confirmation: agent loop may execute tools to realize the plan.
  - `agent`:
    - Full autonomy (including local file tools) with higher step limits.

- **All models**
  - OpenAI / Gemini / Ollama:
    - Use native tool mechanisms for ReAct loops.
  - Anthropic:
    - Introduce tool support when upgrading API.
    - Until then, the loop is "reasoning only" (no external tools) but still supports multiple calls for refinement.

- **UI requirements**
  - At minimum:
    - Final assistant message must include all `toolCalls` used during the run.
  - Nice‑to‑have:
    - Optional “Agent log” view with per‑step actions/observations.
    - Progress indicators while the agent is working.

---

## 3. High‑Level Architecture

### 3.1. Core concepts and types

We will introduce a small agent layer on top of existing LLM helpers.

**New types (high‑level)**
- `AgentConfig` (new, in `src/types/ide-types.ts` or `src/types.ts`):
  - `maxIterations: number`
  - `maxToolCallsPerIteration: number`
  - `mode: ChatMode`
  - `provider: CloudProvider | 'ollama'`
  - Flags: `allowWrites`, `allowLocalTools`, `allowMCPTools`, etc. (derived from `mode`).

- `AgentRun` / `AgentStep` (new):
  - `AgentRun`:
    - `id`, `goal`, `status`, `steps: AgentStep[]`, `result?`.
  - `AgentStep`:
    - `stepIndex`
    - `llmInputMessages` (provider‑agnostic)
    - `llmOutput` (raw provider response or normalized)
    - `toolCalls: MCPToolCall[]`
    - `observationMessages` (what we feed back to the model).

We can reuse and align with existing but unused types:
- `AgentAction` and `AgentTask` already exist in `src/types/ide-types.ts`.
  - Plan: extend them slightly (if needed) and map `AgentStep` → `AgentAction[]`.
  - This will allow future UI for step‑by‑step visualization without re‑inventing types.

### 3.2. Provider adapter interface

Introduce a small abstraction around LLM calls that exposes **raw tool calls**, without executing them, and that can accept **tool observations**.

Example interface (conceptual):

```ts
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface LLMCallResult {
  messagesForUser?: string;       // final answer text if the model is done
  toolCalls?: ToolCall[];         // tool calls requested this step
  raw?: unknown;                  // provider-specific payload for debugging
}

interface LLMProviderAdapter {
  callOnce(
    history: ChatMessage[],
    config: CloudLLMConfig | OllamaConfig,
    mode: ChatMode,
    tools: MCPTool[],
    toolObservations?: ChatMessage[],  // tool outputs from previous step(s)
  ): Promise<LLMCallResult>;
}
```

For each provider we implement this interface:
- `OpenAIProviderAdapter` (Responses API)
- `GeminiProviderAdapter`
- `AnthropicProviderAdapter` (no tools initially)
- `OllamaProviderAdapter`

The adapter is responsible for:
- Building provider‑specific request payloads (messages + tools + previous tool observations).
- Parsing responses to:
  - Detect tool calls
  - Detect final answers
  - Normalize them into `LLMCallResult`.

**Note**: Existing `callOpenAIChat`, `callGemini`, `callAnthropic`, `callOllama` are currently a mix of:
- Provider call logic
- Tool execution
- Final response shaping.

We will refactor them into:
- Lower‑level adapter functions (`callOnce`) that do **not** execute tools.
- A higher‑level **agent runner** that performs the loop + tool execution.

### 3.3. Tool execution layer

We already have the logic to execute tools:
- MCP tools via `mcpClientManager.callTool(serverId, toolName, args)`
- Local tools via `executeLocalTool(name, args)`.

We will introduce a small wrapper:

```ts
interface ToolExecutor {
  executeToolCall(tc: ToolCall): Promise<MCPToolCall>;
}
```

Implementation details:
- Determine whether `tc.name` is:
  - An MCP tool (`mcpClientManager.getServers()`).
  - A local tool (`LOCAL_TOOLS`).
- Enforce mode‑based permissions:
  - `ask` / `plan`:
    - Disallow mutating tools (e.g. `create_file`, `replace_in_file`) unless explicitly allowed.
  - `agent`:
    - Allow all tools.
- Wrap results in `MCPToolCall` (existing type) for UI compatibility.

### 3.4. Agent loop (ReAct)

Core orchestrator (new, e.g. `src/utils/agent.ts`):

```ts
export async function runAgenticConversation(
  userMessage: ChatMessage,
  priorMessages: ChatMessage[],
  backendConfig: CloudLLMConfig | OllamaConfig,
  backendType: ChatBackend,
  mode: ChatMode,
): Promise<{ finalContent: string; toolCalls: MCPToolCall[]; agentRun: AgentRun }> {
  // 1. Build AgentConfig from mode + provider
  // 2. Initialize history and agentRun
  // 3. Loop: LLM -> Tool(s) -> add observations -> repeat
}
```

Loop behavior (conceptual):

1. Initialize:
   - `history = priorMessages + [userMessage]`
   - `toolCalls: MCPToolCall[] = []`
   - `toolObservationMessages: ChatMessage[] = []`
   - `iteration = 0`

2. While `iteration < maxIterations`:
   - Call adapter:
     - `result = await adapter.callOnce(history, config, mode, tools, toolObservationMessages)`
   - If `result.messagesForUser` is present **and** no `result.toolCalls`:
     - Treat as final answer → break.
   - If `result.toolCalls` exists:
     - For each `ToolCall` (up to `maxToolCallsPerIteration`):
       - Execute via `ToolExecutor`, getting an `MCPToolCall`.
       - Append to `toolCalls`.
       - Build a standardized observation message for the model, e.g.:
         - `role: 'assistant'`, `content: JSON.stringify({ tool: name, arguments, resultSummary: ... })`
         - Or use provider‑specific `tool`/`observation` message roles where supported.
     - Append observation messages to `toolObservationMessages` and to `history`.
     - Increment `iteration` and continue.
   - If neither tool calls nor final answer:
     - Fail safe and break with an error message.

3. If loop exits without a final answer (e.g. max iterations hit):
   - Return a safe message like:
     - `"I used tools but couldn't fully complete the task within the configured limits. Here is what I found: ..."` plus any partial findings.

4. Return:
   - `finalContent` for the assistant message.
   - `toolCalls` for message metadata.
   - `agentRun` (if we want to persist detailed step history).

This is the ReAct‑style loop:
- The model decides **when and how to use tools**.
- The agent executes tools, feeds observations back into the model.
- The model eventually returns an answer without requesting further tools.

---

## 4. Mode‑Specific Behavior

We want one core loop but different **policies** per mode.

### 4.1. Policy matrix

| Mode   | Max iterations | Allowed tools                      | Local tools | MCP tools | Notes |
|--------|----------------|------------------------------------|------------:|----------:|------|
| ask    | 2–3            | Read‑only only (no writes)        |      ❌     |      ✅   | Safe exploration |
| plan   | 1 (planning) + configurable | Read‑only only by default |      ❌     |      ✅   | Plan first, then optional execution |
| agent  | 5–8            | All tools (incl. mutating)        |      ✅     |      ✅   | Autonomous work |

Policy enforcement:
- `AgentConfig` derived from `mode`:
  - `allowWrites` false in `ask` and planning phase of `plan`.
  - `allowLocalTools` only true in `agent`.
- `ToolExecutor` checks:
  - If tool is mutating and `allowWrites === false` → skip or return a safe error.

### 4.2. Mode prompts and agent instructions

We will extend `getModeSystemPrompt(mode)` to include **agent instructions** for tool usage and looping.

**Example (OpenAI / general) agent prompt snippet:**

- Common agent instructions (added when tools exist), e.g.:
  - “You are an AI agent with access to tools. When needed, you may call tools to gather information or take actions. Use the following loop:
     1) Decide if a tool is needed.
     2) If yes, call a tool with appropriate arguments.
     3) After you receive tool results, carefully read them and decide whether another tool call is needed.
     4) When you have enough information, answer the user clearly without calling more tools.”

Per mode adjustments:
- `ask`:
  - Emphasize read‑only behavior and that tools are for inspection only.
- `plan`:
  - Emphasize planning first and waiting for user confirmation before any mutating tools.
  - We can also instruct the model to **label** the planning phase clearly (e.g. “Plan: ...”).
- `agent`:
  - Emphasize autonomy, multi‑step reasoning, and using tools aggressively when helpful.

These snippets can live as small helper functions so they can be tuned without touching core logic.

---

## 5. Integration Plan by Module

### 5.1. Types and configuration

Files:
- `src/types.ts`
- `src/types/ide-types.ts`

Changes:
- Add `AgentConfig`, `AgentRun`, `AgentStep`, `ToolCall`, `LLMCallResult` interfaces.
- Confirm or extend existing `AgentAction` / `AgentTask` to align with `AgentRun`:
  - `AgentTask.goal` = user request
  - `AgentTask.plan` = initial plan (especially for Plan mode)
  - `AgentTask.actions` = flattened list of all tool calls and key LLM steps.
- Optional:
  - Extend `ChatMessage['role']` to include `'tool'` if we want explicit tool messages in history.
  - Alternatively, keep `role` as is and encode tool observations as assistant messages with structured JSON in `content`.

### 5.2. LLM provider adapters

File: new `src/utils/llm-adapters.ts` (or split by provider)

**OpenAI adapter**
- Refactor existing `callOpenAIChat` into:
  - `callOpenAIOnce(...)` that:
    - Accepts:
      - `history: ChatMessage[]`
      - `tools: MCPTool[]`
      - `toolObservations: ChatMessage[]`
      - `config`, `mode`
    - Builds `input` for `/responses`:
      - Include:
        - Mode system prompt
        - Tool descriptions (either as dedicated `tools` declarations or an additional system message).
        - User + assistant + tool observation messages in the correct order.
    - Sends `tools` and `tool_choice: 'auto'`.
    - Parses `data.output` to:
      - Extract **tool calls** without executing them:
        - Build normalized `ToolCall[]`.
      - Extract **final answer text** if present.
    - Returns `LLMCallResult`.
- Remove tool execution logic from this layer (move to agent runner).

**Gemini adapter**
- Similar refactor of `callGemini`:
  - Create `callGeminiOnce(...)` that:
    - Uses `tools = convertMCPToolsToGemini(mcpTools)` when tools are available.
    - Embeds mode + agent instructions into the prompt.
    - Parses `functionCall` parts to normalized `ToolCall[]`.
    - Returns either a final answer or tool calls.

**Anthropic adapter**
- Introduce `callAnthropicOnce(...)` that:
  - Currently:
    - Supports text‑only reasoning loops (no tools).
  - Future:
    - When Anthropic tool support is added, adapt to return `ToolCall[]` as well.

**Ollama adapter**
- Refactor `callOllama` into:
  - `callOllamaOnce(...)`:
    - Accepts history, tools, toolObservations.
    - Calls `/api/chat` with `tools` when available.
    - Parses `message.tool_calls` into `ToolCall[]`.
    - Returns `LLMCallResult`.

### 5.3. Agent runner

File: new `src/utils/agent.ts`

Responsibilities:
- Build `AgentConfig` based on:
  - `mode`
  - `backendType` (cloud vs. Ollama)
  - Provider or model (e.g. more iterations for faster models).
- Select the correct adapter (OpenAI, Gemini, Anthropic, Ollama).
- Use `getAllMCPTools(mode)` to build tool list:
  - Filter tools based on `AgentConfig` (e.g. strip mutating local tools in `ask`/`plan`).
- Implement the ReAct loop described in §3.4.
- Return:
  - Final assistant message text.
  - Aggregated `MCPToolCall[]`.
  - `AgentRun` for future inspection/logging.

This module should be **UI‑agnostic** and testable in isolation (given stub adapters).

### 5.4. Wiring into `App.tsx` / UI

File: `src/App.tsx`

Current behavior:
- `handleSendMessage`:
  - Builds `userMessage`.
  - Calls `callCloudLLM` or `callOllama`.
  - Appends a single assistant response.

New behavior:
- Replace direct calls with the agent runner:

```ts
import { runAgenticConversation } from './utils/agent';

// ...
let agentResult;
if (chatBackend === 'cloud-llm' && cloudLLMConfig) {
  agentResult = await runAgenticConversation(
    userMessage,
    messages,
    cloudLLMConfig,
    'cloud-llm',
    chatMode,
  );
} else if (chatBackend === 'ollama' && ollamaConfig) {
  agentResult = await runAgenticConversation(
    userMessage,
    messages,
    ollamaConfig,
    'ollama',
    chatMode,
  );
}
```

- Create a single assistant `ChatMessage` from:
  - `content: agentResult.finalContent`
  - `toolCalls: agentResult.toolCalls`

Optional enhancements:
- While the agent is running, we can:
  - Temporarily push intermediate “Agent is calling tool X...” messages into `messages` to improve UX.
  - Or show a dedicated “Agent running...” indicator elsewhere in the UI.

### 5.5. Optional: Agent log UI

Files:
- New component, e.g. `src/components/AgentLog.tsx`.
- Integration within `ChatPanel` or a sidebar panel.

Behavior:
- Render the `AgentRun` associated with a given assistant message:
  - Steps, tools called, arguments, high‑level results.
- Could be toggled via a button on each assistant message:
  - “View agent steps”.

This is optional for the first iteration. The key requirement is the **capability** to run multi‑step tool‑calling; UI can start minimal.

### 5.6. Backend (`mcp-backend`)

Current backend (`mcp-backend/src/index.ts`) already exposes:
- WebSocket for MCP connections (`MCPWebSocketServer`).
- HTTP endpoints for file operations (`fileService`).

No changes are strictly required for the agent loop itself, because:
- All tool execution already goes through `mcpClientManager` and `FileSystemAPI`.
- The agent runs in the browser and uses existing MCP/local tools as before.

Potential future enhancement:
- Move the agent loop into the backend for:
  - Reduced key exposure in the browser
  - Longer‑running tasks
  - Server‑side use of OpenAI Agents SDK / LangChain

This would be a follow‑up project, reusing the same high‑level design.

---

## 6. Implementation Phases

### Phase 1 – Core refactor and single‑agent loop

Goal: Get a working multi‑step agent loop for **OpenAI + Gemini + Ollama** in **Agent mode**, without breaking existing behavior.

Steps:
1. Add new types: `AgentConfig`, `ToolCall`, `LLMCallResult`, `AgentRun`, `AgentStep`.
2. Extract provider adapters:
   - Implement `callOpenAIOnce`, `callGeminiOnce`, `callOllamaOnce`, `callAnthropicOnce`.
   - Remove tool execution from these functions; they only return `LLMCallResult`.
3. Implement `ToolExecutor` wrapper using existing MCP + local tool logic.
4. Implement `runAgenticConversation` in `src/utils/agent.ts`:
   - For now, enable it **only when `mode === 'agent'`**.
   - Limit to 3–5 iterations.
5. Wire `runAgenticConversation` into `handleSendMessage` for Agent mode:
   - Ask/Plan modes still use the legacy single‑call behavior initially.

Result:
- Agent mode now supports **multi‑tool, multi‑step** reasoning for OpenAI/Gemini/Ollama.
- Existing Ask/Plan behavior is unchanged and safe.

### Phase 2 – Extend to Ask and Plan modes

Goal: Give Ask and Plan modes access to the same agentic capability, but with stricter policies.

Steps:
1. Update `AgentConfig` derivation:
   - `ask` → `maxIterations = 2`, `allowWrites = false`, `allowLocalTools = false`.
   - `plan` → planning phase uses `allowWrites = false`, `allowLocalTools = false`.
2. For Ask:
   - Route through `runAgenticConversation` as well, but with the above constraints.
3. For Plan:
   - First user message in a plan session:
     - Use a special “plan only” call (no tools, no writes).
   - After user confirms the plan (UI addition – “Run Plan” button), start a new `runAgenticConversation` with:
     - Goal = confirmed plan.
     - Mode = `agent` or a stricter derivative.
4. Enhance system prompts for Ask/Plan to keep behavior aligned with safety expectations.

Result:
- All three modes **use the same agent infrastructure**, but with different policies.

### Phase 3 – Anthropic tool support (optional / future)

Goal: Bring Anthropic into parity with other providers for tool calling.

Steps:
1. Upgrade `callAnthropicOnce` to use Antropic’s tool‑calling format (when available/desired).
2. Parse tool calls into `ToolCall[]`.
3. Return them through the agent loop like other providers.
4. Add Anthropic‑specific agent instructions if needed.

Result:
- Anthropic models can participate fully in multi‑tool ReAct loops.

### Phase 4 – UX and ergonomics

Goal: Make the agent’s behavior understandable and controllable for users.

Steps:
1. Add optional Agent log view per assistant message (using `AgentRun`).
2. Add configuration knobs in the UI:
   - Per‑session or global:
     - Max iterations
     - Allow / disallow mutating tools
3. Improve error handling and messaging when:
   - No suitable tools are available
   - Tool execution fails repeatedly
   - Max iterations or tool call limits are hit.

---

## 7. Testing Strategy

### 7.1. Unit tests (where practical)

- Add tests for `runAgenticConversation` using **stub adapters**:
  - Simulate an adapter that:
    - First returns a tool call.
    - Then, given a tool observation, returns a final answer.
  - Verify:
    - Tool calls are executed.
    - Observations are passed back into the second call.
    - Final content and `toolCalls` are correct.

- Add tests for `ToolExecutor`:
  - MCP tool detection.
  - Local tool detection.
  - Mode‑based enforcement of writes.

### 7.2. Manual testing in the UI

**Agent mode**
- Scenario: File read + modification via local tools.
  - “Open `src/utils/llm.ts`, find where OpenAI calls the Responses API, and tell me what endpoint is used. If it’s not `/responses`, update it.”
  - Observe:
    - Agent calls `read_file`.
    - Possibly calls `replace_in_file`.
    - Returns a final summary.

**Ask mode**
- Scenario: Read‑only analysis.
  - “List all MCP servers and their tools in this workspace.”
  - Confirm:
    - Only read/list/search tools are used.
    - No writes occur.

**Plan mode**
- Scenario: Planning + execution.
  - “Add support for a new MCP server for XYZ.”
  - Verify:
    - First, the model returns a plan only.
    - After user confirms and triggers execution, the agent uses tools to implement parts of the plan.

**Cross‑provider parity**
- Repeat a simple multi‑tool scenario with:
  - OpenAI GPT‑5, Gemini 2.5, Anthropic (when tool support is added), Ollama model with tools enabled.

---

## 8. Summary

This plan introduces a **provider‑agnostic ReAct agent** on top of the existing Chat UI that:
- Pulls tool execution **out of** individual provider helpers.
- Implements a shared **agent loop** capable of multi‑step tool calling and reasoning.
- Honors **Ask / Plan / Agent** semantics via policy‑driven configuration.
- Works across OpenAI, Gemini, Anthropic, and Ollama, with room to plug in OpenAI Agents SDK or LangChain later if desired.

The recommended implementation order is:
1. Core types + provider adapters + agent runner for Agent mode.
2. Extend Ask/Plan modes to use the agent infrastructure.
3. Add Anthropic tool support and richer UI around agent steps.
4. Iterate on prompts, policies, and configuration based on real‑world usage.

