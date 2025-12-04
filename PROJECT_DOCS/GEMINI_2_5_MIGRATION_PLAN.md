# Google Gemini 2.5+ Migration Plan

This document describes how to migrate the LLM Chat UI from **Gemini 1.5** models to the newer **Gemini 2.5** and **Gemini 3 Pro** models using the latest Gemini API, and how to phase out Gemini 1.5 from the UI.

The goals are to:
- Only expose these Gemini text chat models in the UI:
  - `gemini-2.5-flash-lite`
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-3-pro` / `gemini-3-pro-preview` (depending on what the docs say when you implement)
- Continue to use the **`v1beta` `:generateContent` REST API** for Gemini, aligned with the latest docs
- Keep the `CloudLLMConfig` shape and call sites unchanged
- Avoid any regressions for OpenAI, Anthropic, and Ollama

> NOTE: The exact model IDs, default recommendations, and any required parameters must be confirmed against the latest Google docs when you implement this plan:
> - https://ai.google.dev/gemini-api/docs/models  
> - https://ai.google.dev/gemini-api/docs#rest  
> This document calls out where you should re-check those docs.

---

## 1. Current Implementation Overview

**Frontend API layer**
- File: `src/utils/llm.ts`
  - `callGemini(messages, config, mode)`:
    - Uses `buildPromptFromMessages(messages)` to flatten the full chat history into a single text prompt:
      - Messages are sorted by timestamp and formatted as `"User: ..."`, `"Assistant: ..."`, `"System: ..."`, joined with blank lines.
    - Prepends an optional mode-specific system prompt from `getModeSystemPrompt(mode)` (`ask`, `plan`, `agent`).
    - Obtains the API key via `getCloudApiKey(config)`:
      - For `config.provider === 'gemini'` it reads `VITE_GEMINI_API_KEY` if `config.apiKey` is not set.
    - Builds a fixed REST URL:
      ```ts
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          config.model,
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      ```
      - Note: `config.baseUrl` is **not** used for Gemini today.
    - Sends a `POST` request with JSON body:
      ```jsonc
      {
        "contents": [
          {
            "parts": [{ "text": "<flattened prompt>" }]
          }
        ]
      }
      ```
      - No `generationConfig`, `safetySettings`, or `tools` are sent.
    - Parses the response as:
      - `data?.candidates?.[0]?.content?.parts?.map(part => part?.text)`  
      - Joins any non-empty texts into a single `content` string.
      - Throws if `response.ok` is false or if the final `content` is empty.
    - Returns `{ content: string }` (no tool calls for Gemini).
  - `callCloudLLM(...)`:
    - Switches on `config.provider`:
      - `'gemini'` → calls `callGemini(messages, config, mode)`.

**Cloud model selection UI**
- File: `src/components/ChatPanel.tsx`
  - `CLOUD_MODEL_OPTIONS` currently defines:
    ```ts
    const CLOUD_MODEL_OPTIONS: Record<CloudLLMConfig['provider'], string[]> = {
      openai: ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'],
      gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    };
    ```
  - The header UI:
    - Lets the user choose provider (`openai` / `gemini` / `anthropic`).
    - Chooses the model from `CLOUD_MODEL_OPTIONS[provider]`.
    - On provider change, sets:
      - `provider: newProvider`
      - `model: options[0] || ''` (so the first entry in `CLOUD_MODEL_OPTIONS.gemini` becomes the default Gemini model).

**Config persistence**
- File: `src/utils/storage.ts`
  - `saveCloudLLMConfig(config)`:
    - Persists only `{ provider, model, baseUrl }` to `localStorage` under `cloud_llm_config`.
  - `loadCloudLLMConfig()`:
    - Reads the stored config, casts it to `CloudLLMConfig`.
    - For OpenAI only:
      ```ts
      if (config.provider === 'openai') {
        const validModels = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'];
        if (!validModels.includes(config.model)) {
          config.model = 'gpt-5-nano';
        }
      }
      ```
    - There is **no** normalization for Gemini models:
      - Existing users may have `gemini-1.5-flash` or `gemini-1.5-pro` stored.

**Environment & docs**
- `.env.example` / `.env`
  - Contains `VITE_GEMINI_API_KEY=your-gemini-key`.
  - Comment is generic; it doesn’t mention specific Gemini model families.
- `src/utils/llm.ts`
  - `getCloudApiKey` error message references `VITE_GEMINI_API_KEY`.
- `README.md`
  - Describes cloud providers as:
    - “Cloud LLM Support – Talk to OpenAI GPT-5 models, Google Gemini, and Anthropic Claude”
  - It does not yet call out which Gemini versions/models are recommended.

---

## 2. Target State (Post‑Migration)

**Supported Gemini models**
- Replace the current Gemini 1.5 entries with the latest recommended 2.5+ models:
  - `gemini-2.5-flash-lite` – cheapest, smallest, good default for fast chat.
  - `gemini-2.5-flash` – general-purpose, high-quality text + multimodal.
  - `gemini-2.5-pro` – higher quality / capability model.
  - `gemini-3-pro` / `gemini-3-pro-preview` – top-tier reasoning and multimodal model.
- The UI should only list these models for the Gemini provider.
- Make `gemini-2.5-flash-lite` the **default** saved/initial model for Gemini to keep latency and cost low.

**API usage**
- Continue to use the Gemini REST `generateContent` endpoint for text chat:
  - Base URL (from docs):  
    `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  - Migrate from query-string key to header-based key:
    - Current: `...:generateContent?key=${apiKey}`
    - Target: header `x-goog-api-key: <API_KEY>`, no `?key=…`.
