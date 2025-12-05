# FBT Basic Function Block File View – Implementation Plan

This document describes how to add a **specialized viewer for IEC 61499 `.fbt` files** (Function Blocks) in the existing PLC IDE, focused on **Basic Function Blocks**. The goal is that when the user clicks a Basic FB `.fbt` file in the explorer, the center panel shows a structured view with small sub‑tabs:

- **Interface** – Events, data inputs/outputs and their associations, plus an overview of the function block.
- **ECC** – Execution Control Chart as a state diagram (if present).
- **Algorithms** – All algorithms and their Structured Text bodies (if present).

Raw XML editing should remain possible via a “Raw XML” or similar sub‑tab.

---

## 1. Scope & Goals

- **In scope (first iteration)**
  - `.fbt` files that define a **BasicFB** (e.g. `SkillGoToLeft.fbt` in `TASK_DOCS/FESTO_DS_skills/IEC61499`).
  - **Read‑only visualization** of:
    - Interface (events, variables, event–data associations).
    - ECC states and transitions.
    - Algorithms and their ST code.
  - A small **tab bar inside the editor area** to switch between:
    - `Interface` / `ECC` / `Algorithms` / `Raw XML`.
  - Graceful handling of malformed or unsupported `.fbt` files (fallback to raw editor).

- **Out of scope (for now)**
  - Editing the ECC graph or algorithms directly from the structured view.
  - Composite / Service FBs, Subapps, Resources, Systems.
  - Backend changes – everything happens client‑side using the existing file APIs.

---

## 2. Current Implementation Overview (Relevant Parts)

### 2.1 File loading and editor

- `src/App.tsx`
  - `handleFileSelect(node: FileNode)`:
    - Reads file content using `FileSystemAPI.readFile(node.path)` (or native FS handle).
    - Creates an `EditorTab`:
      - `id`, `path`, `name`, `content`, `modified`, `language`.
      - Language comes from `FileSystemAPI.getFileLanguage(filename)`.
    - Adds the tab to `editorTabs` and sets `activeTabId`.
  - Renders central editor panel via:
    - `<CodeEditor tabs={editorTabs} activeTabId={activeTabId} ... />`.

- `src/components/CodeEditor.tsx`
  - Renders the **tab strip per file** at the top.
  - Renders a single `Editor` (Monaco) instance for the active tab:
    - `language={activeTab.language || 'plaintext'}`
    - `value={activeTab.content}`
  - Handles content changes and save operations via props.
  - Currently **does not vary** the editor UI by file type – all files are plain text editors.

### 2.2 File system and types

- `src/utils/file-api.ts`
  - `FileSystemAPI.readFile(path)` / `writeFile(path, content)` – already support arbitrary file types including `.fbt`.
  - `getFileLanguage(filename: string)`:
    - Maps known extensions to editor languages (e.g. `st`, `js`, `ts`, `json`, `xml`, `txt`).
    - Currently has **no special handling for `.fbt`**, so they end up as `plaintext`.

- `src/types/ide-types.ts`
  - `EditorTab` type:
    - `id`, `path`, `name`, `content`, `modified`, `language?`, `fileHandle?`.
  - No FBT‑specific types exist yet.

### 2.3 Example `.fbt` structure

From `TASK_DOCS/FESTO_DS_skills/IEC61499/SkillGoToLeft.fbt`:

- Root: `<FBType ... Name="SkillGoToLeft" ...>`
- Interface:
  - `<InterfaceList>`
    - `<EventInputs>` → `<Event Name="INIT" ...>` with `<With Var="at_mgz" />`, etc.
    - `<EventOutputs>` → `<Event Name="INITO" ...>`, `<Event Name="CNF" ...>`, etc.
    - `<InputVars>` → `<VarDeclaration Name="at_mgz" Type="BOOL" />`, etc.
    - `<OutputVars>` → `<VarDeclaration Name="to_mgz" Type="BOOL" />`, etc.
