# FESTO DS Skills Project Documentation

This documentation serves as the primary entry point for LLM agents and developers to understand the FESTO DS skills project, which leverages IEC 61499 for controlling industrial automation components.

## Project Overview

The FESTO DS skills project implements a modular and skill-based control system for various industrial hardware modules. The core idea is to encapsulate specific functionalities into "skills" that can be orchestrated to achieve complex tasks. The system utilizes IEC 61499 for its control logic, enabling a distributed and event-driven architecture.

**Main Hardware/Modules Controlled by IEC 61499 Skills:**

*   **Feeder:** Likely responsible for introducing workpieces into the system.
*   **Pusher:** Used to move workpieces in a linear fashion.
*   **Transfer Unit:** Facilitates the movement of workpieces between different stations.
*   **Rotating Arm:** Capable of picking, placing, and swinging workpieces to various locations.
*   **Stack Magazine:** Manages a stack of workpieces, often for loading or unloading.
*   **Magazine:** General term for a storage unit for workpieces.

These modules are controlled through a set of well-defined IEC 61499 skills.

## Key Project Folders

*   **`IEC61499/`**: This directory contains all the IEC 61499 function block types (`.fbt` files), skill implementations, and the overall system configuration. It is the heart of the control logic.
*   **`HMI/`**: This folder houses the Human-Machine Interface (HMI) components, including HMI canvases (`.cnv.xml`), code-behind files (`.cs`), and associated resources for visualizing and interacting with the skills and system states.
*   **`HwConfiguration/`**: Contains hardware-specific configuration files and settings for the physical components of the industrial setup.
*   **`AssetLinkData/`**: Manages the asset manifest, asset relationships, and other metadata that links physical assets to their logical representations within the control system.
*   **`Topology/`**: Defines the network topology, including physical devices, communication links, and logical connections, providing a comprehensive view of the system's architecture.

## Skill Concepts

The project is built around the concept of "skills," which represent atomic or composite actions the system can perform.

*   **BasicSKILL**: This is a foundational skill, likely providing a generic lifecycle and interface for all other skills. It defines common states and events (e.g., INIT, START, EXECUTE, COMPLETE, ABORT, RESET).
*   **Higher-Level Skills**: These skills build upon the `BasicSKILL` and implement specific functionalities, such as:
    *   `skGoToLeft`: Move a component or workpiece to the left.
    *   `skGoToRight`: Move a component or workpiece to the right.
    *   `skTransfer`: Perform a transfer operation.
    *   `skPick`: Pick up a workpiece.
    *   `skPlace`: Place a workpiece.
    *   `skPush`: Push a workpiece.
    *   `skLoad`: Load a workpiece.
    *   `skSwing`: Perform a swing motion with a robotic arm.
    *   `skVcmOff/skVcmOn`: Skills related to a Vacuum Clamp Module (VCM) for gripping/releasing workpieces.
    *   `skMagazineController`: Control a magazine.
    *   `skRotatingArmController`: Control a rotating arm.

## Purpose of this `docs/` Folder

This `docs/` folder is designed to be the primary entry point for LLM agents and human users to quickly understand the project's structure, IEC 61499 implementation, skill definitions, and integration with various MCP (Manufacturing Control Plane) servers. The aim is to provide concise, information-dense summaries rather than raw code dumps, facilitating rapid comprehension and task execution.