- Keep using a simple, single `contents` entry with text:
  - `contents: [{ parts: [{ text: "<prompt>" }] }]`
- Keep the `CloudLLMConfig` shape unchanged:
  - `provider: 'openai' | 'gemini' | 'anthropic'`
  - `model: string`
  - `apiKey?: string`
  - `baseUrl?: string` (not used for Gemini yet; still reserved for future customization).

**Prompting behavior**
- Keep the current behavior of flattening the full conversation into a single text prompt for now:
  - This keeps implementation simple and avoids multi-turn `contents` refactors.
- Preserve `ChatMode` semantics:
  - For `ask`, `plan`, `agent`, prepend the same mode-specific system instructions to the prompt.

**Sampling & advanced features**
- Continue **not** sending:
  - `generationConfig` (temperature, top_p, maxOutputTokens, etc.)
  - `safetySettings`
  - Tools / function-calling settings
- This keeps the integration minimal and stable.
- If you later want model-specific tuning (e.g., higher `maxOutputTokens` for `gemini-3-pro-preview`), add this in a follow-up change, after confirming the docs.

**Other providers**
- OpenAI, Anthropic, and Ollama should remain behaviorally unchanged:
  - The migration must be localized to the Gemini model list and `callGemini`.

---

## 3. Migration Steps

### 3.1. Update Gemini model options and config handling

**3.1.1. Replace Gemini model list in the UI**
- File: `src/components/ChatPanel.tsx`
- Update `CLOUD_MODEL_OPTIONS` for the `gemini` provider:
  - Replace:
    ```ts
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    ```
  - With (using exact codes from the docs at implementation time):
    ```ts
    gemini: [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3-pro-preview', // or 'gemini-3-pro' if/when stable alias exists
    ],
    ```
- Rationale:
  - The first entry (`gemini-2.5-flash-lite`) becomes the default Gemini model when the provider is switched to `gemini`.
  - Old 1.5 models disappear from the dropdown and can no longer be selected.

**3.1.2. Normalize existing persisted Gemini configs**
- File: `src/utils/storage.ts`
- Problem:
  - Existing users may have `cloud_llm_config` with:
    - `provider: 'gemini'`
    - `model: 'gemini-1.5-flash'` or `model: 'gemini-1.5-pro'`
  - After changing `CLOUD_MODEL_OPTIONS`, these model names will no longer be valid.
- Plan:
  - Extend the normalization logic in `loadCloudLLMConfig`:
    ```ts
    if (config.provider === 'gemini') {
      const validGeminiModels = [
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-3-pro-preview', // or 'gemini-3-pro'
      ];

      if (!validGeminiModels.includes(config.model)) {
        // Map known legacy models to a sensible default
        if (
          config.model === 'gemini-1.5-flash' ||
          config.model === 'gemini-1.5-pro'
        ) {
          config.model = 'gemini-2.5-flash-lite';
        } else {
          // Any unknown Gemini model falls back to the default
          config.model = 'gemini-2.5-flash-lite';
        }
      }
    }
    ```
- Outcome:
  - Any user with a legacy Gemini model will silently be migrated to `gemini-2.5-flash-lite`.
  - The config remains valid even if future Gemini models are added/removed.

### 3.2. Update the Gemini API call to align with docs

**3.2.1. Switch to header-based API key usage**
- File: `src/utils/llm.ts` in `callGemini(...)`
- Today:
  ```ts
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [...] }),
  });
  ```
- Target:
  - Remove `?key=${apiKey}` from the URL and move the key into the headers:
    ```ts
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.model,
    )}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });
    ```
- Rationale:
  - Matches the official REST example in the docs (including for `gemini-2.5-flash`).
  - Keeps credentials out of the query string, which is marginally safer and more standard.

**3.2.2. Confirm response parsing still matches new models**
- The current parsing logic:
  ```ts
  const data: any = await response.json();
  const parts: string[] =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      .filter(Boolean) || [];
  const content = parts.join(' ').trim();
  ```
- According to the docs, `generateContent` for text/chat responses retains the same fundamental shape for Gemini 2.5 and 3 Pro models.
- Implementation guidance:
  - During implementation, inspect an actual response for `gemini-2.5-flash` or `gemini-3-pro-preview` and confirm:
    - Text returns in `candidates[0].content.parts[x].text`.
    - No breaking changes to the overall JSON shape.
  - If any minor differences appear (e.g., additional fields, nested `role`), keep the logic robust by:
    - Guarding against non-array `content.parts`.
    - Ignoring parts without `text`.