- Basic FB behavior:
  - `<BasicFB>`
    - `<ECC>` → `<ECState>` nodes with optional `<ECAction Algorithm="..." Output="..." />`.
    - `<ECTransition Source="..." Destination="..." Condition="..." />`.
    - `<Algorithm Name="..." ...>` → `<ST><![CDATA[...]]></ST>`.

These patterns are stable enough to build a type‑safe parser and UI on top.

---

## 3. Target User Experience

### 3.1 High‑level flow

- User opens the project directory in the **File Explorer**.
- User clicks a `.fbt` file (e.g. `SkillGoToLeft.fbt`).
- In the center panel:
  - The existing file tab strip shows the file name as usual.
  - Below it, a new **secondary tab bar** appears with:
    - `Interface` | `ECC` | `Algorithms` | `Raw XML`
  - Default sub‑tab: `Interface`.

### 3.2 Sub‑tab behaviors

- **Interface tab**
  - At the top, show basic FB metadata:
    - Name, Comment, Namespace, GUID, VersionInfo.
  - Show a **three‑column layout** (responsive stack on small screens):
    - **Event Inputs**:
      - Table: `Event`, `Comment`, `Associated Data Inputs`.
      - Associations resolved from `<With Var="...">` elements.
    - **Event Outputs**:
      - Table: `Event`, `Comment`, `Associated Data Outputs`.
    - **Data Variables**:
      - Two subtables:
        - **InputVars**: `Name`, `Type`, `Comment`, `Used By Events`.
        - **OutputVars**: same fields.
  - If parsing fails or the file is not a BasicFB:
    - Show a clear message and offer a button / link to switch to `Raw XML`.

- **ECC tab**
  - If `<ECC>` exists under `<BasicFB>`:
    - Show a **state diagram view**:
      - Nodes for each `ECState`:
        - Display state `Name`, optional `Comment`.
        - Highlight the initial state (e.g. `START`) with a special style.
        - Show the associated `ECAction`s (Algorithm / Output) in small tags.
      - Directed edges for each `ECTransition`:
        - Label with `Condition`.
      - Simple layout (e.g. auto‑generated grid or layered layout).
    - Also provide a **tabular fallback**:
      - States table: `Name`, `Comment`, `Actions`.
      - Transitions table: `Source`, `Destination`, `Condition`.
  - If no ECC:
    - Show “No ECC defined in this BasicFB” and fall back to a simple table or nothing.

- **Algorithms tab**
  - List all `<Algorithm>` elements:
    - Table/list of `Name`, `Comment`, and `Used in States` (derived from `ECAction` references).
  - Selecting an algorithm:
    - Shows its `ST` body in an embedded code viewer (Monaco editor in read‑only mode).
    - Use `language="plaintext"` initially, with future option for a custom ST language.

- **Raw XML tab**
  - Shows the existing Monaco editor:
    - Full XML content (editable).
    - Keeps current save behavior (Ctrl/Cmd+S).
  - This is the escape hatch for any unsupported cases.

---

## 4. FBT Data Model & Parsing

### 4.1 Types to introduce

Add new FBT‑specific types in `src/types/fbt-types.ts`:

- `FbtVarDirection = 'input' | 'output';`
- `FbtVar`
  - `name: string`
  - `type: string`
  - `comment?: string`
  - `direction: FbtVarDirection`
  - `usedByEvents: string[]` (event names)
- `FbtEventDirection = 'input' | 'output';`
- `FbtEvent`
  - `name: string`
  - `comment?: string`
  - `direction: FbtEventDirection`
  - `associatedVars: string[]` (variable names)
- `FbtEccAction`
  - `algorithm?: string`
  - `output?: string`
- `FbtEccState`
  - `name: string`
  - `comment?: string`
  - `x?: number`
  - `y?: number`
  - `actions: FbtEccAction[]`
