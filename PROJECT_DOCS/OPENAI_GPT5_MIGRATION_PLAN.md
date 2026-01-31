# OpenAI GPT‑5 Migration Plan

This document describes how to migrate the LLM Chat UI from OpenAI GPT‑4‑series chat completions to GPT‑5‑series models using the new **Responses API**, and how to remove all GPT‑4 models from the UI.

The goal is to:
- Only support these OpenAI models: `gpt-5-nano`, `gpt-5-mini`, `gpt-5`, `gpt-5.1`
- Use the **Responses API** instead of the legacy `chat/completions` API for OpenAI
- Preserve existing behavior for Gemini, Anthropic, and Ollama
- Keep MCP tool calling working with GPT‑5

> NOTE: The exact details of the Responses API and GPT‑5 models should be confirmed against the latest OpenAI docs:
> - https://platform.openai.com/docs/guides/latest-model  
> - https://platform.openai.com/docs/guides/migrate-to-responses  
> This plan calls out where those docs must be consulted during implementation.

---

## 1. Current Implementation Overview

**Frontend API layer**
- `src/utils/llm.ts`
  - `callOpenAIChat(...)`:
    - Builds `openaiMessages` as an array of `{ role, content }` messages (including optional system messages for mode and tools).
    - Calls `POST {baseUrl}/chat/completions` (default `https://api.openai.com/v1`) with:
      - `model: config.model`
      - `messages: openaiMessages`
      - `tools` / `tool_choice` when MCP tools are available (OpenAI function calling format).
    - Parses `data.choices[0].message`:
      - If `message.tool_calls` exists, executes tools via `mcpClientManager` / `LOCAL_TOOLS` and returns a synthetic textual summary.
      - Otherwise returns `message.content` as plain text.
  - `convertMCPToolsToOpenAI(...)` converts MCP tools to the OpenAI `tools: [{ type: "function", function: { ... } }]` format.
  - `callCloudLLM(...)` routes `provider === 'openai'` to `callOpenAIChat(...)`.

**Cloud model selection UI**
- `src/components/ChatPanel.tsx`
  - `CLOUD_MODEL_OPTIONS` defines available cloud models:
    - `openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']`
    - `gemini: [...]`, `anthropic: [...]`.
  - Cloud config selector:
    - Defaults the provider to `'openai'`.
    - Uses `CLOUD_MODEL_OPTIONS[provider]` to populate the model `<select>`.
    - Persists `CloudLLMConfig` via `saveCloudLLMConfig(...)` / `loadCloudLLMConfig(...)`.

**Config persistence**
- `src/utils/storage.ts`
  - `saveCloudLLMConfig` stores `{ provider, model, baseUrl }` in `localStorage`.
  - `loadCloudLLMConfig` reads the JSON back without validating model names.
  - Existing users may have OpenAI models like `gpt-4.1` stored.

**Environment & docs**
- `.env.example` / `.env`
  - Use `VITE_OPENAI_API_KEY` for OpenAI.
- `src/utils/llm.ts`
  - `getCloudApiKey` reads `VITE_OPENAI_API_KEY` when `config.provider === 'openai'`.
- `README.md`
  - Describes OpenAI usage generically as “ChatGPT” with no GPT‑5 terminology yet.

---

## 2. Target State (Post‑Migration)

**Supported OpenAI models**
- Replace all GPT‑4/4.1/4o models with:
  - `gpt-5-nano`
  - `gpt-5-mini`
  - `gpt-5`
  - `gpt-5.1`
- Make `gpt-5-nano` (or `gpt-5-mini`) the default for new configs to keep latency/cost low.

**API usage**
- Replace `POST /chat/completions` with `POST /responses` for OpenAI.
- Continue to use `fetch` from the frontend for now (no architectural change to move calls to the backend).
- Keep the existing `CloudLLMConfig` shape:
  - `provider: 'openai' | 'gemini' | 'anthropic'`
  - `model: string`
  - `apiKey?: string`
  - `baseUrl?: string` (still defaulting to `https://api.openai.com/v1`).

**MCP tools**
- Continue exposing MCP tools to OpenAI via the `tools` array.
- Adjust tool call parsing to the Responses API response format, still mapping back to `MCPToolCall[]` for display.

**Temperature and sampling**
- Current code does **not** send `temperature` to OpenAI at all, which is safe given GPT‑5’s potentially different handling.
- Keep that behavior:
  - Do **not** send `temperature` or other sampling parameters by default for GPT‑5.
  - If we add advanced controls later, gate them per‑model after checking the docs.

---

## 3. Migration Steps

### 3.1. Update model options and config handling

**3.1.1. Replace OpenAI model list in the UI**
- File: `src/components/ChatPanel.tsx`
- Update `CLOUD_MODEL_OPTIONS`:
  - Replace:
    - `openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],`
  - With:
    - `openai: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'],`
- This instantly removes GPT‑4 models from the dropdown and introduces the GPT‑5 family.

**3.1.2. Handle existing persisted configs**
- File: `src/utils/storage.ts` (or `ChatPanel` when loading config)
- Problem:
  - Existing users may have `cloud_llm_config` in `localStorage` pointing at e.g. `gpt-4.1`.
  - After the model list change, that model may no longer appear in the options.
