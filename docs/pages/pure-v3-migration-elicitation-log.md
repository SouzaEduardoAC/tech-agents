# Elicitation Log: Pure V3 Architecture Migration

## Session Metadata
- **Playbook:** `product_discovery`
- **Step:** `elicitation_interview`
- **Feature Slug:** `pure-v3-migration`
- **Role:** Product Owner / Business Strategist
- **Date:** 2026-10-10
- **Status:** Complete / Approved by Stakeholder

---

## 1. Executive Summary & Problem Framing
The `tech-agents` platform currently operates as a hybrid engine maintaining both:
1. **Legacy v2 ("Prompt Compiler & Persona Cosplay"):** 12 agent folders (`architect/`, `backend/`, `frontend/`, `mobile/`, `compliance/`, `po/`, `council/`, `decoder/`, `quicky/`, `researcher/`, `automata/`, `squad/`), containing 191 files, 59 TOML commands, `brain/persona.md` files, and prompt concatenators that inject 2,000–5,000 tokens of theatrical persona rules per turn.
2. **Modern v3 ("Agentic Engineering Harness"):** 14 deterministic DAG playbooks (`playbooks/*.yaml`), 11 scoped cognitive lenses (`lenses/*.md`), scoped toolboxes (`engine/toolboxes.js`), and machine-enforced local test/lint exit-code gates (`engine/check_runner.js`).

**The Goal:** Fully decommission v2 legacy files, legacy prompt-compiler dependencies (`toml`), and legacy command routers, achieving a clean, pure V3 architecture while preserving 100% of curated domain IP and providing a stateless fast-path for single-turn queries.

---

## 2. Five-Phase Discovery Elicitation Breakdown

### Phase 1: Problem Definition & Value Mapping (The "Why")
- **Pain Points:**
  - Double maintenance overhead: changes to standards require updating both v2 and v3.
  - Huge token bloat in legacy command paths (up to 70% redundant context).
  - Risk of persona drift and unverified hallucinated checks in v2.
  - Dependency on `toml` npm package and complex regex probe replacement (`!{cat ...}`).
- **Primary Beneficiaries:**
  - AI Clients: Gemini CLI, Claude Code, AntiGravity, Cursor, Codex.
  - Human Engineers: Unified SDLC mental model, faster tool responses, guaranteed deterministic execution.
- **Value Metric:**
  - Zero token waste on theatrical personas.
  - Exit-code-proven quality gates.
  - Streamlined repository footprint (reduction of ~190 files / ~25k lines of legacy clutter).

### Phase 2: Scope & Boundary Decisions (Stakeholder Alignment)
1. **Legacy Slash Commands & Commands Folder:**
   - **Decision:** Decommission. The SDLC lifecycle is fully ported and covered by the 14 V3 playbooks (`feature_dev`, `workflow_dev`, `bug_fix`, `component_scaffold`, `product_discovery`, `technical_refinement`, `council_debate`, `security_audit`, `deep_research`, `business_synthesis`, `pr_review`, `consultation`, `codebase_health_audit`, `full_sync`).
   - Legacy TOML commands and persona files are completely retired.
2. **Domain Knowledge & Templates Preservation:**
   - **Decision:** **Strict Zero IP Loss Policy.**
   - All unique, unmigrated architecture heuristics, prioritization frameworks, n8n automation guidelines, and Logseq graph templates in `architect/`, `po/`, `automata/`, and `common/` must be safely evacuated and centralized into root `knowledge/` and `docs/templates/` before folder removal.
   - Dynamic stack references in `engine/prompt_compiler.js` must be retargeted to `knowledge/stacks/`.
3. **Stateless Fast-Path (Single-Turn Execution):**
   - **Decision:** **Implement Stateless Lens Tooling (`lens_prompt`).**
   - For rapid micro-tasks, code reviews, or design queries that do not warrant a multi-step state machine with `.squad-state-*.json`, expose a lightweight MCP tool `lens_prompt(lens, task, context?)` to return the primed cognitive stance without initializing a state machine DAG.

### Phase 3: Systems, Integrations & Architecture
- **MCP Server Clean-up (`index.js`):**
  - Deprecate/retire `call_agent_command`, `get_agent_prompt`, and rewrite `run_agent_loop` to operate over Playbook steps.
  - Retain core state tools (`pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve`) for backward compatibility with external orchestration pipelines.
  - Native V3 suite is the primary interface: `playbook_list`, `playbook_start`, `playbook_step`, `playbook_run_checks`, `playbook_advance`, `playbook_status`, plus new `lens_prompt`.
- **CLI Clean-up (`bin/tech-agents.js`):**
  - Update `tech-agents link` to link lenses or root standards instead of legacy `brain/persona.md`.
  - Update `mcp_usage_guide` location to `docs/mcp_usage_guide.md`.
- **Package Clean-up (`package.json`):**
  - Remove `toml` dependency.
  - Bump package version for breaking major release `3.0.0`.

### Phase 4: Financials & Prioritization (RICE)
- **Reach:** 10/10 (Affects every agent invocation and supported client).
- **Impact:** 9/10 (Dramatically cuts tokens, eliminates persona drift, reduces maintenance surface).
- **Confidence:** 9.5/10 (V3 harness is fully verified by existing test suites).
- **Effort:** 3 days (Phased: Evacuate Knowledge $\rightarrow$ Refactor Engine & Tools $\rightarrow$ Remove Legacy $\rightarrow$ Update Tests).
- **RICE Score:** High Priority / Critical Path.

### Phase 5: Success Metrics & Definition of Done
1. Zero `.toml` files and zero legacy agent directories (`architect/`, `backend/`, etc.) in the repository.
2. Zero references to `knowledge/stacks/` or deleted legacy paths in `engine/`.
3. All 14 playbooks execute cleanly with full access to centralized `knowledge/`.
4. All unit/integration tests pass cleanly with `npm test`.
5. Version bumped to `3.0.0` following semantic versioning.