**3.2.3. Keep error handling consistent**
- Maintain the existing error behavior:
  - If `!response.ok`:
    - Read `await response.text()` and throw `new Error(text || \`Gemini error (${response.status})\`)`.
  - If the final `content` string is empty:
    - Throw `new Error('Gemini returned an empty response')`.
- This ensures the UI’s error surfaces remain consistent across providers.

### 3.3. Optional: future enhancements for Gemini

These are **not required** for the migration, but are good follow-up ideas:

- **Multi-turn native chat format**
  - Instead of flattening the history into one string, use:
    - `contents: [{ role: 'user', parts: [...] }, { role: 'model', parts: [...] }, ...]`.
  - This would align more closely with Google’s recommended conversation format.
  - Requires a small refactor to map `ChatMessage[]` into Gemini’s structured `contents`.

- **Model-specific `generationConfig`**
  - Use higher `maxOutputTokens` for `gemini-3-pro-preview` in long reasoning tasks.
  - Use lower `temperature` for `plan` mode, slightly higher for `ask`.
  - All such tweaks must be implemented after confirming the recommended defaults per model in the docs.

- **Multimodal support**
  - Gemini 2.5 and 3 Pro support images, audio, and video.
  - The current UI and request builder send **text only**; extending to multimodal would require:
    - UI changes to attach images or other media.
    - Encoding those into `parts` (`inline_data`, `file_data`, etc.).
    - Out of scope for this migration plan.

---

## 4. Testing Plan

**4.1. Basic chat flow with Gemini 2.5 models**
- Pre-conditions:
  - `.env` has a valid `VITE_GEMINI_API_KEY` with access to 2.5 / 3 Pro models.
  - `npm install` has been run.
- Steps:
  1. Run `npm run dev`.
  2. Open the UI in the browser.
  3. Select backend: `Cloud`.
  4. Provider: `Google` (`gemini`).
  5. Model: `gemini-2.5-flash-lite`.
  6. Send several prompts and verify:
     - Responses are returned successfully.
     - No references to `gemini-1.5-*` appear in the dropdown or in stored configs.

**4.2. Try all supported models**
- Repeat the above flow for:
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-3-pro-preview` (or `gemini-3-pro`)
- Verify:
  - All models respond without errors.
  - Latency/behavior roughly matches expectations (Flash-Lite < Flash < Pro < 3 Pro).

**4.3. LocalStorage / config migration**
- Simulate a legacy config:
  1. In the browser devtools, set `localStorage['cloud_llm_config']` to:
     ```json
     {"provider":"gemini","model":"gemini-1.5-flash"}
     ```
  2. Reload the app.
  3. Confirm:
     - `loadCloudLLMConfig` normalizes the model to `gemini-2.5-flash-lite`.
     - The dropdown shows `gemini-2.5-flash-lite` selected.
     - Chat works without errors.
- Repeat with:
  - `model: 'gemini-1.5-pro'`
  - `model: 'some-unknown-gemini-model'`
  - Both should end up as `gemini-2.5-flash-lite`.

**4.4. Regression checks for other providers**
- OpenAI:
  - Verify GPT-5 models still appear and function as before.
  - Sanity-check at least one chat with `gpt-5-nano`.
- Anthropic:
  - Sanity-check chats with `claude-3-5-sonnet` or `claude-3-haiku`.
- Ollama:
  - Ensure Ollama model discovery and chat still work; Gemini changes should not affect local LLM behavior.

---

## 5. Implementation Order Summary

Use this as the practical checklist when you actually implement the migration:

1. **Update Gemini model list in the UI**
   - Change `CLOUD_MODEL_OPTIONS.gemini` in `ChatPanel.tsx` to the 2.5+ and 3 Pro models.
2. **Add Gemini config normalization**
   - Extend `loadCloudLLMConfig` in `storage.ts` to remap old Gemini models (`gemini-1.5-*` and unknowns) to `gemini-2.5-flash-lite`.
3. **Align the Gemini API call with docs**
   - In `callGemini`, switch to header-based `x-goog-api-key`.
   - Keep using `v1beta` `:generateContent` with text-only `contents`.
   - Confirm response parsing works for `gemini-2.5-flash` and `gemini-3-pro-preview`.
4. **Update docs if desired**
   - Optionally, adjust `README.md` and/or `.env.example` comments to mention that the app targets Gemini 2.5+/3 Pro models.
5. **Run the testing plan**
   - Verify Gemini 2.5 and 3 Pro flows, localStorage migration, and non-Gemini providers.

Once these steps are complete, the app will have fully migrated off Gemini 1.5 and onto Gemini 2.5+ models, with a clean, documented path forward for future Gemini model updates.

