# Skill: Agent Forging & Integration Protocol (v2026)

This protocol governs the **step-by-step operational procedure** for designing, researching, scaffolding, generating, and registering a new specialized agent inside the Universal Agent Hub.

---

## Phase 0: Requirement Elicitation

Before any code is generated, the Forge must compile an **Agent Blueprint** using `/forge:discovery`.

1.  **Define Core Identity:** Role, primary mandate, and technical scope.
2.  **Map Command Library:** Define the exact commands the agent must support.
3.  **Confirm Extended Team:** Identify what sub-agents the new agent will collaborate with (e.g., Strategic Oracle, Automata Automation).

---

## Phase 1: Mandatory Deep Domain Research

**You must never write generic text or stubs.** Before generating any file, execute a deep technical research pass:

1.  **Fetch Industry Standards:** Search for the latest APIs, security protocols, and operational workflows related to the agent's target domain.
2.  **Analyze Local Code DNA:** Review the local `docs/pages/code-dna.md` to capture local exceptions strategies, naming, and architectural conventions.
3.  **Synthesize Findings:** Use the gathered data to compile detailed, production-grade skills and knowledge bases for the new agent (targeting ~20-30KB of total reference material).

---

## Phase 2: Directory Scaffolding

Scaffold the target agent directory structure:

1.  **Create Root Folder:** `[agent_name]/`
2.  **Create Symmetrical Subdirectories:**
    - `[agent_name]/brain/`
    - `[agent_name]/commands/[agent_name]/`
    - `[agent_name]/knowledge/`
    - `[agent_name]/skills/`
    - `[agent_name]/templates/`
3.  **Generate `README.md`:** Write the quick start guide mapping commands and folder layouts.

---

## Phase 3: Capability Generation (Personas, Commands, Skills)

Generate all files using the compiled research data:

1.  **Create Persona (`brain/persona.md`):** Formulate the core identity traits, extended team access, operating principles, and specific interaction style.
2.  **Create TOML Commands:** Write the executable files under `commands/[agent_name]/`.
    - **Rule:** Use `!{cat [agent_name]/brain/persona.md}` dynamically. Never duplicate text.
    - **Rule:** Ensure all command TOMLs have a standard structure: description, prompt, and execution instructions.
3.  **Create Skills & Knowledge Bases:** Write granular, step-by-step markdown protocols (`skills/`) and domain references (`knowledge/`) based on Phase 1 research.
4.  **Create Templates:** Generate standard templates under `templates/` for the agent's expected outputs.

---

## Phase 4: Triple-Anchor Registration

Register the new agent in the root cognitive anchors. Use precise regex or search-and-replace to add the agent to the `🤖 Specialized Agents` table/list in:

1.  **`AGENTS.md`:** ` - [[AgentName]]: Short description.`
2.  **`GEMINI.md`:** Add the slash command namespaces `/agentname:*` under the `🛠 Gemini Commands` section.
3.  **`CLAUDE.md`:** Add standard usage snippets under `🛠 MCP Tools`.

---

## Phase 5: Logseq Graph Enrichment

Represent the new agent as a first-class node in the Logseq documentation graph:

1.  **Create Outliner Page:** Write `docs/pages/[AgentName].md`.
    - Enforce the standard Logseq properties at the top (`type:: [[Agent]]`, `role:: [Role]`, etc.).
    - Write the persona, commands, and success criteria as structured outliner bullets.
    - **Enforce Rule 4.1 (Active Workspace Isolation):** Only write files inside the dynamically resolved active workspace root.
    - **Enforce Rule 4.2 (No-Ghost-Pages):** Scan the page for any created links (e.g. `[[NewSkill]]`). Immediately initialize those files in `docs/pages/` with `status:: [[STUB]]` to avoid dangling references.
    - **Enforce Rule 4.3 (Dialectical Critique):** Conclude the page with a mandatory, dry-engineered **Dialectical Critique** containing:
      - **Yellow Hat** (resilience and testing assertions).
      - **Black Hat** (architecture risks and token cost profile).
      - **Blind Spots** (logical edge cases or dependencies ignored).
2.  **Update Registry:** Open [`docs/pages/registry.md`](../../docs/pages/registry.md) and append the new agent's node in the Active Features list under the corresponding feature block, preserving indentation integrity.
