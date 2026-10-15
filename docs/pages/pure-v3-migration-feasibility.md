# Architectural Feasibility & Impact Analysis: Pure V3 Migration

## Document Metadata
- **Playbook:** `technical_refinement`
- **Step:** `codebase_feasibility`
- **Feature Slug:** `pure-v3-migration`
- **Architect Role:** Principal Distributed Systems Architect
- **Reference PRD:** [`docs/pages/pure-v3-migration-prd.md`](docs/pages/pure-v3-migration-prd.md)
- **Status:** Complete / Ready for Work Breakdown

---

## 1. Executive Feasibility Assessment
The proposal to decommission legacy v2 compatibility and transition `tech-agents` to a **Pure V3 Architecture** is **HIGHLY FEASIBLE** and mathematically sound:
- **Blast Radius:** Contained entirely within the agent prompt generation and routing layer (`index.js`, `engine/prompt_compiler.js`, `bin/tech-agents.js`).
- **Core Engine Stability:** The underlying V3 primitives (`engine/playbook_runner.js`, `engine/check_runner.js`, `engine/state_manager.js`, `engine/toolboxes.js`) are already self-contained and decoupled from legacy v2 code.
- **Resource Footprint:** Eradication of 191 unmaintained files (~25k lines of Markdown/TOML), elimination of the `toml` runtime dependency, and elimination of 70% token overhead per turn.

---

## 2. Codebase Reality vs. PRD Confrontation

### 2.1 File & Directory Inventory Audit
| Subsystem / Path | Current State | Target Pure V3 State | Architectural Assessment & Risk |
| :--- | :--- | :--- | :--- |
| `12 Legacy Agent Dirs`<br>(`architect/`, `backend/`, etc.) | 191 files (132 `.md`, 59 `.toml`) | **Deleted completely** | Low risk to V3 runtime. Medium risk of IP loss if knowledge is deleted before relocation. Must execute relocation pre-hook. |
| `knowledge/stacks/*.md` | 9 language guidelines | **Relocate to `knowledge/stacks/`** | `knowledge/stacks/` already has clones, but `engine/prompt_compiler.js` hardcodes lines 228–281 to `knowledge/stacks/`. Must retarget code prior to deletion. |
| `docs/mcp_usage_guide.md` | Core tool instructions | **Relocate to `docs/mcp_usage_guide.md`** | Referenced in `index.js` (line 254) and `bin/tech-agents.js` (line 43). Must update paths in both files. |
| `architect/`, `po/`, `automata/` knowledge | Domain-specific files not in root `knowledge/` | **Relocate to `knowledge/` and `docs/templates/`** | Preserves curated engineering heuristics (`bottlenecks.md`, `n8n_core.md`, `prioritization_framework.md`). |
| `index.js` | Dual v2/v3 tool surface (789 lines) | **Pure V3 Toolset** | Remove `call_agent_command`, `get_agent_prompt`. Add stateless `lens_prompt`. Refactor `list_agents` and `run_agent_loop`. |
| `engine/prompt_compiler.js` | 583 lines (contains `compileLegacyCommandPrompt`, `resolveProbes`) | **~350 lines (Pure Step Compiler)** | Purge `compileLegacyCommandPrompt`, `resolveProbes`, and TOML parsing logic. |
| `package.json` | v2.3.0 with `toml` dependency | **v3.0.0 (Clean dependencies)** | Drop `toml` from dependencies. Breaking SemVer major release. |

---

## 3. Detailed Component Impact & Refactoring Plan

### 3.1 `index.js` Interface Transformation
```
┌────────────────────────────────────────────────────────┐
│                   MCP SERVER TOOLS                     │
│                                                        │
│  [REMOVED (v2 Legacy)]                                 │
│  • call_agent_command                                  │
│  • get_agent_prompt                                    │
│                                                        │
│  [ADDED (v3 Fast-Path)]                                │
│  • lens_prompt(lens, task, context?)  <── Stateless    │
│                                                        │
│  [RETAINED & STREAMLINED (v3 Harness)]                 │
│  • playbook_list                                       │
│  • playbook_start                                      │
│  • playbook_step                                       │
│  • playbook_run_checks                                 │
│  • playbook_advance                                    │
│  • playbook_status                                     │
│  • pipeline_start, request_approval, check_gate,       │
│    pipeline_approve (Shared state machine)             │
│  • list_agents (Returns playbooks & lenses catalog)    │
│  • run_agent_loop (Refactored to execute playbook step)│
└────────────────────────────────────────────────────────┘
```

### 3.2 Stateless Fast-Path Specification: `lens_prompt`
To avoid forcing single-turn micro queries (e.g., *"adopt backend stance and review this SQL query"*) into a multi-step disk-persisted state machine:
- **Tool Name:** `lens_prompt`
- **Parameters:**
  - `lens` (string, required): e.g. `architect`, `backend`, `frontend`, `mobile`, `compliance`, `po`, `qa`, `quicky`, `council`, `automata`, `researcher`.
  - `task` (string, required): The task or question.
  - `context` (string, optional): Supplementary code or file context.
- **Behavior:** Reads `lenses/${lens}.md`, injects relevant dynamic stack guidelines from `knowledge/stacks/`, and outputs a lightweight, primed prompt without creating `.squad-state-*.json`.

### 3.3 Dynamic Stack Detection in `engine/prompt_compiler.js`
In lines 228–281, replace all occurrences of:
```js
path.join(AGENTS_ROOT, "common", "stacks", "<stack>.md")
```
with:
```js
path.join(AGENTS_ROOT, "knowledge", "stacks", "<stack>.md")
```
Ensure fallback checks look inside `knowledge/stacks/` to guarantee dynamic stack guidance remains 100% operational for Architect, Backend, Frontend, and Mobile lenses.

---

## 4. Architectural Risk & Blast Radius Matrix

| Risk Vector | Probability | Severity | Mitigation & Blast Isolation |
| :--- | :--- | :--- | :--- |
| **Silent Missing File in Dynamic Stacks** | Medium | High | Automated pre-check verifying all 9 stacks exist in `knowledge/stacks/` and unit test asserting resolution before deleting `common/`. |
| **Lost Domain Heuristics** | High | Critical | Scripted copy of all unique files (`bottlenecks.md`, `n8n_core.md`, etc.) to `knowledge/` before folder deletion. |
| **External Client Breakage** | Medium | Medium | Bump to `v3.0.0` SemVer Major. Add clear error message in `list_agents` guiding clients to V3 playbooks and `lens_prompt`. |
| **Broken CI / Tests** | High | High | Audit `test/` directory. Legacy tests (`validate-prompts.mjs`) must be pruned or updated to test V3 playbooks and lenses. |

---

## 5. Rollback & Disaster Recovery Strategy
- **Git Atomicity:** The migration will be executed on a dedicated branch with logical, isolated commits:
  1. `feat(knowledge): centralize domain heuristics and templates into knowledge/ and docs/`
  2. `refactor(engine): retarget prompt_compiler and index.js to pure v3 paths and add lens_prompt`
  3. `chore(v2): decommission legacy agent folders and remove toml dependency`
  4. `test(v3): update test suite to validate pure v3 execution`
- **Reversion Blast Radius:** If any regression occurs, a single git revert cleanly restores the legacy dual-mode without data corruption, as state files (`.squad-state-*.json`) share the same JSON schema format.
