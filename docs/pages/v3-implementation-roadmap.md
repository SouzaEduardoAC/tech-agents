- type:: [[Implementation Plan]]
- title:: [[v3-implementation-roadmap]]
- status:: [ACTIVE]
- project:: [[tech-agents]]
- spec:: [[v3-architecture-spec]]

# V3 Hybrid Architecture: Implementation Roadmap & Verification Checklists

This roadmap defines the 8 implementation phases to transition `tech-agents` from a v2 prompt compiler to a v3 Agentic Engineering Harness based on **Playbooks**, **Cognitive Lenses**, **Toolboxes**, and **Hard Checks & Gates**.

---

## Phase 1: Foundation, Dependencies & Engine Architecture
- **Objective:** Add YAML parsing support and extract core orchestration logic from `index.js` into modular engine components (`engine/state_manager.js`, `engine/prompt_compiler.js`).
- **Files Touched:**
	- `package.json`: Add `yaml` dependency.
	- `engine/state_manager.js` (NEW): Branch-scoped state resolver, session tracker, and gate state controller.
	- `engine/prompt_compiler.js` (NEW): Prompt assembler combining task args, cognitive lens, approved prior artifacts, and dynamic stack knowledge.
- **Verification Checklist:**
	- [ ] `npm install` installs `yaml` cleanly with zero vulnerability alerts.
	- [ ] Unit tests for `state_manager.js` passing (branch detection, gate locking, status update).
	- [ ] Unit tests for `prompt_compiler.js` passing (lens injection, probe resolution, deduplication).
	- [ ] All existing tests in `test/` continue to pass.

---

## Phase 2: Cognitive Lenses & Knowledge Centralization
- **Objective:** Replace bloated persona files with concise 2–3 sentence cognitive lenses in `lenses/` and centralize domain standards in `knowledge/`.
- **Files Touched:**
	- `lenses/*.md` (NEW): `architect.md`, `backend.md`, `frontend.md`, `mobile.md`, `compliance.md`, `po.md`, `qa.md`, `quicky.md`, `council.md`.
	- `knowledge/` (MIGRATED): Centralize `auth_standard.md`, `git_standard.md`, `testing_standard.md`, `licensing.md`, `gdpr.md`, `hipaa.md`, `lgpd.md`, and `stacks/`.
- **Verification Checklist:**
	- [ ] All 9 lens files created and validated: each lens is strictly $\le$ 4 sentences with zero `BIOS` or roleplay lore.
	- [ ] Token count audit: each lens prompt payload uses $\le$ 250 tokens (compared to 2,500+ tokens in legacy personas).
	- [ ] All knowledge files organized cleanly in `knowledge/` with verified relative path resolution.

---

## Phase 3: Declarative Playbooks & Check Schemas
- **Objective:** Create declarative YAML playbooks defining concrete SDLC workflows and JSON schemas for soft verification.
- **Files Touched:**
	- `playbooks/*.yaml` (NEW): `feature_dev.yaml`, `bug_fix.yaml`, `security_audit.yaml`, `pr_review.yaml`, `consultation.yaml`, `full_sync.yaml`.
	- `checks/schemas/*.json` (NEW): `prd_schema.json`, `adr_schema.json`, `audit_schema.json`, `acceptance_schema.json`.
- **Verification Checklist:**
	- [ ] All 6 playbooks parse cleanly with `yaml.parse()`.
	- [ ] Every step in every playbook references a valid lens in `lenses/` and existing toolbox names.
	- [ ] Playbook DAG validation: no orphan steps, circular step dependencies, or missing gate references.
	- [ ] JSON schemas validated against sample outputs using standard schema validator.

---

## Phase 4: Deterministic Hard Check Engine
- **Objective:** Build `engine/check_runner.js` to execute real test suites, linters, and typecheckers locally, returning machine exit codes to gate pipeline steps.
- **Files Touched:**
	- `engine/check_runner.js` (NEW): Child process executor with timeout and exit-code capture; stack-aware test/lint detector; soft check schema evaluator.
	- `checks/hard/git_clean.sh` (NEW): Clean working tree assertion script.
