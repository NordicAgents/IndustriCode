# FESTO DS Skills — IEC 61499 Project Overview

This document provides a concise, human- and AI-friendly overview of the FESTO DS skills project implemented with IEC 61499. It describes the main hardware in the automation line, how skills drive the hardware, and how the repository is organized for LLM agents.

## Main hardware / modules

- Feeder: supplies parts to the line.
- Pusher: moves parts between stations.
- Transfer / Conveyor: conveys parts along the process chain.
- Gripper / Picker: handles pick-and-place actions.
- Sensors & actuators: position, presence, limit switches, etc.

## How IEC 61499 skills control the modules

- Each physical module is driven by a set of Function Blocks (FBs) representing actions and state machines.
- Basic SKILLs implement primitive operations (e.g., open/close gripper, extend/retract actuator, move to a position).
- Higher-level SKILLs compose primitive actions into meaningful workflows (e.g., pick and place, go to home, transfer between stations).
- The controller orchestrates these SKILLs to execute end-to-end tasks.

## BasicSKILL and higher-level skills

- BasicSKILL (primitive actions):
  - moveTo(position)
  - grip(open/close)
  - wait for sensor
  - home
- Higher-level skills (examples):
  - skGoToLeft
  - skGoToRight
  - skTransfer
  - skPick
  - skPlace
  - skHome
  - skStop

- Skills are designed to be reusable across stations and products, enabling modular software architecture.

## Key folders and their roles (based on repo listing)

Note: The docs folder includes guidance and summaries. The repository contains (or references) the following areas:

- IEC61499/ — function blocks, skills, and system configuration (core IEC 61499 assets conceptually).
- HMI/ — HMI canvases and code-behind for skills (human-machine interfaces).
- HwConfiguration/ — hardware configuration metadata and mappings.
- Topology/ — network and asset topology information.
- AssetLinkData/ — asset linkage and metadata.

Within the current docs snapshot, the following Markdown docs exist to help orientation:

- FunctionBlockInfo.md —概要 of function blocks.
- MCP_Info.md — MCP-related information.
- ProjectStructure.md — project structure overview.
- Readme.md — this document.
- SkillInfo.md — overview of skills.

## How to use this docs folder

- This docs/ folder is the primary entry point for humans and LLM agents to understand the FESTO DS project.
- Use the Markdown docs as a quick reference, then drill into source/config files if needed (when available).

## Notes

- If new hardware or skills are added, update the Readme and related docs to keep orientation consistent for both humans and agents.