- `FbtEccTransition`
  - `source: string`
  - `destination: string`
  - `condition: string`
  - `x?: number`
  - `y?: number`
- `FbtAlgorithm`
  - `name: string`
  - `comment?: string`
  - `language: 'ST' | 'unknown'`
  - `body: string`
- `FbtBasicFb`
  - `name: string`
  - `comment?: string`
  - `namespace?: string`
  - `guid?: string`
  - `version?: string`
  - `author?: string`
  - `date?: string`
  - `events: FbtEvent[]`
  - `vars: FbtVar[]`
  - `ecc?: { states: FbtEccState[]; transitions: FbtEccTransition[] }`
  - `algorithms: FbtAlgorithm[]`

These types are purely frontend and do not affect backend APIs.

### 4.2 Parser implementation

Add `src/utils/fbt-parser.ts` with:

- `parseFbtBasicFb(xmlText: string): FbtBasicFb | null`
  - Use `DOMParser` (browser API) to parse XML:
    - `const doc = new DOMParser().parseFromString(xmlText, 'application/xml');`
  - Detect parse errors:
    - Check for `parsererror` elements and return `null` (or throw) if present.
  - Locate `<FBType>` root:
    - Read attributes: `Name`, `Comment`, `Namespace`, `GUID`.
  - Extract `Identification` / `VersionInfo` details when present.
  - Find `<BasicFB>`:
    - If not present → return `null` (treated as not a BasicFB; UI will show raw XML).

#### 4.2.1 Interface parsing

- Locate `<InterfaceList>` and within it:
  - `<InputVars>` / `<OutputVars>`:
    - For each `<VarDeclaration>`:
      - Extract `Name`, `Type`, optional `Comment`.
      - Build `FbtVar` with `direction: 'input' | 'output'`.
      - Temporarily store in maps keyed by name for association resolution.
  - `<EventInputs>` / `<EventOutputs>`:
    - For each `<Event>`:
      - Extract `Name`, optional `Comment`.
      - Collect associated `<With Var="...">` values into `associatedVars`.
      - Build `FbtEvent` (`direction: 'input' | 'output'`).
  - After reading events, update each `FbtVar.usedByEvents`:
    - For each event’s `associatedVars`, look up the `FbtVar` by name and append the event name.

#### 4.2.2 ECC parsing

- Under `<BasicFB>`, find `<ECC>`:
  - For each `<ECState>`:
    - Read `Name`, optional `Comment`, optional `x`/`y` attributes (numbers if parsable).
    - Collect child `<ECAction>` elements:
      - Attributes `Algorithm`, `Output`.
      - Map to `FbtEccAction`.
    - Build `FbtEccState`.
  - For each `<ECTransition>`:
    - Read `Source`, `Destination`, `Condition`, `x`, `y`.
    - Build `FbtEccTransition`.
  - Wrap into `{ states, transitions }`.
  - If ECC is missing or empty, set `ecc` to `undefined` and let the UI show a friendly message.

#### 4.2.3 Algorithms parsing

- Under `<BasicFB>`, for each `<Algorithm>`:
  - Extract `Name`, optional `Comment`.
  - Read the `<ST>` child:
    - Concatenate text and CDATA contents into `body`.
  - Build `FbtAlgorithm` with `language: 'ST'` when `<ST>` is present, otherwise `'unknown'`.

#### 4.2.4 Error handling

- The parser should:
  - Catch exceptions and either return `null` or throw a controlled error.
  - Be tolerant of missing sections (e.g. no ECC, no Algorithms).
  - Avoid failing the entire view for minor inconsistencies (e.g. missing `Comment`).

---

## 5. UI Components for FBT View

Create a small component family under `src/components/fbt/` to keep concerns isolated.

### 5.1 Main wrapper: `FbtBasicFbView`

File: `src/components/fbt/FbtBasicFbView.tsx`

