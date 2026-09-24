- type:: [[Technical Specification]]
- title:: [[v3-architecture-spec]]
- status:: [DRAFT]
- version:: 3.0.0
- project:: [[tech-agents]]

# V3 Hybrid Architecture Specification: Playbooks, Lenses, Toolboxes & Hard Checks

## 1. Executive Summary & Architectural Evolution

The **tech-agents** platform is evolving from a **v2 Prompt Compiler** into a **v3 Agentic Engineering Harness**.

### 1.1 The Problem with v2 ("Prompt Cosplay")
In v2, "Agents" are simulated by concatenating thousands of tokens of static persona definitions (`BIOS`, `UNIVERSAL COGNITIVE ANCHOR`, identity tags like `[Agent: BACKEND | Command: CREATE]`) with parameterized TOML prompts and Markdown files. While effective for simple single-turn prompts, this architecture exhibits critical engineering flaws in full-lifecycle SDLC workflows:
1. **Theatrical Context Bloat:** Up to 70% of injected prompt tokens consist of redundant persona declarations and behavioral rules rather than actionable task context.
2. **Context Rot & Persona Drift:** During multi-turn executions across 6 phases (e.g. `squad:run`), the LLM gradually drifts from its persona, forgets constraints decided in Phase 1, or hallucinates that later checks passed.
3. **Soft Verifications (Self-Grading):** Reviewer and auditor "agents" are merely soft text prompts asking the LLM to inspect its own or prior generated output. If the model is lazy or token limits are approached, it outputs false "LGTM" verifications without running tests or static analysis.
4. **Fragile Gate Bypassing:** LLMs can occasionally hallucinate approval and skip human gates between phases unless restrained by external state machines.

### 1.2 The v3 Core Premise
> **"Personas propose and critique; Toolboxes execute; Hard Checks decide."**

v3 redefines the system around four orthogonal primitives:
- **Playbooks (The Workflows):** Deterministic, declarative state-machine pipelines (DAGs) defining stages from discovery to pull request.
- **Cognitive Lenses (The Mindset):** Highly concentrated 2–3 sentence role stances that prime transformer latent spaces for specific trade-offs (e.g., security skepticism, user empathy, low coupling) without token overhead or theatrical fluff.
- **Toolboxes (The Hands):** Scoped, isolated capability sets exposed per step under the principle of least privilege (Git, Filesystem, Static Analysis, Test Runners).
- **Checks & Gates (The Ground Truth):** Deterministic exit-code verifications (`npm test`, `tsc`, `semgrep`) and machine-enforced disk-persisted approval gates (`.squad-state-[branch].json`) that physically prevent phase transitions upon failure.

---

## 2. The Four Core Primitives