- **Verification Checklist:**
	- [ ] Passing command returns `{ pass: true, exitCode: 0 }`.
	- [ ] Failing command returns `{ pass: false, exitCode: non-zero, error: "..." }`.
	- [ ] Long-running command terminates gracefully when `timeoutMs` is exceeded.
	- [ ] Stack detector accurately identifies npm/yarn, Python, Go, and Rust projects.

---

## Phase 5: Playbook Runner & State Machine
- **Objective:** Build `engine/playbook_runner.js` to coordinate steps, enforce gate locking, and assemble step execution contexts.
- **Files Touched:**
	- `engine/playbook_runner.js` (NEW): Playbook lifecycle manager (`start`, `getActiveStep`, `runChecks`, `advanceStep`, `status`).
- **Verification Checklist:**
	- [ ] `advanceStep()` throws hard error if the step's gate is `locked` or `pending`.
	- [ ] `advanceStep()` throws hard error if hard checks failed (exit code $\neq$ 0).
	- [ ] Check failure outputs are formatted cleanly to feed into LLM context for automated self-correction.
	- [ ] Full pipeline walkthrough test: simulates advancing through all 6 phases with mock approvals.

---

## Phase 6: MCP Server Integration & Backward Compatibility Adapter
- **Objective:** Update `index.js` to expose native v3 MCP tools while routing legacy v2 calls (`call_agent_command`, `pipeline_*`) through the new engine.
- **Files Touched:**
	- `index.js` (REFACTOR): Register `playbook_list`, `playbook_start`, `playbook_step`, `playbook_run_checks`, `playbook_advance`, `playbook_status`. Implement backward-compatibility bridge for `call_agent_command` and `pipeline_*`.
- **Verification Checklist:**
	- [ ] Running MCP tool `list_agents` returns both playbooks and legacy agent mappings.
	- [ ] Running legacy `call_agent_command("squad", "run", "...")` executes seamlessly.
	- [ ] Running native `playbook_start` initializes and returns valid session.
	- [ ] Calling `check_gate` across existing test files continues to pass.

---

## Phase 7: End-to-End Test Suite
- **Objective:** Create comprehensive test files validating the new architecture and preventing regressions.
- **Files Touched:**
	- `test/v3-playbook-runner-test.js` (NEW)
	- `test/v3-check-runner-test.js` (NEW)
	- `test/v3-backward-compatibility-test.js` (NEW)
- **Verification Checklist:**
	- [ ] `node test/v3-playbook-runner-test.js` exits 0.
	- [ ] `node test/v3-check-runner-test.js` exits 0.
	- [ ] `node test/v3-backward-compatibility-test.js` exits 0.
	- [ ] All pre-existing test suites in `test/*.js` exit 0.

---

## Phase 8: Documentation & Protocol Integrity Sync
- **Objective:** Update README, cognitive anchors, Logseq graph, and documentation map to reflect v3 architecture.
- **Files Touched:**
	- `README.md` (MODIFY): Update architecture overview, v3 primitives (Playbooks, Lenses, Toolboxes, Checks), MCP tools list, and quickstart examples.
	- `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`: Update architecture sections, tool tables, and workflow examples.
	- `docs/pages/TECHNICAL_SPECS.md`: Document v3 engine architecture, playbooks, and check runner.
	- `docs/pages/registry.md`: Register all v3 features, lenses, and playbooks.
	- `docs/journals/2026_09_24.md`: Journal entry marking completion of v3 implementation.
- **Verification Checklist:**
	- [ ] `README.md` updated with v3 architecture, new MCP tools, and full-cycle development examples.
	- [ ] All three cognitive anchors (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`) synchronized.
	- [ ] Logseq graph page links validated with zero broken references.
	- [ ] Registry accurately indexes all new components.
