# Agentic AI Framework (Universal Agent Hub)
**Standardized orchestration for specialized AI Agents across Gemini, Claude, AntiGravity, and Codex.**

[![PR Validation](https://github.com/SouzaEduardoAC/tech-agents/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/SouzaEduardoAC/tech-agents/actions/workflows/pr-validation.yml)
[![Release Please](https://github.com/SouzaEduardoAC/tech-agents/actions/workflows/release-please.yml/badge.svg)](https://github.com/SouzaEduardoAC/tech-agents/actions/workflows/release-please.yml)

## 🧠 Cognitive Anchors (AI Optimized)
The primary entry points for AI agents are the **[[AGENTS.md]]** (Universal), **[[GEMINI.md]]** (Gemini CLI), and **[[CLAUDE.md]]** (Claude Code) files.
- **Efficiency**: Optimized for AI consumption to minimize token overhead.
- **Standardization**: `AGENTS.md` follows the open standard for cross-tool compatibility (AntiGravity, Cursor, Claude).
- **Graph-First**: Direct links to the Logseq-powered knowledge graph in `docs/pages/`.

---

## 🧠 Graph-First Documentation (AI Optimized)
This project utilizes a **Logseq-powered Knowledge Graph** for its documentation. 
- **Efficiency**: Optimized for AI consumption to minimize token overhead while maximizing signal precision.
- **Traceability**: Every technical claim is linked to an AST citation `(ref: symbol)`.
- **Navigation**: Start at the **[[tech-agents-graph]]** node for a full architectural deep-dive.

---

## 🚀 Installation & Updates (MCP First)

The Universal Agent Hub is designed to run primarily as a **Model Context Protocol (MCP) Server**. This configuration allows any AI assistant to dynamically call our specialized agents without needing a cloned codebase inside the target project workspace.

### 1. Register the MCP Server

Add the Agent Hub to your preferred AI environment.

#### A. Claude Code (CLI)
Run the standard MCP command:
```bash
mcp add tech-agents -- npx -y github:SouzaEduardoAC/tech-agents serve
```

#### B. Claude Desktop
Add this to your configuration file (see locations in [CLAUDE.md](file:///home/ecoza/Projects/tech-agents/CLAUDE.md)):
```json
{
  "mcpServers": {
    "tech-agents": {
      "command": "npx",
      "args": ["-y", "github:SouzaEduardoAC/tech-agents", "serve"]
    }
  }
}
```

#### C. Gemini CLI & AntiGravity
Add this to `~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "tech-agents": {
      "command": "npx",
      "args": ["-y", "github:SouzaEduardoAC/tech-agents", "serve"]
    }
  }
}
```

### 2. IDE Static Integration (Codex / Cursor)
If your IDE does not support dynamic MCP servers, you can statically link the agent's core persona file into your workspace (e.g. to `.cursorrules`):
```bash
npx github:SouzaEduardoAC/tech-agents link [agent-name] [target-file]
```
*(Example: `npx github:SouzaEduardoAC/tech-agents link squad .cursorrules`)*

You can also link the complete MCP Usage Guide to configure the client LLM with the proper tools usage protocol:
```bash
npx github:SouzaEduardoAC/tech-agents link mcp .clauderules # (or .cursorrules, .windsurfrules)
```

### 🔄 Keeping it Current (Automatic Updates)
When registered via `npx`, updates are fetched dynamically on launch. To force-update the server to the latest version, run the server with the `--prefer-online` flag:
```bash
npx --prefer-online github:SouzaEduardoAC/tech-agents serve
```
If you are developing locally with a cloned repository, a simple pull updates the server:
```bash
git pull && npm install
```

---

## 🏗️ V3 Hybrid Architecture: Agentic Engineering Harness

`@souzaeduardoac/tech-agents` v3 transitions from a prompt-compiler / persona-cosplay model into a deterministic, production-grade **Agentic Engineering Harness** designed for Gemini CLI, AntiGravity, Codex, and Claude Code.

### The 4 Primitives

```
┌────────────────────────────────────────────────────────┐
│             PLAYBOOK (State Machine DAG)               │
│               playbooks/feature_dev.yaml               │
│                                                        │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │ Step 1 (PO)  │ ──> │Step 2 (Arch) │ ──> ...         │
│  └──────┬───────┘     └──────┬───────┘                 │
└─────────┼────────────────────┼─────────────────────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐ ┌──────────────────┐
│  COGNITIVE LENS  │ │     TOOLBOX      │
│  (≤4 sentences)  │ │ (Scoped Perms)   │
│  lenses/po.md    │ │ [fs_read, write] │
└──────────────────┘ └──────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│               DETERMINISTIC CHECKS & GATES             │
│                                                        │
│  • Hard Checks: Local CLI commands (tests, linters)   │
│  • Soft Checks: JSON Schema artifact validation        │
│  • Human Gates: .squad-state-[branch].json approval    │
│    (Physically blocks progression if locked/failed)    │
└────────────────────────────────────────────────────────┘
```

1. **Declarative Playbooks (`playbooks/*.yaml`)**:
   Finite State Machine definitions that enforce exact SDLC steps, input/output artifacts, applicable standards, scoped toolboxes, and human approval gates.
   * `feature_dev`: Full cycle engineering from PRD discovery to clean pull request (7 steps).
   * `product_discovery`: Interactive requirements elicitation and formal PRD formulation for Product Managers without code generation (2 steps).
   * `technical_refinement`: Technical feasibility analysis and granular implementation planning for Tech Leads in refinement meetings (2 steps).
   * `component_scaffold`: Rapid specification and test-verified implementation of isolated components or API endpoints (2 steps).
   * `bug_fix`: Targeted reproduction, patch application, and regression test verification (3 steps).
   * `workflow_dev`: Event-driven automation workflow design, payload mapping, and failure recovery (3 steps).
   * `deep_research`: Problem space framing, comparative empirical benchmarking, and executive research synthesis (2 steps).
   * `business_synthesis`: Technical architecture, API spec, and data schema translation into stakeholder requirements under the PO lens (2 steps).
   * `council_debate`: Symmetrical dialectical debate between architectural design and security constraints into a synthesized ADR (3 steps).
   * `codebase_health_audit`: Multi-layer diagnostic health scan (static analysis, linters, security boundary checks, and remediation plan) (3 steps).
   * `security_audit`: Threat modeling and regulatory compliance audit (2 steps).
   * `pr_review`: Diff-based static code review and automated SonarQube evaluation (2 steps).
   * `consultation`: Conversational, non-coding architecture debate and tension synthesis (1 step).
   * `full_sync`: Exhaustive Logseq graph and documentation synchronization (2 steps).

2. **Cognitive Lenses (`lenses/*.md`)**:
   Hyper-concise professional stances ($\le 4$ sentences, $\le 80$ words) replacing verbose persona roleplay and eliminating up to 70% of LLM prompt bloat while sharpening domain focus.
   * `architect.md`, `backend.md`, `frontend.md`, `mobile.md`, `compliance.md`, `po.md`, `qa.md`, `quicky.md`, `council.md`, `automata.md`, `researcher.md`.

3. **Scoped Toolboxes (`engine/toolboxes.js`)**:
   Enforces the principle of least privilege per step:
   * `fs_read`: Read-only inspection (`view_file`, `list_dir`, `find_by_name`, `grep_search`).
   * `fs_write`: Targeted modification (`write_to_file`, `replace_file_content`).
   * `git`: Branching, staging, Conventional Commits, diff inspection, PR creation.
   * `verification`: Local test runner and linter execution (`npm test`, `pytest`, `cargo test`, etc.).
   * `analysis`: AST inspection and static code analysis.
   * `search_web`: External API and documentation retrieval.

4. **Deterministic Hard & Soft Checks (`checks/`)**:
   * **Hard Checks**: Local terminal command execution with timeout protection (`child_process.spawn`). Step advancement is **physically refused** if any test runner, linter, or git status check fails with a non-zero exit code.
   * **Soft Checks**: JSON Schema validation (`ajv`) for generated artifacts (PRD, ADR, Audit report, Acceptance report).
   * **Approval Gates**: Structural MCP-enforced gates (`prd`, `plan`, `compliance`, `execution`, `acceptance`) in `.squad-state-[branch].json` that prevent LLMs from self-approving milestone transitions.

---

## 📖 How to Use: Playbook Selection & Workflow Guide

### Interaction Modes

You can run `@souzaeduardoac/tech-agents` via two primary interaction models:

1. **Deterministic State Machine (Recommended for Agents & MCP Clients)**:
   Your client (AntiGravity, Gemini CLI, Claude Code, Codex) calls `playbook_start` with the selected playbook ID and goal. The workflow progresses step-by-step through `playbook_step`, automatically runs local tests via `playbook_run_checks`, and advances via `playbook_advance` when hard checks pass and human gates are approved.
2. **Natural Language Prompting (Conversational)**:
   Directly prompt the assistant in your chat UI:
   * *"Run the `product_discovery` playbook for 'SSO login with Okta'"*
   * *"Run the `technical_refinement` playbook on this Azure Boards backlog card"*
   * *"Run `bug_fix` on the token expiration timeout issue"*

---

### Which Playbook to Call? (The Decision Matrix)

#### A. Decision Flowchart

```
User Prompt / Goal Ingestion
│
├── 📋 Product Management & Requirements (No code)
│   ├── Interactive interview to write a PRD for Jira/Azure Boards? ──> product_discovery
│   └── Translate complex tech/API specs for business executives?   ──> business_synthesis
│
├── 🏛️ Architecture & Refinement Meetings
│   ├── Confronting a backlog card with the codebase for task sizing?──> technical_refinement
│   ├── Symmetrical debate over competing architecture options?     ──> council_debate
│   ├── Auditing code quality, test suites, and technical debt?     ──> codebase_health_audit
│   ├── Deep empirical research into a library or vendor trade-off? ──> deep_research
│   └── Single-topic architectural consultation or advisory?        ──> consultation
│
├── 💻 Development & Engineering
│   ├── Scaffolding a single isolated module, endpoint, or UI?      ──> component_scaffold
│   ├── Reproducing and fixing a bug with automated test checks?    ──> bug_fix
│   ├── Reviewing a Pull Request or git diff for quality/security?  ──> pr_review
│   └── Designing an automation workflow (webhooks, n8n, DAGs)?     ──> workflow_dev
│
└── 🚀 Full-Cycle & Documentation
    ├── End-to-end SDLC from PRD to production-ready Pull Request?  ──> feature_dev
    └── Synchronizing Logseq knowledge graph and documentation?     ──> full_sync
```

#### B. Sprint Rituals & Triggers

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

## 🎮 How to Call Agents (Usage per LLM Environment)

### Native V3 Playbook MCP Tools
The harness exposes 6 native MCP tools for state-machine driven SDLC orchestration:

| V3 Tool | Description | Input Arguments |
|---------|-------------|-----------------|
| `playbook_list` | Lists all available SDLC playbooks. | `{}` |
| `playbook_start` | Initializes a playbook session, locks gates, and sets active step. | `{ playbook: string, goal: string, cwd?: string }` |
| `playbook_step` | Fetches active step context, compiled prompt, lens, and scoped tools. | `{ cwd?: string }` |
| `playbook_run_checks` | Executes active step hard checks locally (test suites, linters, git status). | `{ cwd?: string }` |
| `playbook_advance` | Validates hard checks and gates, advancing to the next step. | `{ cwd?: string }` |
| `playbook_status` | Inspects current session state, active step, history, and gate states. | `{ cwd?: string }` |

#### V3 Quickstart Flow
```javascript
// 1. Start a feature development playbook
playbook_start({ playbook: "feature_dev", goal: "Implement multi-tenant OAuth2 login" });

// 2. Inspect active step instructions & cognitive lens
playbook_step();

// 3. Complete step work, then request human sign-off on the gate
request_approval({ gate: "prd", summary: "PRD completed with 3 Gherkin scenarios" });

// 4. Human approves the gate in chat or via tool
pipeline_approve({ gate: "prd" });

// 5. Advance to next step (checks & gates verified automatically)
playbook_advance();

// 6. Check overall session progress
playbook_status();
```

---

### Backward Compatibility (V2 Legacy MCP Tools)
All legacy v2 MCP commands and tools remain **100% backward-compatible**:

| Legacy Tool | Description |
|-------------|-------------|
| `list_agents` | Lists all specialized agents and returns the complete MCP Usage Guide. |
| `call_agent_command` | Calls legacy agent commands (`/squad:run`, `/architect:create`, `/backend:create`, etc.). |
| `get_agent_prompt` | Returns assembled persona, skills, and knowledge for an agent. |
| `run_agent_loop` | Executes server-managed multi-turn loop via MCP client LLM sampling. |
| `pipeline_start` | Starts legacy squad pipeline and locks gates. |
| `request_approval` | Signals phase completion and sets gate to `pending`. |
| `check_gate` | Verifies gate is `approved` before starting next phase. |
| `pipeline_approve` | Approves a specific pipeline gate to unblock the next phase. |

### 3. Cursor & Codex IDEs (System Rules & Persona Linking)
For Cursor, VS Code, or other IDEs using context files (like `.cursorrules` or custom system instructions), you link the agent's core identity file directly into your workspace.
*   **Link Command**: 
    ```bash
    npx github:SouzaEduardoAC/tech-agents link [agent-name] [target-file]
    ```
    *(e.g., `npx github:SouzaEduardoAC/tech-agents link squad .cursorrules`, `link quicky .cursorrules`, or `npx github:SouzaEduardoAC/tech-agents link mcp .clauderules` to link the complete MCP Usage Guide)*
*   **Usage**: The IDE model immediately inherits that agent's complete persona, skills, and guardrails. Simply reference `@.cursorrules` in your Composer or sidebar chat to execute the flow.

---

## 🛠 Contribution & Engineering Standards
We maintain a "Zero Trust" model for code and documentation integrity.
- **Engineering DNA**: Foundational patterns and standards are codified in **[[code-dna]]**.
- **Stability Protocols**: Resilience policies (Retries, Circuit Breakers) are in **[[resilience-policies]]**.
- **Conventional Commits**: We strictly follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/).

### How to Contribute
1. **PRD-First**: No logic change occurs without a validated requirements page in the graph.
2. **Test-First**: Bug fixes require a failing test reproduction; new features require 100% logic coverage.
3. **Graph Sync**: Every code change MUST be synchronized with the Logseq graph using `/architect:docs`.

---

## 📂 Documentation Suite (Graph Nodes)
- **[[tech-agents-graph]]**: The master entry point.
- **[[TECHNICAL_SPECS]]**: Internal logic, MCP tools, and runtime specs.
- **[[BUSINESS_FLOW]]**: Use cases and global business rules.
- **[[Standardized Pipeline]]**: Our autonomous engineering lifecycle.

---

## 🤖 Core Agents
- **[[Squad Orchestrator]]**: PM / Chief Orchestrator.
- **[[Product Owner]]**: PO / Requirements Gateway & Business Synthesis.
- **[[Architect]]**: Systems Lead / Security Auditor.
- **[[Backend]]**, **[[Frontend]]**, **[[Mobile]]**: Implementation specialists.
- **[[Compliance]]**: Regulatory & Risk Auditor.
- **[[Researcher]]**: Strategic Analyst & Deep Empirical Research.
- **[[Automata]]**: Workflow Automation Architect.
- **[[Decoder]]**: Technical specification-to-business translator.
- **[[Quicky]]**: Specialist for quick fixes, small tweaks, and isolated tasks maintaining documentation integrity.
- **[[Council]]**: Symmetrical multi-perspective debate and design synthesis engine.