- Plan:
  - When loading `CloudLLMConfig` **and** `provider === 'openai'`:
    - If `config.model` is **not** one of `['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1']`, normalize it to a default (e.g. `gpt-5-nano`).
  - This can be done either:
    - In `loadCloudLLMConfig`, by post‑processing the returned config, or
    - In `ChatPanel` right after calling `loadCloudLLMConfig`, before passing it into state.
- This ensures the UI always shows a valid GPT‑5 model and avoids broken selects.

**3.1.3. Optional: surface model family in the UI copy**
- Optionally update the provider label (in `ChatPanel` and/or README) to clarify that OpenAI now uses GPT‑5 by default:
  - E.g., change "ChatGPT / Gemini / Claude" to "OpenAI GPT‑5 / Gemini / Claude".

---

### 3.2. Switch OpenAI calls to the Responses API

**3.2.1. Rename and repurpose OpenAI function (optional)**
- File: `src/utils/llm.ts`
- Today:
  - `callOpenAIChat(...)` is tightly coupled to `/chat/completions`.
- Two options:
  1. **Minimal change** (recommended):
     - Keep the function name `callOpenAIChat` to avoid touching call sites.
     - Internally switch it to use `/responses` instead of `/chat/completions`.
  2. **Explicit naming**:
     - Rename to `callOpenAIResponses(...)` and update `callCloudLLM` to call the new name.
- The minimal approach is fine as long as the internal behavior is clearly documented with comments.

**3.2.2. Build the Responses API payload**
- File: `src/utils/llm.ts` in `callOpenAIChat(...)`
- Replace the old `requestBody` shape:
  - Old:
    - `{ model, messages, tools?, tool_choice? }` for `/chat/completions`.
  - New (conceptual):
    - `POST {baseUrl}/responses`
    - Body:
      ```ts
      const requestBody: any = {
        model: config.model,                    // 'gpt-5-nano' etc.
        input: openaiMessages,                  // array of { role, content }
        tools: mcpTools.length ? convertMCPToolsToOpenAI(mcpTools) : undefined,
        tool_choice: mcpTools.length ? 'auto' : undefined,
        // Optionally:
        // max_output_tokens: 1024,             // if recommended/required by docs
        // metadata: { /* optional trace/debug info */ },
      };
      ```
- Important:
  - Confirm in the latest docs that passing `input` as an array of `{ role, content }` messages is supported (it is in the current Responses API).
  - Ensure we **do not** send `temperature` or other sampling settings unless explicitly supported by GPT‑5 (current code already does not send it).

**3.2.3. Call the new endpoint**
- Replace the `fetch` URL in `callOpenAIChat`:
  - From:
    - ``fetch(`${baseUrl}/chat/completions`, { ... })``
  - To:
    - ``fetch(`${baseUrl}/responses`, { ... })``
- Keep:
  - `baseUrl` defaulting to `'https://api.openai.com/v1'`.
  - `Authorization: Bearer ${apiKey}` header.
  - JSON `Content-Type` header.

---

### 3.3. Adapt response parsing to Responses API

**3.3.1. Understand the Responses object shape**
- According to the docs, a typical Responses API call returns an object similar to:
  - `id`, `model`, `created`, `output`, `usage`, possibly `steps` for tool calls.
- The `output` field contains the assistant’s results:
  - For pure text:
    - It is usually a list of segments where at least one segment contains the text output.
  - For tool calls:
    - Some segments (or steps) represent tool invocations rather than plain text.
- During implementation:
  - Re‑check the current docs for GPT‑5 to confirm the exact fields to read for:
    - Final assistant text.
    - Tool call(s) generated by the model.

**3.3.2. Extract assistant text**
- Goal: preserve the return type of `callOpenAIChat(...)`:
  - `Promise<{ content: string; toolCalls?: MCPToolCall[] }>`
- Plan:
  - From the Responses object, locate the "assistant text" (e.g., within `response.output` or any equivalent field).
  - Extract it into a plain string:
    - Example (conceptual, not final code):
      ```ts
      const output = data.output?.[0];
      const textSegment = output?.content?.find(
        (part: any) => part.type === 'output_text' || part.type === 'text',
      );
      const content = textSegment?.text?.trim() || '';
      ```
  - Keep the same validation behavior:
    - If no usable text is found, throw an error similar to the current `"OpenAI returned an empty response"`.

**3.3.3. Extract and execute tool calls**
- Today, tool calls are read from:
  - `choice.message.tool_calls` in the Chat Completions response.
- With Responses:
  - Tool calls may appear as dedicated segments or steps (e.g., `data.steps` entries where `type` indicates a tool call).
  - Implementation must:
    - Inspect the Responses payload for any tool call structures defined in the latest docs.
    - For each tool call:
      - Extract the tool/function name.
      - Parse arguments (already JSON in our current flow).
      - Map them to `MCPToolCall` objects.
      - Execute via `mcpClientManager.callTool(...)` or `executeLocalTool(...)`, same as today.
