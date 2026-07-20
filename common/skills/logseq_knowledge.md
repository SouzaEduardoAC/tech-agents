# Skill: Logseq Knowledge (v2026 - Graph-First Documentation)

## 1. Core Mandate
The agent **MUST** treat the project's documentation as a structured knowledge graph using the Logseq Outliner format. This replaces traditional flat-file documentation maintenance with a bidirectional, property-rich graph.

---

## 2. Phase 0: Graph Diagnostic (State Detection)
Before modification, the agent **MUST** classify the environment:
1.  **Inventory Check:** Verify existence of `docs/pages/` and `docs/journals/`.
2.  **Sync-Audit (The Truth Test):**
    *   Trace **three (3) non-trivial** code symbols to their blocks in `docs/pages/`.
    *   **[STATE: GREENFIELD]**: No `/docs/pages` directory exists.
    *   **[STATE: ADAPT]**: Pages exist but Sync-Audit reveals logic drift or flat-text (non-outliner) blocks.
    *   **[STATE: SYNC]**: Graph matches the current AST.

---

## 3. Structural Standards (The Logseq Dialect)
1.  **Outliner Syntax:** Every unit of information MUST start with a bullet (`- `). No flat text.
2.  **Tab Indentation:** Use hierarchy to denote relationships.
3.  **Properties:** Use `key:: value` for metadata. (Mandatory: `type::`, `status::`).
4.  **Task Management:** Use `TODO`/`DONE` markers for implementation tracking.
5.  **Graph Integrity (The No-Ghost-Page Rule):** Any agent creating a link `[[PageName]]` is MANDATED to initialize that file. If the content belongs to a physical file (e.g., a skill or knowledge file), the Logseq page MUST act as a **Vector Pointer** containing `(ref: path/to/file.md)` and an LLM DIRECTIVE to read the physical file, preventing hallucinations. If the content is simply not yet available, it must contain a `status:: [[STUB]]` and a `TODO` for the responsible persona.
6.  **Persona-Driven Accountability:** Documentation is not "secondary." 
    *   **Architects** are responsible for structural blocks (ADRs, Pipelines).
    *   **Developers** are responsible for implementation blocks (Logic flows, AST citations).
    *   **Compliance** is responsible for audit/regulatory blocks.

---

## 4. Workflow Integration (The 4-Step Loop)

### Phase 1: The Brainstorm (Logseq PRD)
*   **Action:** Generate Logseq PRD in `docs/pages/[project]-prd.md`.
*   **Mandatory Requirements Syntax:**
    *   **User Stories:** Every functional requirement must follow the `As a [Role], I want [Action] so that [Value]` format.
    *   **Acceptance Criteria (AC):** Every `[[FR-XX]]` block MUST contain a nested list of verifiable Acceptance Criteria.
*   **Integrity Check:** Populate the `[[FR-XX]]` pages immediately with these details to prevent "Ghost Requirements."

### Phase 2: The Architect (Logseq ADR/Design)
*   **Action:** Generate ADR in `docs/pages/[project]-architecture.md`.
*   **Requirement:** Link decisions back to PRD requirements. Include **Mermaid** sequence diagrams as sub-blocks.
*   **Integrity Check:** Ensure all linked architectural nodes are initialized.

### Phase 3: The Consolidator (Journal & Rules)
*   **Action:** Update `docs/journals/YYYY_MM_DD.md`, `docs/pages/business-rules.md`, and **`README.md`**.
*   **README Sync Mandate:** The root `README.md` must be updated to serve as the "Surface Layer" of the graph. It MUST include:
    - **Graph-First Declaration:** Explicitly state that documentation is optimized for AI via Logseq Graph Mode to minimize token consumption while maximizing signal precision.
    - **Installation & Updates:** Clear `npx` commands for `serve`, `bootstrap`, and `link`.
    - **Contribution & Standards:** Links to `[[tech-agents-graph]]`, `[[code-dna]]`, and project guidelines.
*   **Forensic Extraction (Parity with doc_maintainer):**
    *   **Boundary Audit:** Identify if "Infrastructure" is leaking into "Domain" (ref: `doc_maintainer` §3A).
    *   **Auth & Role Mapping:** Trace `@authorized` or conditional roles to entry points.
    *   **Resilience & Data Logic:** Extract IoC/DI registrations, Database Traces (Tables/Indexes), and specific Retry Policies (ms/backoff).
    *   **Complexity Visualization:** **MANDATORY** Mermaid sequence diagrams for: OAuth2, Distributed Transactions, and Recursive Logic.
*   **Accuracy:** Use the **Documentation Maintainer** skill to verify AST citations `(ref: symbol)`.

### Phase 4: Registration (The Graph Index)
*   **Action:** Register the newly created or updated node(s) in the Global Symbol Registry (`docs/pages/registry.md`).
*   **Mandate:** An agent's documentation task is NOT complete until the node is appended to the `registry.md` file under the appropriate feature block. This ensures on-demand synthesis commands can locate the spec without token-heavy graph crawls.

### Phase 4.1: Cross-Environment File Modification & Scoping Protocol
*   **Strict Scoping Rule (Active Workspace Isolation):**
    *   All new or modified files (PRDs, ADRs, `AGENTS.md`, `GEMINI.md`, `registry.md`, etc.) MUST be written exclusively within the active workspace root of the repository being worked on (e.g., Repository X).
    *   **NEVER** write or leak any files into the global Agent Hub directory (unless the active workspace *is* the Agent Hub repository itself).
*   **Dynamic Path Resolution:**
    *   Always locate the target `registry.md` by starting at the active workspace root (e.g., `<workspace-root>/docs/pages/registry.md`).
    *   If running inside a subdirectory of the active workspace, walk up directories until the active workspace root containing the `.git` folder or root `package.json` is reached, then resolve `docs/pages/registry.md`.
*   **Indentation Integrity (The Outliner Dialect Guardrail):**
    *   Verify the indentation format (tabs vs. 2-spaces/4-spaces) of the target file (like `registry.md`) by reading the first few blocks before appending or modifying content.
    *   Do **NOT** corrupt the indentation style. Append new nodes with the exact matching indent format to keep it native for Logseq.
*   **Tool Resilient Protocol:**
    *   **Native Tools First:** If running in an environment with direct file-writing tools (like AntiGravity's `replace_file_content` / `multi_replace_file_content` or Claude Code's native file editors), always prioritize them using the dynamically resolved workspace path.
    *   **MCP Filesystem Fallback:** If native file editors are not available but the `filesystem` MCP is connected, call the `filesystem` MCP `write_file` or edit tool using the resolved target path.
    *   **Manual Override Fallback:** If no file-writing tools are active (e.g., in standard shell-less or tool-less chat mode), output the complete, correctly indented file block clearly, prompting the user to write it manually to the active workspace.

---

## 5. MCP Operational Protocols (The Parser Prompt)
*   **Identify PRDs:** `grep_search(pattern='type:: \[\[PRD\]\]', include_pattern='docs/pages/*.md')`
*   **Backlinks:** `grep_search(pattern='\[\[PageName\]\]')`
*   **Hierarchy Read:** Use `read_file` with `start_line`. Stop when indentation level returns to parent.

---

## 6. Dialectical Knowledge Audit
1.  **Graph Check:** Page has ≥ 2 `[[Links]]`.
2.  **Property Check:** `type::` and `status::` are present.
3.  **Dialectical Critique:** End update with **Yellow Hat** (resilience), **Black Hat** (risks), and **Blind Spots**.
