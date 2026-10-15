---
title: "Architecture Decision Record (ADR): Full Decommissioning of V2 in Favor of Pure V3 Harness"
status: "ACCEPTED"
context: "The tech-agents repository currently operates under a hybrid architecture supporting both legacy v2 prompt-compilation (with 191 unmaintained files, 59 TOML commands, and high token bloat) and modern v3 deterministic playbooks with lenses and hard checks. Dual maintenance has become a liability, causing architectural drift, bloated dependencies (toml), and confusing developer experience."
decision: "We will completely decommission the legacy v2 architecture, remove all 12 legacy agent directories, purge the toml dependency, retarget internal engine paths to root knowledge/stacks/, and introduce a stateless lens_prompt MCP tool to serve single-turn operations within a unified v3.0.0 framework."
consequences:
  positive:
    - "Removes 191 legacy files and ~25,000 lines of unmaintained prompt clutter."
    - "Reduces token consumption by up to 70% per turn by eliminating theatrical persona definitions."
    - "Eliminates runtime dependency on toml parser and regex-based prompt probe injection."
    - "Provides a single, deterministic mental model based on Playbooks, Lenses, Toolboxes, and Local Hard Checks."
    - "Introduces stateless lens_prompt for rapid, overhead-free micro tasks."
  negative:
    - "Breaks legacy slash commands (/<agent>:<cmd>) unless callers update to playbooks or lens_prompt."
    - "Requires semver major release bump to 3.0.0 due to breaking tool surface removal (call_agent_command)."
  neutral:
    - "All 14 existing V3 playbooks remain 100% operational and become the primary interaction mode."
rollback_strategy: "Execute migration in four discrete git commits (Knowledge Evacuation -> Engine Path Alignment -> V2 Deletion -> Toolset Alignment). If any regression occurs, a single git revert restores the dual-mode repository state with zero data loss."
---

# Architecture Decision & Implementation Plan: Pure V3 Migration

## 1. Context & Decision Summary
This Architecture Decision Record and Implementation Plan defines the engineering roadmap for decommissioning the legacy v2 prompt-compiler system and transitioning `@souzaeduardoac/tech-agents` to a 100% pure v3 architecture.

---

## 2. Granular Work Breakdown Structure (WBS)

### Phase 1: Zero-Loss Knowledge & Template Evacuation
- **Task 1.1:** Relocate unique heuristics from `knowledge/`:
  - `knowledge/bottlenecks.md` $\rightarrow$ `knowledge/bottlenecks.md`
  - `knowledge/dependencies.md` $\rightarrow$ `knowledge/dependencies.md`
  - `knowledge/patterns.md` $\rightarrow$ `knowledge/patterns.md`
  - `knowledge/roi_logic.md` $\rightarrow$ `knowledge/roi_logic.md`
- **Task 1.2:** Relocate automation & PO knowledge:
  - `knowledge/n8n_core.md` $\rightarrow$ `knowledge/n8n_core.md`
  - `knowledge/prioritization_framework.md` $\rightarrow$ `knowledge/prioritization_framework.md`
- **Task 1.3:** Relocate documentation & Logseq templates:
  - `docs/templates/logseq/*` $\rightarrow$ `docs/templates/logseq/`
  - `docs/templates/architecture/*` $\rightarrow$ `docs/templates/architecture/`
  - `docs/templates/automata/*` $\rightarrow$ `docs/templates/automata/`
  - `docs/mcp_usage_guide.md` $\rightarrow$ `docs/mcp_usage_guide.md`

### Phase 2: Engine Internal Path Alignment & Decoupling
- **Task 2.1:** In `engine/prompt_compiler.js`, update `getDynamicKnowledge`:
  - Retarget lines 228–281 to resolve stacks from `knowledge/stacks/` instead of `knowledge/stacks/`.
  - Remove fallback calls to `common/knowledge`.
- **Task 2.2:** In `engine/prompt_compiler.js`:
  - Remove `compileLegacyCommandPrompt`, `compileCommonSection`, `resolveProbes`, and `toml` imports.
  - Implement and export `compileLensPrompt({ lens, task, context, customCwd })` for fast-path execution.
- **Task 2.3:** In `bin/tech-agents.js`:
  - Update `mcp_usage_guide` path to `docs/mcp_usage_guide.md`.
  - Update `link` command to link `lenses/[lens].md` or `knowledge/[standard].md`.

### Phase 3: MCP Tool Surface Streamlining (`index.js`)
- **Task 3.1:** Add stateless `lens_prompt` tool:
  - Parameters: `lens` (string), `task` (string), `context` (optional string).
  - Returns primed prompt immediately without state file or gate initialization.
- **Task 3.2:** Retire legacy tools:
  - Remove `call_agent_command` and `get_agent_prompt`.
  - Refactor `list_agents` to return the catalog of 14 Playbooks, 11 Lenses, and the Usage Guide.
  - Refactor `run_agent_loop` to operate over Playbook steps.
- **Task 3.3:** Preserve shared gate tools:
  - `pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve`.
  - Native v3 tools: `playbook_list`, `playbook_start`, `playbook_step`, `playbook_run_checks`, `playbook_advance`, `playbook_status`.

### Phase 4: Legacy Asset Decommissioning & Cleanup
- **Task 4.1:** Delete the 12 legacy agent directories:
  - `architect/`, `backend/`, `frontend/`, `mobile/`, `compliance/`, `po/`, `council/`, `decoder/`, `quicky/`, `researcher/`, `automata/`, `squad/`.
- **Task 4.2:** Delete `common/`.
- **Task 4.3:** In `package.json`:
  - Remove `"toml": "^3.0.0"`.
  - Bump `"version": "3.0.0"`.

### Phase 5: Verification & Test Suite Execution
- **Task 5.1:** Update test suite in `test/`:
  - Retire or update tests that assert v2 TOML compilation (`validate-prompts.mjs`, legacy assertions in `mcp-integration.mjs`).
  - Add unit test for `lens_prompt`.
- **Task 5.2:** Run full local test suite:
  - Run `npm test` across all 17 test suites to ensure 100% green exit code 0.
- **Task 5.3:** Synchronize documentation:
  - Update `README.md`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, and `docs/pages/registry.md`.

---

## 3. Implementation Verification Criteria
1. `npm test` exits with code 0.
2. `playbook_list` lists all 14 playbooks cleanly.
3. `lens_prompt` returns primed prompt for all 11 lenses.
4. Working tree contains zero `.toml` prompt files and zero legacy agent folders.
