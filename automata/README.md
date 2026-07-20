# Automata Specialist Agent

A specialized agent for Automata workflow automation, node development, and system integration.

## Overview

The Automata Specialist Agent is designed to architect, implement, and optimize complex automation workflows. It operates in distinct modes (DISCOVERY, PLAN, IMPLEMENT) to ensure that every automation is validated against best practices and user requirements.

## Core Components

- **Brain (`brain/persona.md`):** Defines the identity of the Automata Automation Architect and Workflow Engineer.
- **Skills:**
    - `workflow_architect.md`: Protocol for designing, implementing, and debugging Automata workflows covering DISCOVERY and PLAN modes.
- **Knowledge Base (`knowledge/`):**
    - `automata_core.md`: Reference to Automata core concepts and the official GitHub repository.
    - `best_practices.md`: Industry standards for Automata workflow design and error handling.
- **Commands:**
    - `/automata:plan`: Deep-dive research, workflow design, and planning to generate `docs/pages/[workflow]-discovery.md` and `docs/pages/[workflow]-plan.md`.
    - `/automata:create`: Implement and generate final validated JSON workflow for import.

## Installation

### 1. Agent Files
Symlink the `automata/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/tech-agents/automata ~/.gemini/agents/automata
```

### 2. Global Commands
Register the Automata commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/automata/commands/automata ~/.gemini/commands/automata
```

## Usage (The Automata Lifecycle)

The agent operates in distinct phases to ensure reliability and architectural integrity:

### Step 1: `/automata:plan` (Phase 1: Discovery)
Before any building, the agent validates your request, researches APIs, identifies edge cases, and checks for "garbage" inputs.
- **Goal:** Validate feasibility and research technical requirements.
- **Output:** `docs/pages/[workflow]-discovery.md` (which starts with standard Logseq properties and follows the outliner format).
```text
/automata:plan "Sync HubSpot CRM contacts with a Google Sheets spreadsheet."
```

### Step 2: `/automata:plan` (Phase 2: Architecture Planning)
Upon approval of the discovery phase, the agent builds a technical blueprint, mapping exactly which nodes and logic are needed.
- **Goal:** Create a detailed design plan.
- **Output:** `docs/pages/[workflow]-plan.md` (which starts with standard Logseq properties and follows the outliner format).
```text
/automata:plan "HubSpot Sync"
```

### Step 3: `/automata:create` (Phase 3: Implementation & JSON)
The agent transforms the approved design plan into the actual Automata workflow JSON structure.
- **Goal:** Generate a ready-to-import JSON workflow inside `docs/pages/[workflow]-workflow.json`.
```text
/automata:create "HubSpot Sync"
```
*Note: You can then import this JSON directly into your Automata platform.*

## Directory Structure

```text
automata/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # Technical standards and logic bases
├── skills/         # Specialized engineering protocols
└── templates/      # Plan and report templates
```
