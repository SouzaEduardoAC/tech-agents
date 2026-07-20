# Knowledge: Repository Agentic Standards & Guidelines (v2026)

This document establishes the strict architectural guidelines, folder conventions, and prompt engineering principles that govern all specialized agents in the Universal Agent Hub. Every agent created or upgraded by the **Forge** must comply with these guidelines.

---

## 1. Directory Structure Standards

Every specialized agent must carry a self-contained, symmetrical folder structure. Hand-crafting ad-hoc scripts outside these boundaries is prohibited.

```
[agent_name]/
├── README.md                 # Technical user guide and command library
├── brain/
│   └── persona.md            # Core cognitive identity, rules, and style
├── commands/
│   └── [agent_name]/
│       └── [cmd].toml        # Executable toml commands
├── knowledge/
│   └── [knowledge].md        # Domain-specific factual guidelines
├── skills/
│   └── [protocol].md         # Step-by-step operational workflows
└── templates/
    └── [template].md         # Structured markdown output templates
```

---

## 2. Prompt Engineering & AMD Guidelines

To optimize context windows and reduce token costs, all agents must leverage the **Agentic Modular Design (AMD)** compiler rules:

1.  **Late-Binding Deduplication:**
    - **Never** hardcode persona, skills, or knowledge text inside command TOML files.
    - **ALWAYS** use the `!{cat path/file.md}` probe syntax. The Hub compiler resolves these paths dynamically at run-time, preventing redundant prompt lines.
2.  **Heuristic Relevance Filtering:**
    - Align keywords inside commands to allow the Hub server (`index.js -> compileCommonSection`) to dynamically load only the relevant subset of common skills/standards, reducing common token bloat by up to 70%.
3.  **Dynamic Stack Detection:**
    - When building backend, frontend, or mobile execution commands, ensure the prompt instructs the agent to check the "Probes" section for dynamic stack files (e.g., `dotnet.md`, `go.md`, `react.md`) to align with active language standards.

---

## 3. Client Onboarding & Registration Rules

A new agent must be fully registered across all supported clients. The Forge must automate this synchronization.

### 3.1 Triple-Anchor Updates:
Every new agent must be documented in all three root-level context files under the `🤖 Specialized Agents` section:
1.  **[`AGENTS.md`](../AGENTS.md):** The universal context anchor.
2.  **[`GEMINI.md`](../GEMINI.md):** The Gemini CLI and AntiGravity context, mapping the new `/agent:command` slash options.
3.  **[`CLAUDE.md`](../CLAUDE.md):** The Claude Code context, showing how to execute the agent via the `call_agent_command` tool.

### 3.2 Path Reconciliation during Bootstrap:
When the user runs `agent-hub bootstrap`, the Hub CLI rewrites paths inside command TOML files dynamically. The Forge must write the TOML commands such that:
- Path references use `~/.gemini/agents` or relative dots `../../../` to represent the root.
- Path replacements are fully idempotent.

---

## 4. Logseq Outliner Graph Standards

Every agent must be mapped as a first-class node inside the Logseq graph:

1.  **Metadata Properties:**
    - The Logseq page must be written to `docs/pages/[Agent_Name].md`.
    - Every file must start with:
      ```markdown
      - type:: [[Agent]]
      - role:: [Specialized Role]
      - status:: [ACTIVE]
      - project:: [[tech-agents]]
      ```
2.  **Properties Mapping:**
    - Maintain a clear hierarchy: `- # [Agent Name] (Deep Persona) -> - ## Identity -> - ## Commands -> - ## Success Criteria`.
    - Cross-link key concepts using bidirectional `[[Links]]`.
3.  **Registry Sync:**
    - Add the new agent and its core specs to [`docs/pages/registry.md`](../../docs/pages/registry.md) under the corresponding active feature block.
4.  **Journal Entry:**
    - Create or update the daily Logseq journal file under `docs/journals/YYYY_MM_DD.md` (e.g., `2026_06_20.md`) listing the implemented features or upgrades with clear summaries and file references.
5.  **Rule 4.1: Active Workspace Isolation & Scoping:**
    - All created or modified files must reside strictly within the active workspace root of the repository being worked on.
    - **NEVER** write or leak files into the global Agent Hub directory. Always resolve path locations dynamically relative to the active workspace's root `.git` or `package.json` file.
    - Preserve the target file's indentation integrity (tabs vs spaces) when appending entries.
6.  **Rule 4.2: The No-Ghost-Page Rule:**
    - Any link created pointing to a new page (e.g. `[[SkillName]]` or `[[ProtocolName]]`) **MANDATES** the immediate creation and initialization of that file. 
    - If full content is not yet written, the file must be initialized with `status:: [[STUB]]` and a standard `TODO` to prevent dangling references.
7.  **Rule 4.3: Dialectical Critique Mandate:**
    - Every new or overhauled agent documentation page must conclude with a structured **Dialectical Critique** block:
      - **Yellow Hat:** Resilience checks, testing assertions, and recoverability.
      - **Black Hat:** Architectural risks, token bloat, and technical debt.
      - **Blind Spots:** Logical edge cases or downstream variables ignored by the current design.