- Props:
  - `content: string` (raw XML from the active editor tab).
  - `path: string` (file path, for display).
- Behavior:
  - On mount / when `content` changes:
    - Call `parseFbtBasicFb(content)`.
    - Maintain local state: `{ parsed: FbtBasicFb | null; error?: string }`.
  - If parsing fails or `parsed === null`:
    - Show a centered error message:
      - “This `.fbt` file is not a Basic Function Block or could not be parsed.”
    - Provide a button that switches the **sub‑tab** to `Raw XML`.
  - If parsing succeeds:
    - Render:
      - A small header with the FB name and comments.
      - An internal tab bar for `Interface`, `ECC`, `Algorithms`, `Raw XML` (controlled by `useState`).
      - Tab content area where we conditionally render:
        - `<FbtInterfaceTab fb={parsed} />`
        - `<FbtEccTab fb={parsed} />`
        - `<FbtAlgorithmsTab fb={parsed} />`
        - `<FbtRawXmlTab content={content} />` (reusing Monaco).

### 5.2 Interface tab: `FbtInterfaceTab`

File: `src/components/fbt/FbtInterfaceTab.tsx`

- Props:
  - `fb: FbtBasicFb`.
- Layout ideas (Tailwind classes, consistent with existing UI):
  - Top meta section:
    - FB name, namespace, GUID, version, author/date.
  - Main body:
    - Responsive layout using `grid grid-cols-1 md:grid-cols-3 gap-4`.
    - Column 1 – **Event Inputs** table:
      - Columns: `Event`, `Comment`, `Data Inputs`.
    - Column 2 – **Event Outputs** table:
      - Columns: `Event`, `Comment`, `Data Outputs`.
    - Column 3 – **Data Variables**:
      - Section: `Input Variables` table:
        - `Name`, `Type`, `Comment`, `Used by Events`.
      - Section: `Output Variables` table:
        - Same columns.

### 5.3 ECC tab: `FbtEccTab`

File: `src/components/fbt/FbtEccTab.tsx`

- Props:
  - `fb: FbtBasicFb`.
- Behavior:
  - If `!fb.ecc` or `fb.ecc.states.length === 0`:
    - Show a message: “No ECC defined for this BasicFB.”
    - Optionally show a small states/transitions list if partially present.
  - Else:
    - Split view:
      - Top / left: **graph canvas** for the state diagram.
      - Bottom / right: **tabular detail** of states/transitions.

#### 5.3.1 Graph rendering (Phase 1 – simple, library‑free)

- Implement a basic diagram using:
  - An `<svg>` element sized to the container.
  - Place nodes on a simple grid:
    - For now, ignore original `x`/`y` coordinates or use them only as hints.
    - Example: arrange states in rows/columns based on index.
  - For each `FbtEccState`:
    - Draw a rounded rectangle with the state name inside.
    - Highlight `START` or any initial state by style (e.g. thicker border, different color).
    - Show count of actions or short labels (`INIT`, `GoToMag`, etc.).
  - For each `FbtEccTransition`:
    - Draw a line/arrow from source node center to destination node center.
    - Label the edge with the `condition` near the middle.

> Later, we can evolve this into a more sophisticated layout using a graph layout library (see Section 8).

#### 5.3.2 Tabular fallback

- Below the diagram (or in a side panel):
  - **States table**:
    - `Name`, `Comment`, `Actions (Algorithm → Output)`.
  - **Transitions table**:
    - `Source`, `Destination`, `Condition`.

### 5.4 Algorithms tab: `FbtAlgorithmsTab`

File: `src/components/fbt/FbtAlgorithmsTab.tsx`

- Props:
  - `fb: FbtBasicFb`.
- Layout:
  - Left side: list of algorithms.
    - List items show `Name`, `Comment`, and `Used In` (states that reference it).
  - Right side: read‑only code viewer for the selected algorithm:
    - Use the existing `@monaco-editor/react` `Editor` component with:
      - `language="plaintext"` (or configurable later).
      - `options={{ readOnly: true, ... }}`.
  - Default selection: first algorithm if any.

