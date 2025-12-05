export const DOCS_DIR = 'docs';

export const PROJECT_DOC_FILES = {
  readme: 'Readme.md',
  structure: 'ProjectStructure.md',
  functionBlocks: 'FunctionBlockInfo.md',
  skills: 'SkillInfo.md',
  mcpInfo: 'MCP_Info.md',
} as const;

export type ProjectDocKind = keyof typeof PROJECT_DOC_FILES;

export const PROJECT_DOC_ORDER: ProjectDocKind[] = [
  'readme',
  'structure',
  'functionBlocks',
  'skills',
  'mcpInfo',
];

/**
 * Build the initialization prompt for generating a single project doc.
 *
 * The agent is expected to:
 * - Use filesystem tools (list_directory, read_file, create_file, apply_patch) inside the agent root.
 * - Use MCP tools (GraphDB, OPC UA, MQTT, etc.) when available.
 * - Create / overwrite one markdown file under `<rootDir>/docs`.
 */
export function buildProjectInitPrompt(
  rootDir: string,
  kind: ProjectDocKind,
): string {
  const docsRoot = `${rootDir.replace(/[/\\]$/, '')}/${DOCS_DIR}`;
  const header = [
    `You are an expert IEC 61499 / PLC and industrial connectivity assistant.`,
    ``,
    `Project root (agent root): ${rootDir}`,
    `Docs directory: ${docsRoot}`,
    ``,
    `Your current task is to **create or overwrite exactly one markdown file** under the docs directory.`,
    `Do not modify any other files beyond the specified target doc.`,
    ``,
    `General constraints:`,
    `- Work **inside the agent root directory**; treat relative paths as rooted at ${rootDir}.`,
    `- Use filesystem tools instead of printing large file contents into the chat:`,
    `  - Use \`list_directory\` to inspect folder structures (especially \`IEC61499\`, \`HMI\`, \`HwConfiguration\`, \`AssetLinkData\`, \`Topology\`).`,
    `  - Use \`read_file\` only on representative and important files (\`.fbt\`, CAT/OPC UA XML, key HMI files, configs).`,
    `  - Use \`create_file\` or \`apply_patch\` to write markdown under \`${DOCS_DIR}/\`.`,
    `- If the target doc already exists, **overwrite it completely** with improved content (do not append).`,
    `- Keep docs concise but information‑dense; prefer tables and bullet lists over raw XML or long code dumps.`,
    ``,
  ];

  const fileName = PROJECT_DOC_FILES[kind];
  const targetPath = `${docsRoot}/${fileName}`;

  if (kind === 'readme') {
    return [
      ...header,
      `# Target doc`,
      `- File: ${targetPath}`,
      `- Purpose: high‑level project overview for humans and LLM agents.`,
      ``,
      `# Content requirements`,
      `- Describe the FESTO DS skills / IEC 61499 project at a high level:`,
      `  - Main hardware/modules (e.g. feeder, pusher, transfer, etc.).`,
      `  - How IEC 61499 skills control these modules.`,
      `- Summarize key folders and their roles (based on \`list_directory\`):`,
      `  - \`IEC61499/\` – function blocks, skills, system configuration.`,
      `  - \`HMI/\` – HMI canvases and code‑behind for skills.`,
      `  - \`HwConfiguration/\`, \`Topology/\`, \`AssetLinkData/\` – hardware and asset metadata.`,
      `- Explain the concept of **BasicSKILL** and higher‑level skills (e.g. skGoToLeft, skTransfer, skPick, etc.).`,
      `- Briefly mention that this \`${DOCS_DIR}/\` folder is the primary entry point for LLM agents to understand the project.`,
      ``,
      `When finished, write the complete markdown content to ${targetPath} using create_file or apply_patch.`,
    ].join('\n');
  }

  if (kind === 'structure') {
    return [
      ...header,
      `# Target doc`,
      `- File: ${targetPath}`,
      `- Purpose: concise overview of the project folder architecture.`,
      ``,
      `# Content requirements`,
      `- Use \`list_directory\` to inspect the project tree under ${rootDir}.`,
      `- Produce a compact tree or outline of the most important directories and files, for example:`,
      `  - \`IEC61499/\` with subfolders like \`BasicSKILL\`, \`skGoToLeft\`, \`skTransfer\`, \`skPick\`, \`System\`, \`Model\`, \`Configuration\`, \`SnapshotCompiles\`, etc.`,
      `  - \`HMI/\` with subfolders for skills, BasicSKILL HMI, configurations, etc.`,
      `  - \`HwConfiguration/\`, \`AssetLinkData/\`, \`Topology/\`.`,
      `- For each top‑level folder, add a one‑sentence description of its role and most important subfolders.`,
      `- Use either a fenced \`text\` tree block or bullet lists; keep it readable.`,
      ``,
      `When finished, write the complete markdown content to ${targetPath} using create_file or apply_patch.`,
    ].join('\n');
  }

  if (kind === 'functionBlocks') {
    return [
      ...header,
      `# Target doc`,
      `- File: ${targetPath}`,
      `- Purpose: catalog of IEC 61499 function blocks and related assets (Basic FBs, composite FBs, CAT/OPC UA mappings, HMI FBs).`,
      ``,
      `# Content requirements`,
      `- Focus on IEC 61499 function blocks under \`IEC61499/\`.`,
      `- Use \`list_directory\` and \`read_file\` (on representative .fbt files) to identify:`,
      `  - **Basic FBs** (with <BasicFB> ECC).`,
      `  - **Composite FBs** (with <FBNetwork> only, often with comments like "Composite Function Block Type").`,
      `  - HMI‑related FBs (e.g. \`*_HMI.fbt\`).`,
      `  - CAT / OPC UA mapping files (\`*_CAT.offline.xml\`, \`*_CAT.opcua.xml\`, etc.).`,
      `- Organize the doc into sections such as:`,
      `  - Basic Function Blocks – table with columns: Name, category/role, key events/data, skills that use them (if known).`,
      `  - Composite Function Blocks – table with Name, important internal FBs, external interface summary.`,
      `  - CAT / OPC UA mapping – mapping from skills/FBs to CAT files and what they expose.`,
      `  - HMI‑related FBs – how HMI FBs (e.g. BasicSKILL_HMI) relate to skills and HMI canvases.`,
      `- Do **not** paste full XML; summarize structure and behavior in natural language tables or bullets.`,
      ``,
      `When finished, write the complete markdown content to ${targetPath} using create_file or apply_patch.`,
    ].join('\n');
  }

  if (kind === 'skills') {
    return [
      ...header,
      `# Target doc`,
      `- File: ${targetPath}`,
      `- Purpose: skills‑centric view of the project (atomic vs composite skills, how they relate to BasicSKILL and HMI).`,
      ``,
      `# Content requirements`,
      `- Focus on skills built on top of BasicSKILL and templates under \`IEC61499/\`.`,
      `- Detect skills and classify them as **atomic** or **composite** using heuristics:`,
      `  - Names like \`skGoToLeft\`, \`skTransfer\`, \`skPick\`, \`skPlace\`, etc.`,
      `  - FBs and folders under \`IEC61499/BasicSKILL\` and \`IEC61499/SKILL\`.`,
      `  - FB networks that include \`BasicSKILL\`, \`SKILL_BFB\`, or similar.`,
      `- Document:`,
      `  - **Atomic skills** – table with Name, classification (atomic), key events/IO, short behavior summary (INIT/EXECUTE/RESET/etc.).`,
      `  - **Composite skills** – table with Name, which atomic/basic skills they use, any internal orchestration FBs, relevant CAT/HMI artifacts.`,
      `  - A brief **generic skill lifecycle** description as implemented by BasicSKILL/SKILL_BFB (INIT → STARTING → EXECUTE → COMPLETING / STOPPING / ABORTING, etc.).`,
      `- If other docs (Readme/FunctionBlockInfo) already exist, you may treat them as additional context, but do not modify them in this run.`,
      ``,
      `When finished, write the complete markdown content to ${targetPath} using create_file or apply_patch.`,
    ].join('\n');
  }

  // mcpInfo
  return [
    ...header,
    `# Target doc`,
    `- File: ${targetPath}`,
    `- Purpose: rich reference for MCP servers (GraphDB, OPC UA, MQTT, etc.) and how they relate to PLC skills and IEC 61499 code.`,
    ``,
    `# Content requirements`,
    `- First, read the repo‑root \`mcp-config.json\` (using \`read_file\`) to discover configured MCP servers:`,
    `  - GraphDB (Graph/ontology MCP).`,
    `  - OPC UA MCP (Python).`,
    `  - MQTT MCP (Python).`,
    `  - Any other MCP entries.`,
    `- For each MCP:`,
    `  - Summarize configuration (command, args, env vars like \`MCPHUB_SERVER_URL\`, \`OPCUA_SERVER_URL\`, \`MQTT_BROKER_URL\`, Sparkplug IDs, etc.).`,
    `- When MCP tools are available and servers are reachable, call them to fetch runtime details:`,
    `  - **GraphDB MCP**:`,
    `    - Use SPARQL / graph tools to discover ontologies, classes, and relationships relevant to skills, devices and IO.`,
    `    - List key ontologies / prefixes and how they represent skills and equipment.`,
    `    - Include a few example SPARQL queries and short natural‑language summaries of their results (no huge result dumps).`,
    `  - **OPC UA MCP**:`,
    `    - Browse NodeIds to find nodes for skill states (CURRENT_STATE), commands (START, STOP, RESET, etc.) and relevant IO.`,
    `    - Produce tables mapping: Skill/FB → variable/event → OPC UA NodeId → browse path / namespace.`,
    `    - Relate NodeIds back to CAT/OPC UA files under \`IEC61499/\` where possible.`,
    `  - **MQTT MCP**:`,
    `    - Identify important topics and payload structures, especially those tied to skills/states/alarms.`,
    `    - Summarize broker URL, client ID, Sparkplug identifiers, and any discovered topic patterns.`,
    `- Add a dedicated **"PLC–MCP Mapping"** section that cross‑links:`,
    `  - IEC 61499 skills / FBs (you may reference FunctionBlockInfo/SkillInfo docs if already present).`,
    `  - GraphDB ontology entities (classes/instances).`,
    `  - OPC UA NodeIds / browse paths.`,
    `  - MQTT topics (where applicable).`,
    `- If a given MCP is configured but not reachable, state clearly that runtime queries failed and fall back to configuration‑only information.`,
    ``,
    `When finished, write the complete markdown content to ${targetPath} using create_file or apply_patch.`,
  ].join('\n');
}
