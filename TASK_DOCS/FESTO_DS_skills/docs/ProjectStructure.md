# Project Folder Architecture

This document outlines the key directories and files within the FESTO DS skills project, providing a concise overview of their purpose.

```
.
├── AssetLinkData/              # Hardware and asset metadata, including asset manifests and hierarchy views.
│   ├── Asset Manifest/
│   ├── AssetHierarchyViews/
│   └── ...
├── FESTO_DS_skills.sln         # Visual Studio solution file for the project.
├── HMI/                        # Human-Machine Interface (HMI) canvases and code-behind files for skills.
│   ├── Alarms/
│   ├── BasicSKILL/
│   ├── ButtonsPanel/
│   ├── Colors/
│   ├── Configurations/
│   ├── ImageStorage/
│   ├── Languages/
│   ├── Model/
│   ├── NodeFinder/
│   ├── RegisterSkill/
│   ├── SKILL/
│   ├── Test/
│   ├── skGoToLeft/
│   ├── skTransfer/
│   └── ...
├── HwConfiguration/            # Hardware configuration files and related data.
│   ├── ImageStorage/
│   └── ...
├── IEC61499/                   # IEC 61499 function blocks, skills, and system configuration.
│   ├── BasicSKILL/
│   ├── ButtonsPanel/
│   ├── Configuration/
│   ├── Languages/
│   ├── Model/
│   ├── NodeFinder/
│   ├── RegisterSkill/
│   ├── SKILL/
│   ├── SnapshotCompiles/
│   ├── System/
│   ├── Test/
│   ├── skGoToLeft/
│   ├── skGoToRight/
│   ├── skLoad/
│   ├── skPick/
│   ├── skPlace/
│   ├── skPush/
│   ├── skTransfer/
│   └── ... (various .fbt and .xml files for function blocks and their mappings)
├── Topology/                   # Network topology, device communication, and cyber security configurations.
│   └── ... (various .xml files for network and device configurations)
└── docs/                       # Project documentation, including this file.
    └── Readme.md
```

## Top-Level Directory Descriptions

*   **AssetLinkData/**: Contains definitions and configurations related to assets and their relationships within the system, including asset manifests and hierarchy views.
*   **HMI/**: Houses all Human-Machine Interface related files, including canvas definitions (`.cnv`), code-behind files (`.cs`), and configuration for various HMI components and individual skills.
*   **HwConfiguration/**: Stores the hardware configuration of the industrial system, detailing the connected devices and their properties.
*   **IEC61499/**: This is the core directory for the PLC logic, containing all IEC 61499 compliant function blocks (`.fbt`), skill implementations, and the overall system configuration.
*   **Topology/**: Defines the network topology, including physical and logical connections between devices, communication protocols, and cybersecurity settings.
*   **docs/**: The central repository for all project documentation, serving as a primary information source for understanding the project structure, components, and integrations.