### 5.5 Raw XML tab: `FbtRawXmlTab`

File: `src/components/fbt/FbtRawXmlTab.tsx`

- A thin wrapper around the existing `Editor` component:
  - Props: `content: string; onChange?: (value: string) => void; language?: string;`.
  - For now, we can reuse most of the logic directly from `CodeEditor`’s editor section or keep this component very simple and let `CodeEditor` handle raw editing (see integration below).

---

## 6. Integration with `CodeEditor`

We want the **existing top‑level tab bar** to remain unchanged, and only the **inner content area** for `.fbt` files to switch to the specialized view.

### 6.1 Detecting `.fbt` files

In `src/components/CodeEditor.tsx`:

- After computing `activeTab`, add:
  - `const isFbtFile = activeTab?.name.toLowerCase().endsWith('.fbt');`

### 6.2 Adding the FBT sub‑view

Update the main render branch for `activeTab`:

- Instead of always rendering the `Editor`, branch:
  - If `isFbtFile`:
    - Render `FbtBasicFbView` **or** a small wrapper that includes:
      - Internal secondary tab bar (`Interface` / `ECC` / `Algorithms` / `Raw XML`).
      - For `Raw XML`, render the existing `Editor`:
        - Preserve `onChange` / `onSave` behavior as today.
  - Else:
    - Render the existing `Editor` as is.

Implementation details:

- Add a piece of state in `CodeEditor` for the **per‑file sub‑tab**:
  - Simple version: `const [fbtViewTab, setFbtViewTab] = useState<'interface' | 'ecc' | 'algorithms' | 'raw'>('interface');`
  - On `activeTabId` change, reset `fbtViewTab` to `'interface'`.
  - If more precision is later needed, we can store per‑tab preferences in a `Map<string, FbtViewTab>`.
- Pass `activeTab.content` into `FbtBasicFbView`.
- For the `Raw XML` sub‑tab:
  - Reuse the same `handleContentChange` and `onSave` logic so editing and saving a `.fbt` file still works exactly like other files.

### 6.3 Language detection (optional improvement)

- Optionally, update `FileSystemAPI.getFileLanguage` to map `.fbt` to `'xml'` instead of `'plaintext'`:
  - This improves syntax highlighting in the `Raw XML` sub‑tab.

---

## 7. Handling Non‑Basic FBs and Errors

### 7.1 Non‑Basic `.fbt` files

- If `parseFbtBasicFb` determines:
  - There is no `<BasicFB>` element, or
  - The structure doesn’t match expectations for a Basic FB,
  - Then:
    - `FbtBasicFbView` should:
      - Show a concise message: “This `.fbt` file is not a Basic Function Block (BasicFB). The structured view currently supports only BasicFBs.”
      - Automatically switch to or highlight the `Raw XML` sub‑tab.

### 7.2 Malformed XML

- If the `DOMParser` reports a parse error:
  - Present a friendly error message in the `Interface` / `ECC` / `Algorithms` sub‑tabs.
  - Always keep `Raw XML` available so the user can inspect/fix the file.

### 7.3 Performance considerations

- `.fbt` files are typically small → DOM parsing is cheap.
- Parsing happens:
  - On initial load of the `.fbt` content.
  - When the user edits and saves the XML (if we want to keep the parsed view in sync).
- For first iteration:
  - Parse only on tab activation and on content changes where necessary.
  - No aggressive caching is required.

---

## 8. ECC Diagram – Future Enhancements

While the first iteration will use a **simple, manual SVG layout**, it’s worth outlining options for a richer diagram:

