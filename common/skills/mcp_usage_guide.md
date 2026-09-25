# Skill: MCP Usage Guide — Agent Hub Server (v2026)

## Purpose
A foundational reference skill that teaches any LLM how to interact with the Agent Hub MCP server (`@souzaeduardoac/tech-agents`). This guide covers both the **V3 Agentic Engineering Harness** (Declarative Playbooks & Deterministic Checks) and the legacy command catalog, complete with a decision flowchart and role-based matrix for selecting the right playbook.

---

## 1. Overview & Architecture

The Agent Hub MCP server exposes **12 tools**:
- **V3 Playbook Tools (Recommended)**: `playbook_list`, `playbook_start`, `playbook_step`, `playbook_run_checks`, `playbook_advance`, `playbook_status`.
- **Legacy Agent Tools (100% Backward Compatible)**: `list_agents`, `call_agent_command`, `run_agent_loop`, `get_agent_prompt`, `pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve`.

**Core Principle:** 
- In **V3**, execution is driven by finite state machine DAGs (`playbooks/*.yaml`). The server enforces scoped tool permissions (`toolboxes.js`), lightweight professional stances (`lenses/*.md`), and deterministic hard checks (local tests/linters) and human approval gates (`.squad-state-[branch].json`). Hallucinated progression is physically impossible.
- In **V2**, `call_agent_command` returns the compiled persona BIOS, skills, and knowledge for full prompt injection.

---

## 2. Which Playbook to Call? (The Decision Matrix)

### A. Decision Flowchart for LLMs

```
User Prompt / Goal Ingestion
│
├── 📋 Product Management & Requirements (No code)
│   ├── Interactive interview to write a PRD for Jira/Azure Boards? ──> playbook: "product_discovery"
│   └── Translate complex tech/API specs for business executives?   ──> playbook: "business_synthesis"
│
├── 🏛️ Architecture & Refinement Meetings
│   ├── Confronting a backlog card with the codebase for task sizing?──> playbook: "technical_refinement"
│   ├── Symmetrical debate over competing architecture options?     ──> playbook: "council_debate"
│   ├── Auditing code quality, test suites, and technical debt?     ──> playbook: "codebase_health_audit"
│   ├── Deep empirical research into a library or vendor trade-off? ──> playbook: "deep_research"
│   └── Single-topic architectural consultation or advisory?        ──> playbook: "consultation"
│
├── 💻 Development & Engineering
│   ├── Scaffolding a single isolated module, endpoint, or UI?      ──> playbook: "component_scaffold"
│   ├── Reproducing and fixing a bug with automated test checks?    ──> playbook: "bug_fix"
│   ├── Reviewing a Pull Request or git diff for quality/security?  ──> playbook: "pr_review"
│   └── Designing an automation workflow (webhooks, n8n, DAGs)?     ──> playbook: "workflow_dev"
│
└── 🚀 Full-Cycle & Documentation
    ├── End-to-end SDLC from PRD to production-ready Pull Request?  ──> playbook: "feature_dev"
    └── Synchronizing Logseq knowledge graph and documentation?     ──> playbook: "full_sync"
```

### B. Playbook Reference Catalog (14 Playbooks)

| Playbook ID | Category | Target Role | When to Use | Steps | Gates |
|---|---|---|---|---|---|
| `product_discovery` | Requirements | Product Manager | Brainstorm, interview, clarify requirements & create a validated PRD for Azure Boards/Jira/Linear without code generation | 2 | `prd` |
| `technical_refinement`| Architecture | Tech Lead | Confront a backlog ticket/card with existing codebase during refinement meetings to produce architectural feasibility and work breakdown | 2 | `plan` |
| `component_scaffold` | Development | Developer | Quickly build a single isolated endpoint, service, or UI component with automated test verification | 2 | `execution` |
| `feature_dev` | Full-Cycle | Squad Leader | End-to-end SDLC from PRD discovery, architecture design, compliance audit, coding, acceptance testing, to production pull request | 7 | `prd`, `discovery`, `plan`, `compliance`, `execution`, `acceptance` |
| `bug_fix` | Development | Developer | Diagnose an issue, reproduce with a failing test, apply minimal-diff patch, and verify regression tests pass | 3 | `fix_verification` |
| `council_debate` | Architecture | Tech Lead | Resolve a high-stakes architectural disagreement through a symmetrical 3-perspective debate (Thesis $\to$ Antithesis $\to$ Synthesized ADR) | 3 | `council_synthesis` |
| `codebase_health_audit`| Architecture | Tech Lead | Audit whole-codebase technical debt, execute local test/linter runners, evaluate security boundaries, and produce prioritized remediation plan | 3 | `health_report` |
| `deep_research` | Research | Researcher | Conduct deep empirical research, comparative technology benchmarking, or vendor/tooling trade-off evaluation with primary citations | 2 | `scope` |
| `business_synthesis` | Requirements | Product Owner | Translate technical architecture, API schemas, or engineering specifications into executive summaries, business value impacts, and non-technical stakeholder documents | 2 | `stakeholder_review` |
| `security_audit` | Security | Compliance Auditor | Perform a regulatory compliance audit (GDPR, LGPD, HIPAA, SOC2) and dependency vulnerability scan across the codebase | 2 | `audit_approval` |
| `pr_review` | Quality | Reviewer | Conduct a thorough git diff code review for architectural patterns, test coverage, and regression risks before merging a PR | 2 | `review_signoff` |
| `workflow_dev` | Automation | Automation Architect| Design and implement event-driven integration workflows (n8n, webhooks, asynchronous DAGs) with idempotency and retry resilience | 3 | `discovery`, `execution` |
| `consultation` | Advisory | Advisor | Non-coding open-ended architectural consultation, technology advice, or exploring technical trade-offs | 1 | None |
| `full_sync` | Documentation| Technical Writer | Synchronize all repository documentation, Logseq knowledge graph pages, symbol registry, and cognitive anchors | 2 | `sync_approval` |