```
┌────────────────────────────────────────────────────────────────────────┐
│                        V3 PLAYBOOK RUNNER                              │
│                                                                        │
│   ┌────────────────┐      ┌────────────────┐     ┌─────────────────┐   │
│   │ Cognitive Lens │  +   │ Scoped Toolbox │  +  │ Task Context &  │   │
│   │ (Mindset/Bias) │      │  (Capabilities)│     │ Prior Artifacts │   │
│   └───────┬────────┘      └────────┬───────┘     └────────┬────────┘   │
│           │                        │                      │            │
│           ▼                        ▼                      ▼            │
│      ┌────────────────────────────────────────────────────────┐        │
│      │                  LLM INFERENCE TURN                    │        │
│      │        (Generates Artifacts / Proposes Changes)        │        │
│      └────────────────────────────┬───────────────────────────┘        │
│                                   │                                    │
│                                   ▼                                    │
│      ┌────────────────────────────────────────────────────────┐        │
│      │                 VERIFICATION GATE                      │        │
│      │  • Hard Checks: `npm test`, `tsc`, `semgrep` (Exit 0)  │        │
│      │  • Soft Checks: Structured JSON Schema Evaluation      │        │
│      │  • Human Approval Gate: `.squad-state-[branch].json`   │        │
│      └────────────────────────────┬───────────────────────────┘        │
│                                   │                                    │
│                  [Pass] ──────────┴────────── [Fail]                   │
│                    │                            │                      │
│                    ▼                            ▼                      │
│             Advance Stage              Reject & Remediate              │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Playbooks (The Workflows)
A Playbook is a declarative YAML/JSON document defining a discrete software development lifecycle. Each playbook specifies:
- `id` & `name`: Unique identifiers.
- `gates`: Ordered list of required human-approval gates.
- `steps`: Sequential or branching stages.
- Each step defines:
  - `lens`: The cognitive stance to adopt.
  - `toolbox`: List of permitted tool namespaces for this step.
  - `input_artifacts`: File paths or prior step outputs injected into context.
  - `output_artifact`: Required file output.
  - `hard_checks`: Local shell commands that MUST exit with code 0 before completing the step.
  - `soft_checks`: Structured LLM evaluations requiring strict JSON schema compliance.
  - `gate`: Associated human approval gate (if any).

### 2.2 Cognitive Lenses (The Mindset)
A Lens replaces the 500-line "Agent Persona". It consists of 2–3 dense sentences defining:
1. **The Professional Stance:** Who the model is embodying.
2. **The Evaluation Bias:** What trade-offs the model prioritizes (e.g. security over speed; ergonomics over brevity).
3. **The Heuristic Rule:** The primary directive guiding the model's judgment.

*Example (Architect Lens):*
> "Adopt the stance of a Principal Distributed Systems Architect. Prioritize failure isolation, low coupling, data consistency, and minimal blast radius above all else. Challenge every stateful assumption and demand clear rollback strategies."

*Example (Security Lens):*
> "Adopt the stance of an adversarial red-team penetration tester. Assume all external inputs are malicious, session tokens can be leaked, and internal services are untrusted. Prioritize auth bypass, injection risks, and PII leakage above implementation convenience."

### 2.3 Toolboxes (The Hands)
Toolboxes are modular MCP tool groups injected dynamically based on the active step:
- **`git_toolbox`**: Branching, staging, committing (enforcing Conventional Commits with scope and body), diff inspection, and PR opening.
- **`fs_toolbox`**: Scoped file reading, targeted line replacements, and artifact writing.
- **`analysis_toolbox`**: AST search (`ast-grep`), symbol tracing, dependency graphs.
- **`verification_toolbox`**: Local command execution restricted to test runners, linters, and typecheckers.
- **`docs_toolbox`**: Knowledge graph updating, Logseq page creation, and registry syncing.

### 2.4 Checks & Gates (The Ground Truth)
Verification is strictly bifurcated:
1. **Hard Checks (Deterministic Machine Truth):**
   - Executed locally by the MCP server process via `child_process`.
   - Never delegated to LLM imagination.
   - Examples: `npm test`, `npm run lint`, `tsc --noEmit`, `pytest`, `cargo test`, `semgrep --config p/security`.
   - If exit code $\neq$ 0, the step **fails immediately** and the raw error output is fed back to the LLM for remediation.
2. **Soft Checks (Semantic JSON Evaluation):**
   - Used only when machine checkers cannot evaluate subjective criteria (e.g. "Does the architecture document fulfill the user's PRD?").
   - Evaluated by an LLM-as-a-judge with **strict JSON output schema** (`{ "pass": boolean, "score": number, "violations": string[] }`).
3. **Approval Gates (Human-in-the-Loop State Machine):**
   - Persisted in `.squad-state-[branchSlug].json`.
   - Hard blocks that require explicit human approval via `/squad:approve <gate>` or `pipeline_approve`.

---

## 3. Directory Layout: Before vs. After

### 3.1 Legacy v2 Layout (Flat Persona Folders)
```
tech-agents/
├── index.js                     # Monolithic prompt concatenator (~1300 lines)
├── bin/tech-agents.js
├── AGENTS.md, CLAUDE.md, GEMINI.md
├── architect/
│   ├── commands/architect/*.toml
│   ├── knowledge/*.md
│   └── skills/*.md
├── backend/
│   ├── commands/backend/*.toml
│   ├── knowledge/*.md
│   └── skills/*.md
├── compliance/, council/, decoder/, forge/, frontend/, mobile/, po/, quicky/, researcher/, automata/, squad/
├── common/
│   ├── knowledge/*.md
│   └── skills/*.md
└── docs/pages/
```

### 3.2 Target v3 Hybrid Layout (Modular Playbooks & Engine)
```
tech-agents/
├── index.js                     # MCP Server entry point (Backward-compatible + v3 tools)
├── bin/tech-agents.js           # CLI entry point
├── AGENTS.md, CLAUDE.md, GEMINI.md
├── engine/                      # Core Execution Engine & State Machine
│   ├── playbook_runner.js       # Playbook DAG / step executor
│   ├── check_runner.js          # Hard check (child_process) & soft check evaluator
│   ├── state_manager.js         # Branch-scoped state resolver (.squad-state-*.json)
│   ├── prompt_compiler.js       # Scoped prompt assembler (Task + Lens + Artifacts)
│   └── toolboxes.js             # Dynamic tool registry & permissions
│
├── playbooks/                   # Declarative SDLC Workflows (YAML)
│   ├── feature_dev.yaml         # Discovery -> Plan -> Code -> Verify -> PR
│   ├── bug_fix.yaml             # Reproduce -> Patch -> Regression Test -> Commit
│   ├── security_audit.yaml      # Static Scan -> Threat Model -> Remediate
│   ├── pr_review.yaml           # Diff Fetch -> Stack Check -> Review -> Comment
│   ├── consultation.yaml        # Non-coding brainstorming / advisory
│   └── full_sync.yaml           # Codebase documentation sync
│
├── lenses/                      # Concentrated Cognitive Roles (2-3 sentences each)
│   ├── architect.md             # Systems design, resilience, blast radius
│   ├── backend.md               # API contracts, concurrency, data integrity
│   ├── frontend.md              # UI/UX ergonomics, accessibility, CWV
│   ├── mobile.md                # Lifecycle, offline-first, mobile UX
│   ├── compliance.md            # Adversarial security, PII, GDPR, HIPAA
│   ├── po.md                    # Requirements discovery, acceptance criteria
│   ├── qa.md                    # Edge cases, negative testing, stress tests
│   ├── quicky.md                # Surgical minimal-diff repairs
│   └── council.md               # Multi-perspective tension & dialectic synthesis
│
├── toolboxes/                   # Tool Definitions & Handlers
│   ├── git/                     # Git operations (diff, branch, commit, PR)
│   ├── fs/                      # Scoped workspace reading & writing
│   ├── verifier/                # Executable hard checks runner (linters, tests)
│   ├── analysis/                # Codebase search, AST queries, stack detection
│   └── docs/                    # Logseq graph & registry writers
│
├── checks/                      # Hard Check Configs & Soft Check Schemas
│   ├── hard/
│   │   ├── git_clean.sh         # Ensures working tree is clean
│   │   ├── standard_lint.sh     # Auto-detects and runs repo linter
│   │   └── standard_test.sh     # Auto-detects and runs repo test suite
│   └── schemas/
│       ├── prd_schema.json      # Soft check schema for PRDs
│       ├── adr_schema.json      # Soft check schema for Architecture specs
│       └── audit_schema.json    # Soft check schema for Compliance audits
│
├── knowledge/                   # Universal Domain Reference Standards
│   ├── auth_standard.md         # OAuth2, JWT, RBAC best practices
│   ├── git_standard.md          # Conventional Commits with scope and body
│   ├── testing_standard.md      # Unit, integration, regression requirements
│   ├── licensing.md             # Commercial dependency & license rules
│   ├── gdpr.md                  # Privacy, deletion, export rules
│   ├── hipaa.md                 # ePHI, encryption, audit trails
│   ├── lgpd.md                  # Brazilian data protection rules
│   └── stacks/                  # Language-specific guidelines (java, react, flutter, etc.)
│
└── docs/pages/                  # Logseq Documentation Graph
    ├── v3-architecture-spec.md  # This document
    ├── registry.md              # Global feature registry
    └── TECHNICAL_SPECS.md       # Synchronized technical DNA
```

---

## 4. File-by-File Disposition Matrix

| Current File / Directory | Target Location in v3 | Status | Changes Required |
| :--- | :--- | :--- | :--- |
| **`index.js`** | `index.js` + `engine/*.js` | **REFACTOR** | Modularize: extract state management, prompt compilation, and tool handling into `engine/`. Add v3 tools (`playbook_*`, `squad_run_checks`) while maintaining 100% backward compatibility for legacy `call_agent_command` and `pipeline_*`. |
| **`squad/commands/squad/run.toml`** | `playbooks/feature_dev.yaml` | **CONVERT** | Convert 6-phase manual checklist into executable playbook steps with hard checks and lenses. |
| **`squad/commands/squad/full-sync.toml`**| `playbooks/full_sync.yaml` | **CONVERT** | Convert into doc-sync workflow. |
| **`architect/commands/architect/*.toml`**| Merged into `playbooks/` & `lenses/architect.md` | **CONVERT** | `create.toml` $\rightarrow$ `feature_dev.yaml` (Phase 2); `adhoc.toml` $\rightarrow$ `consultation.yaml`. |
| **`architect/skills/*.md`** | `checks/schemas/` & `knowledge/` | **MIGRATE** | Checklists become soft check schemas; guidelines move to `knowledge/`. |
| **`architect/knowledge/*.md`** | `knowledge/` | **MOVE** | Centralize domain knowledge. |
| **`backend/commands/backend/*.toml`** | Merged into `playbooks/` & `lenses/backend.md` | **CONVERT** | `create.toml` $\rightarrow$ `feature_dev.yaml` (Phase 4); `review.toml` $\rightarrow$ `pr_review.yaml`. |
| **`backend/skills/*.md`** | `checks/` & `toolboxes/` | **MIGRATE** | Reviewer protocols become automated checks. |
| **`frontend/` & `mobile/`** | `lenses/` & `knowledge/stacks/` | **MIGRATE** | Personas become `lenses/frontend.md` and `lenses/mobile.md`; stack guides move to `knowledge/stacks/`. |
| **`compliance/`** | `lenses/compliance.md` & `knowledge/` | **MIGRATE** | `gdpr.md`, `hipaa.md`, `lgpd.md` move to `knowledge/`. Audit command becomes `playbooks/security_audit.yaml`. |
| **`po/`** | `lenses/po.md` & `checks/schemas/` | **MIGRATE** | `acceptance_validation.md` becomes a soft check schema and verification step in `feature_dev.yaml`. |
| **`quicky/`** | `lenses/quicky.md` & `playbooks/quick_fix.yaml` | **CONVERT** | Converted into rapid bug-fix playbook with automated regression test check. |
| **`council/`** | `lenses/council.md` & `playbooks/debate.yaml` | **CONVERT** | Multi-perspective debate playbook with dialectic synthesis step. |
| **`common/knowledge/*.md`** | `knowledge/*.md` | **KEEP** | Preserved completely: `git_standard.md`, `auth_standard.md`, `testing_standard.md`, `licensing.md`. |
| **`common/skills/pr_review.md`** | `playbooks/pr_review.yaml` | **CONVERT** | Converted into PR review playbook. |
| **`common/skills/investigation.md`**| `playbooks/investigation.yaml` | **CONVERT** | Converted into read-only simulation playbook. |
| **`common/skills/mcp_usage_guide.md`**| `docs/mcp_usage_guide.md` | **UPDATE** | Updated with v3 playbook mechanics, decision flowcharts, and backwards-compatible commands. |
| **`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`**| Root anchors | **UPDATE** | Updated cognitive anchors to document v3 hybrid architecture. |

---

## 5. End-to-End Mechanics: Full Cycle Development

Here is the operational lifecycle of running a complete feature development cycle from brainstorm to Pull Request in v3:

### Step 1: Session Initialization
The client calls:
```json
playbook_start({
  "playbook": "feature_dev",
  "goal": "Implement OAuth2 Google and GitHub login with session tokens"
})
```
- The engine creates `.squad-state-[branch].json`.
- Locks all configured gates: `["prd", "discovery", "plan", "compliance", "execution", "acceptance"]`.
- Sets active step to `step_1_discovery`.

### Step 2: Phase 1 — Product Discovery & Requirements (Lens: PO)
- **Prompt Assembled:**
  - Active Lens: `lenses/po.md` (Empathy, edge cases, clear acceptance criteria).
  - Context: User goal + existing project documentation.
  - Toolbox: `["fs_read", "search_web"]`.
- **Action:** Model engages user, clarifies requirements, and writes `docs/pages/oauth-prd.md`.
- **Soft Check:** Engine validates markdown structure against `checks/schemas/prd_schema.json`.
- **Gate:** Engine calls `request_approval("prd")`. **Pipeline halts.**
- **Human Action:** Developer reviews PRD and runs `/squad:approve prd`.

### Step 3: Phase 2 — Architecture & Implementation Design (Lens: Architect)
- **Gate Check:** Engine verifies `check_gate("prd") == approved`.
- **Prompt Assembled:**
  - Active Lens: `lenses/architect.md` (Low coupling, failure blast radius, clean contracts).
  - Context: Approved PRD + codebase symbol map + `knowledge/auth_standard.md`.
  - Toolbox: `["fs_read", "analysis"]`.
- **Action:** Model writes technical analysis (`docs/pages/oauth-analysis.md`) and architecture decision record (`docs/pages/oauth-architecture.md`).
- **Gate:** Engine calls `request_approval("plan")`. **Pipeline halts.**
- **Human Action:** Developer reviews ADR and runs `/squad:approve plan`.

### Step 4: Phase 3 — Security & Threat Modeling (Lens: Compliance - Conditional)
- **Trigger Evaluation:** Engine detects auth/token keywords $\rightarrow$ activates Security step.
- **Hard Check:** Engine automatically runs `npm audit` and static security scan.
- **Prompt Assembled:**
  - Active Lens: `lenses/compliance.md` (Adversarial skepticism, token leakage, OWASP).
  - Context: ADR + scan findings + `knowledge/auth_standard.md`.
- **Action:** Model writes `docs/pages/oauth-threat-model.md` addressing all findings.
- **Gate:** Human approval on `compliance` gate.

### Step 5: Phase 4 — Implementation & Hard Verification (Lens: Developer)
- **Gate Check:** Engine verifies `check_gate("plan") == approved`.
- **Prompt Assembled:**
  - Active Lens: `lenses/backend.md` (Clean, typed, idiomatic code; zero untested branches).
  - Context: Approved PRD + Architecture + Reference standards.
  - Toolbox: `["fs_read", "fs_write", "git"]`.
- **Action:** Model writes code, unit tests, and database migrations.
- **Hard Check Execution (The Crucial Ground Truth):**
  - Engine automatically executes locally:
    1. `tsc --noEmit` (TypeScript typecheck)
    2. `npm run lint` (Linter)
    3. `npm test` (Unit test suite)
  - If **ANY** command fails (exit code $\neq$ 0):
    - The step **does NOT advance**.
    - The engine feeds the exact terminal stdout/stderr back into the LLM context:
      > *"Hard Check Failed: npm test failed with 2 errors in AuthService.spec.ts. Fix these issues before proceeding."*
    - The LLM fixes the errors and re-triggers the check.
- **Gate:** Once all hard checks pass with exit code 0, engine calls `request_approval("execution")`.

### Step 6: Phase 5 — Product Acceptance (Lens: PO)
- **Gate Check:** Engine verifies `check_gate("execution") == approved`.
- **Prompt Assembled:**
  - Active Lens: `lenses/po.md` (Confront implementation with original PRD).
  - Context: PRD + Test outputs + Git diff.
- **Action:** Verifies every Gherkin scenario in the PRD against test results. Generates `docs/pages/oauth-acceptance.md`.
- **Gate:** Human signs off on `acceptance`.

### Step 7: Phase 6 — Pull Request Generation (Lens: Tech Lead)
- **Toolbox:** `["git"]`.
- **Action:**
  - Verifies git working directory is clean.
  - Formats commits according to Conventional Commits (enforcing mandatory scope and body).
  - Pushes branch to remote.
  - Creates Pull Request with formatted summary, test evidence, and links to Logseq documentation.
- **Playbook Status:** `COMPLETED`.

---

## 6. Backward Compatibility & Transition Strategy

To avoid breaking existing user environments (Gemini CLI, Claude Code, Cursor, Codex), the v3 architecture maintains **100% backward compatibility**:

1. **Legacy MCP Tools Retained:**
   - `list_agents`: Returns available playbooks and legacy agent mappings.
   - `call_agent_command`: Internally maps `call_agent_command(agent, command, args)` to the corresponding playbook step or lens, returning the assembled prompt seamlessly.
   - `pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve`: Maintain exact function signatures and state file compatibility (`.squad-state-*.json`).
2. **New Native v3 MCP Tools Added:**
   - `playbook_list`: Lists all available SDLC playbooks.
   - `playbook_start`: Initiates a playbook run.
   - `playbook_step`: Retrieves context, lens, and toolbox for the active step.
   - `playbook_run_checks`: Executes the hard checks configured for the current step.
   - `playbook_status`: Returns current pipeline stage, active lens, and gate states.
3. **Graceful Fallback:** If a client does not support local child process execution, hard checks provide explicit CLI commands for the user to execute manually.

---

## 7. Migration & Release Plan

- **Target Version:** `3.0.0`
- **Release-Please Strategy:** This is a major architectural overhaul. The initial PR commit will feature a breaking change indicator (`feat!: implement v3 hybrid architecture with playbooks, lenses, toolboxes, and hard checks`) to trigger release-please to bump from `2.3.0` to `3.0.0`.
- **Rollout Phases:**
  - **Phase A (Specification & Scaffolding):** Architecture spec (this document), folder creation, engine modules (`engine/`).
  - **Phase B (Playbooks & Lenses):** Implement core playbooks (`feature_dev.yaml`, `bug_fix.yaml`, `security_audit.yaml`) and cognitive lenses (`lenses/*.md`).
  - **Phase C (Hard Check Engine):** Implement `engine/check_runner.js` to execute local linters and tests via child processes.
  - **Phase D (MCP Integration & Backward-Compatibility Wrapper):** Update `index.js` to wire new playbooks into the MCP server while maintaining full backward-compatibility with legacy commands.
  - **Phase E (Testing & Verification):** Comprehensive test suite validating both v3 native tools and legacy v2 tool signatures.
  - **Phase F (Documentation & Protocol Sync):** Update `docs/pages/registry.md`, `TECHNICAL_SPECS.md`, `docs/pages/tech-agents-graph.md`, `AGENTS.md`, `GEMINI.md`, and `CLAUDE.md`.