- **Option A – React Flow / Graph library**
  - Add a dependency like `react-flow-renderer` and/or `dagre`:
    - Automatic layout of states and transitions.
    - Built‑in zoom/pan and interaction.
  - Map `FbtEccState` → nodes, `FbtEccTransition` → edges.
  - This adds a new dependency but greatly simplifies advanced behaviors later (hover tooltips, selection, etc.).

- **Option B – Custom layout**
  - Keep manual SVG but:
    - Use simple layout algorithms (e.g. layer states by “distance” from the initial state).
    - Implement zoom/pan by CSS transforms or `viewBox` manipulation.
  - No extra dependencies, but more UI math to maintain.

For the **first iteration**, stick to:

- A simple static layout that’s easy to implement and maintain.
- Clear mapping from the parsed ECC to the rendered diagram.

---

## 9. Testing & Validation Plan

### 9.1 Manual testing scenarios

Using `.fbt` files from `TASK_DOCS/FESTO_DS_skills/IEC61499`, including `SkillGoToLeft.fbt`:

- **Interface tab**
  - Verify all event inputs and outputs appear with correct names and comments.
  - Confirm that `With` associations map to the correct variables.
  - Confirm variables list correctly shows `Type` and usage.

- **ECC tab**
  - Confirm each `ECState` appears once in the diagram and tables.
  - Check transitions:
    - Sources/destinations and conditions match the XML.
  - Verify initial state highlighting.

- **Algorithms tab**
  - Verify every `<Algorithm>` appears, with its `ST` body displayed correctly.
  - Confirm algorithms referenced in `ECAction` appear with “Used In” states.

- **Raw XML**
  - Confirm editing in the Raw XML view still works and saving persists to disk.
  - After edits, ideally the parsed view updates or warns if parsing fails.

### 9.2 Edge cases

- `.fbt` with:
  - No `<BasicFB>` but other content → Structured view should fall back gracefully.
  - No `<ECC>` → ECC tab shows a “no ECC” message.
  - No `<Algorithm>` → Algorithms tab shows a simple “No algorithms defined” message.
  - Extra attributes / elements not handled → Ignored but do not break the view.

---

## 10. Implementation Phases & Tasks

### Phase 1 – Parsing and Types

- [ ] Add `src/types/fbt-types.ts` with the FBT data model.
- [ ] Implement `src/utils/fbt-parser.ts` with `parseFbtBasicFb(xmlText)`.
- [ ] Write a small internal test harness (e.g. in a temporary component or console logs) using `SkillGoToLeft.fbt` to verify parsing.

### Phase 2 – Basic FBT View (Interface + Algorithms)

- [ ] Implement `FbtBasicFbView` and `FbtInterfaceTab`, `FbtAlgorithmsTab`.
- [ ] Integrate the parser and render parsed data.
- [ ] Ensure graceful handling when parsing fails or BasicFB is absent.

### Phase 3 – ECC Diagram

- [ ] Implement `FbtEccTab` with a simple SVG‑based diagram and tables.
- [ ] Connect ECC data from the parser.
- [ ] Validate layout and readability on the example `.fbt` files.

### Phase 4 – CodeEditor Integration

- [ ] Update `CodeEditor` to detect `.fbt` files and render the FBT view instead of the plain editor, with a `Raw XML` sub‑tab.
- [ ] Ensure save behavior and modified indicators still work for `.fbt` files.
- [ ] Optionally set `.fbt` → `xml` in `FileSystemAPI.getFileLanguage`.

### Phase 5 – Polish & Documentation

- [ ] Tweak styles (spacing, colors, typography) for consistency with the rest of the IDE.
- [ ] Add a short usage note to the relevant docs (or a new section) explaining the `.fbt` viewer and its sub‑tabs.
- [ ] Consider small enhancements (e.g. special icon for `.fbt` files in the explorer, tooltip hints on ECC states).

Once these phases are complete, `.fbt` Basic Function Blocks will have a rich, domain‑specific view while preserving the ability to edit raw XML when needed.

