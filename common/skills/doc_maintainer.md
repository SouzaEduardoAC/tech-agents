# Skill: Documentation Maintainer (v2026 - High-Fidelity)

## 1. Phase 0: Forensic Diagnostic (State Detection)

Before any file modification, the agent **MUST** perform a diagnostic crawl to classify the environment.

1. **Inventory Check:** Verify existence of:
* `GEMINI.md` (Root - Cognitive Anchor)
* `README.md` (Root)
* `docs/BUSINESS_FLOW.md`
* `docs/use_cases/` (Directory for individual use cases)
* `docs/TECHNICAL_SPECS.md`
* `docs/AI_Context.md`

2. **Sync-Audit (The Truth Test):**
* Randomly select **three (3) non-trivial** exported functions/methods from the current AST.
* Locate their corresponding entries in `docs/TECHNICAL_SPECS.md`.
* **Classification Logic:**
* **[STATE: GREENFIELD]**: No `/docs` directory exists.
* **[STATE: ADAPT]**: `/docs` exists, but Sync-Audit reveals logic mismatch (e.g., parameter drift, missing retry logic, or incorrect role mapping).
* **[STATE: SYNC]**: `/docs` matches the current AST. Only new code changes need to be appended or patched.

---

## 2. Operational Lifecycles

### [STATE: GREENFIELD] - Foundation Build

* **Procedure:**
1. Create `docs/` directory if missing.
2. Full AST scan to map every Entry Point, Business Use Case, and Dependency.
3. Generate the full suite using **v3.1 Templates**.


* **Strict Rule:** No boilerplate. If a section (like "Retry Policies") is empty because the code lacks them, mark it as "None Detected" and add a **Blind Spot** note.

### [STATE: ADAPT] - Documentation Refactoring

* **Procedure:**
1. **Diff Documentation vs. Code:** Highlight where existing docs "hallucinate" features that don't exist in the current AST.
2. **Destructive Cleanup:** Purge any section in `TECHNICAL_SPECS.md` that cannot be verified by a code citation.
3. **Re-Alignment:** Rewrite the logic flow to match the actual execution order discovered in the code.


* **Output:** Present a "Refactor Manifest" to the user before saving: *"I am removing 4 endpoints from the docs that were not found in the source."*

### [STATE: SYNC] - Surgical Patching

* **Procedure:**
1. **Commit Analysis:** Identify the exact lines changed in the current `diff` or `feature branch`.
2. **Targeted Update:**
* Locate the specific `docs/use_cases/use_case_name.md` or `## Entry Point` in the existing Markdown.
* Update **ONLY** the relevant sections.
* If a new service was added, append it to the **Dependencies** section of the `AI_Context.md`.


* **Strict Rule:** Do not re-generate the whole file. Use "Seek and Replace" logic to preserve manual documentation notes.

---

## 3. Technical Extraction & Reasoning (The "DNA")

### A. Dependency & Architecture Extraction

* **IoC/DI Detection:** Grep for container registrations. Identify if dependencies are **Singleton**, **Scoped**, or **Transient**.
* **Boundary Audit:** Identify if "Infrastructure" classes are leaking into the "Domain" (e.g., a Database Query being written inside a Business Logic file).

### B. Resilience & Data Logic

* **Retry/Timeout Mapping:** Extract specific millisecond values for timeouts and backoff factors for retries. Cite the configuration file.
* **Database Trace:** Identify which SQL tables are touched. Verify if the query uses an existing index (check `schema.sql` or model definitions).

### C. Complexity Visualization (Mermaid)

* **Mandatory Diagramming:** Any process involving **OAuth2**, **JWT Refresh**, **distributed transactions (Saga/2PC)**, or **recursive math** must have a Mermaid Sequence Diagram.
* **Embedding:** Each diagram MUST be embedded directly within the corresponding `docs/use_cases/*.md` file, not in a global section.

---

## 4. Dialectical Analysis (The Three Hats)

Every technical deep-dive must conclude with this structured critique:

1. **Yellow Hat (Robustness):** Identify the most resilient part of the code (e.g., "The use of atomic transactions ensures data integrity").
2. **Black Hat (Risks):** Identify architectural debt (e.g., "Synchronous call to external API in the request thread will cause latency spikes").
3. **Blind Spots:** Identify what the code *ignores* (e.g., "The system does not handle the case where the Message Broker is unreachable").

---

## 5. Implementation Standards for the Agent

1. **Verification Protocol:** No citation = No inclusion. Every technical claim must have a `(ref: class_or_function)`.
2. **Negative Scope:** Ignore standard libraries, linter configs, and trivial boilerplate.
3. **Role Mapping:** Identify the `Primary Role` by tracing decorators like `@authorized` or middleware checks.
4. **Format Adherence:** Strictly use the Markdown templates provided in the `templates/` folder.

---

## 6. AI Context & Graph Protocol (The Cognitive Anchor)

1. **Mandatory Entry Points:** The agent **MUST** maintain two root-level context files:
    - **`AGENTS.md`**: The primary universal entry point. Contains tech stack, coding standards, and project-agnostic rules.
    - **`GEMINI.md`**: The tool-specific anchor for Gemini/AntiGravity CLI. Contains slash command behaviors and specific model overrides.
    - *Note:* In the AntiGravity ecosystem, `GEMINI.md` takes precedence over `AGENTS.md`.
2. **Graph Integration:** Both files must link to the Logseq graph pages located in `docs/pages/` (e.g., `[[tech-agents-graph]]`, `[[TECHNICAL_SPECS]]`).
3. **Syntax Mandate:** 
    - Use Logseq-style `[[links]]` for all internal page references.
    - Use `#tags` for categorizing technical domains (e.g., `#security`, `#backend`).
    - Use `TODO`/`DONE` markers for tracking documentation tasks or technical debt within the markdown.
4. **Sync-to-Graph:** Every update to the codebase logic must be reflected in the corresponding Logseq node in `docs/pages/`.