---

## 3. Sprint Rituals & Triggers

| Sprint Ritual / Trigger | Recommended Playbook | Execution Behavior |
|---|---|---|
| **Backlog Grooming** | `product_discovery` | PM is grilled by the PO lens (5-phase interview); outputs schema-compliant PRD ready for Azure Boards/Jira. |
| **Technical Refinement** | `technical_refinement` | Tech Lead confronts PRD with existing code; inspects models/APIs and outputs an implementation plan & task breakdown. |
| **Architectural Fork** | `council_debate` | Multi-perspective debate: Architect (Thesis) vs Security (Antithesis) $\to$ PO synthesizes balanced ADR. |
| **Sprint Sprinting (Feature)** | `component_scaffold` or `feature_dev` | Dev implements either an isolated component (`component_scaffold`) or full 7-step pipeline (`feature_dev`). |
| **Defect Triage** | `bug_fix` | Reproduces bug with a failing test, applies minimal patch, verifies tests pass, commits clean. |
| **PR Review / CI** | `pr_review` | Inspects git diff, verifies test coverage, flags regressions or anti-patterns. |
| **Tech Debt Sprint** | `codebase_health_audit` | Scans dependencies, runs all linters, evaluates security boundaries, outputs prioritized remediation plan. |

---

## 4. Native V3 Playbook MCP Tools

### `playbook_list`
*Parameters:* None  
*Returns:* JSON array of all 14 playbooks with `id`, `name`, `category`, `role`, `when_to_use`, `description`, `stepCount`, and `gates`.  
*When to use:* Call this **FIRST** if you need to discover available playbooks dynamically.

### `playbook_start`
*Parameters:* `playbook` (string, required), `goal` (string, required), `cwd` (string, optional)  
*Returns:* Session ID, initial step metadata, locked approval gates, and state file path.  
*When to use:* Call at the start of any structured workflow.

### `playbook_step`
*Parameters:* `cwd` (string, optional)  
*Returns:* The compiled step prompt containing the active Cognitive Lens, authorized Toolbox capabilities, reference standards, and prior step artifacts.  
*When to use:* Call at each step to receive your exact instructions and mindset.

### `playbook_run_checks`
*Parameters:* `cwd` (string, optional)  
*Returns:* Output of configured hard checks (test suites, linters, static analyzers).  
*When to use:* Call before advancing to verify machine exit-codes locally.

### `playbook_advance`
*Parameters:* `cwd` (string, optional)  
*Returns:* Advanced step confirmation, or halts with error if hard checks failed or a human gate is locked/pending.  
*When to use:* Call when active step artifacts are created to transition the state machine.

### `playbook_status`
*Parameters:* `cwd` (string, optional)  
*Returns:* Session status, active step, completed step history, and gate states.  
*When to use:* Inspect workflow progress and history at any time.

---

## 5. Concrete Invocation Examples

### Example 1: Product Manager running Discovery
```json
// 1. Start the playbook
playbook_start({
  "playbook": "product_discovery",
  "goal": "Single Sign-On (SSO) with Okta and Google Workspace"
})

// 2. Read Step 1 instructions (PO interview lens + 5-phase drill)
playbook_step()

// 3. User & agent conduct interview, log stored in docs/pages/...-elicitation-log.md
// 4. Advance to Step 2
playbook_advance()

// 5. Read Step 2 instructions (PRD formulation)
playbook_step()

// 6. Draft docs/pages/...-prd.md
// 7. Request approval for 'prd' gate via /squad:approve prd or pipeline_approve
// 8. Advance to complete
playbook_advance()
```

### Example 2: Tech Lead conducting Refinement Meeting
```json
// 1. Start the playbook
playbook_start({
  "playbook": "technical_refinement",
  "goal": "Refine Okta SSO Azure Card against backend authentication architecture"
})

// 2. Read Step 1 instructions (Inspect models, middleware, schemas)
playbook_step()

// 3. Advance to Step 2 (Implementation Plan & Work Breakdown)
playbook_advance()
playbook_step()

// 4. Formulate docs/pages/...-implementation-plan.md, approve 'plan' gate, advance to complete
playbook_advance()
```
