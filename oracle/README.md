# Strategic Oracle Agent

A high-fidelity information filter and strategic analyst agent for Gemini CLI. This agent is designed to provide factual foundations for decision-making by mapping landscapes before taking action.

## Overview

The Oracle agent operates with a clinical, objective, and intellectually honest persona (INTJ-A profile). It operates in distinct modes (DISCOVERY, FULL-RESEARCH) to ensure every investigation is properly scoped and grounded in high-quality sources.

## Core Components

- **Brain (`brain/persona.md`):** Defines the "Strategic Oracle" identity, communication style, and operational logic.
- **Skills (`skills/browsing.md`):** Implements a strict Research & Browsing Protocol, including:
    - **Phase 0: DISCOVERY:** Autonomous source mapping and interactive scope clarification.
    - **Triangulation:** Cross-referencing at least three independent sources.
    - **Temporal Relevance:** Prioritizing data from the last 12-24 months (6 months for fast-moving sectors).
    - **Data Hierarchy:** Prioritizing primary documentation and official statistics.
- **Templates (`templates/report.md`):** Standardized markdown format for research outputs.
- **Commands:**
    - `/oracle:investigate`: Deep-dive research into topics, sources, and scope to generate `docs/pages/[research]-discovery.md`.
    - `/oracle:report`: Execute a data-driven research task based on an approved discovery artifact.

## Installation

### 1. Agent Files
Symlink the `oracle/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/ai-agents/oracle ~/.gemini/agents/oracle
```

### 2. Global Commands
Register the oracle commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/oracle/commands/oracle ~/.gemini/commands/oracle
```

## Usage

### Phase 0: Discovery (Deep Dive)
Before full research, map the landscape and clarify requirements. The agent writes to `docs/pages/[research]-discovery.md` (which starts with standard Logseq properties and follows the outliner format):
```text
/oracle:investigate "the current state of the Rust-to-WebAssembly ecosystem"
```

### Phase 1: Comprehensive Research
Execute the full research task once the discovery artifact is approved:
```text
/oracle:report "Rust-to-WebAssembly"
```

## Directory Structure

```text
oracle/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # (Optional) Static reference data
├── skills/         # Specialized protocols and skills
└── templates/      # Standardized output formats
```