- Output format:
  - Keep the same behavior as the existing `callOpenAIChat`:
    - If tool calls are generated:
      - Execute them.
      - Build a textual summary (e.g., `"Tool X result: ..."`).
      - Return `{ content: toolResultsText, toolCalls }`.
    - If no tool calls:
      - Return `{ content }` with the assistant’s text.

**3.3.4. Keep non‑OpenAI providers unchanged**
- Ensure `callGemini(...)`, `callAnthropic(...)`, and `callOllama(...)` remain untouched.
- `callCloudLLM(...)` should still route:
  - `openai` → updated `callOpenAIChat` (now Responses API)
  - `gemini` → `callGemini`
  - `anthropic` → `callAnthropic`

---

### 3.4. Environment and documentation updates

**3.4.1. .env and API keys**
- `.env.example` / `.env`:
  - Keep `VITE_OPENAI_API_KEY` as the only required var for OpenAI.
  - Optionally document that GPT‑5 models are used via the Responses API:
    - E.g., comment: `# Used for GPT-5 via the OpenAI Responses API`.
- No changes are needed in `getCloudApiKey` in `src/utils/llm.ts` aside from possibly updating error messaging to mention GPT‑5.

**3.4.2. README and project docs**
- File: `README.md`
  - Update the description of cloud models to mention GPT‑5:
    - For example, change:
      - "Cloud LLM Support – Talk to OpenAI (ChatGPT), Google Gemini, and Anthropic Claude"
    - To something like:
      - "Cloud LLM Support – Talk to OpenAI GPT‑5 models, Google Gemini, and Anthropic Claude"
  - In the configuration section, clarify:
    - The app uses the OpenAI **Responses API** for GPT‑5 models.
    - Supported OpenAI models: `gpt-5-nano`, `gpt-5-mini`, `gpt-5`, `gpt-5.1`.

**3.4.3. Optional: add a short developer note**
- You can add a short section in `PROJECT_DOCS` (or here) documenting:
  - “Our frontend uses the OpenAI Responses API directly via `fetch`. If in the future we move calls to the backend or adopt the official OpenAI SDK, this is the primary place to refactor.”

---

## 4. Testing Plan

**4.1. Basic chat flow with GPT‑5**
- Pre‑conditions:
  - `.env` has a valid `VITE_OPENAI_API_KEY` with GPT‑5 access.
  - `npm install` has been run.
- Steps:
  1. Run `npm run dev`.
  2. Open the UI in the browser.
  3. Select backend: `Cloud`.
  4. Provider: `OpenAI`.
  5. Model: `gpt-5-nano` (or `gpt-5-mini`).
  6. Send a few natural language prompts and verify:
     - Responses are returned successfully.
     - No references to GPT‑4 models remain in the UI.

**4.2. Tool‑calling with MCP**
- Pre‑conditions:
  - At least one MCP server is configured and connected (e.g., file tools).
  - The server exposes tools (visible in the UI).
- Steps:
  1. In the chat, ask the model to call a known MCP tool (e.g., “List files in X”).
  2. Confirm that:
     - GPT‑5 uses tools appropriately.
     - Tool executions appear in the UI as `toolCalls` entries (same visual style as today).
     - The returned `content` in the chat bubble includes a readable summary of tool results.

**4.3. Regression checks for other providers**
- With the same UI:
  - Switch provider to `Gemini`, then `Anthropic`, and verify:
    - Chatting still works with their existing models.
    - No behavior regressions from changes in `callCloudLLM`.

**4.4. Local storage / config migration**
- Clear local storage and reload:
  - Ensure default OpenAI config uses a GPT‑5 model.
- Simulate legacy configs:
  - Manually set `cloud_llm_config` in LocalStorage to an old OpenAI model (e.g., `gpt-4.1`).
  - Reload the app and confirm:
    - The config is normalized to a supported GPT‑5 model (e.g., `gpt-5-nano`).
    - The dropdown shows a valid GPT‑5 selection; no crashes or empty options.

---

## 5. Implementation Order Summary

When you’re ready to implement, this is a practical execution order:

1. **Update UI model list and config normalization**
   - Change `CLOUD_MODEL_OPTIONS.openai` to GPT‑5 models.
   - Add normalization for old OpenAI configs in `loadCloudLLMConfig` or `ChatPanel`.
2. **Switch the OpenAI call to the Responses API**
   - Modify `callOpenAIChat` to send `POST /responses` with `input: openaiMessages`.
   - Keep `tools` / `tool_choice` wiring.
3. **Adapt response parsing**
   - Update `callOpenAIChat` to:
     - Extract assistant text from the Responses object.
     - Parse and execute tool calls from the new structure.
   - Maintain the `{ content, toolCalls? }` return type.
4. **Update docs and env comments**
   - Adjust `README.md` and `.env.example` to call out GPT‑5 models and Responses API usage.
5. **Run the testing plan**
   - Validate GPT‑5 chat, MCP tools, and other providers.
   - Fix any issues discovered during manual testing.

Once all of the above is done, the app will be fully migrated to GPT‑5 models via the OpenAI Responses API, with GPT‑4‑series models removed from the UI and configuration.
