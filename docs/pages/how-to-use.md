- type:: [[Guide]]
- title:: [[how-to-use]]
- project:: [[tech-agents]]

# How to Use Tech Agents (V3 Guide)
- ## Overview
	- `@souzaeduardoac/tech-agents` provides a deterministic **Agentic Engineering Harness** built on declarative playbooks, cognitive lenses, scoped toolboxes, and deterministic checks.
	- Designed for multi-client environments: Gemini CLI, AntiGravity, Codex, and Claude Code.
- ## Interaction Modes
	- ### 1. V3 Deterministic State Machine (MCP Tools)
		- `playbook_list`: Lists all 14 playbooks with metadata (role, category, when to use).
		- `playbook_start`: Initializes a playbook session with locked approval gates.
		- `playbook_step`: Fetches active step instructions, lens, and scoped tool permissions.
		- `playbook_run_checks`: Runs auto-detected test runners and linters locally.
		- `playbook_advance`: Validates passed checks and approved gates, advancing the state machine.
		- `playbook_status`: Returns active step, gate states, and completed history.
	- ### 2. Natural Language Prompting
		- Prompt the assistant directly with role and goal:
			- *"Run the `product_discovery` playbook for 'SSO login with Okta'"*
			- *"Run the `technical_refinement` playbook on this Azure Boards backlog card"*
			- *"Run `bug_fix` on the token expiration timeout issue"*
- ## Decision Flowchart
	- ```
	  User Goal Ingestion
	  │
	  ├── 📋 Product Management (No code)
	  │   ├── Interview & PRD for Azure Boards/Jira? ──> product_discovery
	  │   └── Translate tech specs for executives?    ──> business_synthesis
	  │
	  ├── 🏛️ Architecture & Refinement Meetings
	  │   ├── Backlog card refinement with codebase? ──> technical_refinement
	  │   ├── Symmetrical debate on arch options?    ──> council_debate
	  │   ├── Technical debt & security audit?       ──> codebase_health_audit
	  │   └── Deep empirical research & benchmark?   ──> deep_research
	  │
	  ├── 💻 Development & Engineering
	  │   ├── Scaffolding an isolated component?     ──> component_scaffold
	  │   ├── Reproducing and fixing a bug?          ──> bug_fix
	  │   ├── Reviewing a Pull Request / diff?       ──> pr_review
	  │   └── Automation workflow (n8n/webhooks)?    ──> workflow_dev
	  │
	  └── 🚀 Full-Cycle & Documentation
	      ├── End-to-end SDLC (PRD to PR)?           ──> feature_dev
	      └── Synchronize Logseq graph & docs?       ──> full_sync
	  ```
- ## Sprint Rituals & Triggers
	- | Ritual | Recommended Playbook | What Happens |
	  |---|---|---|
	  | **Backlog Grooming** | `product_discovery` | PM is grilled by PO lens (5-phase interview); outputs schema-compliant PRD ready for Azure Boards/Jira. |
	  | **Technical Refinement** | `technical_refinement` | Tech Lead confronts PRD with existing code; inspects models/APIs and outputs implementation plan. |
	  | **Architectural Fork** | `council_debate` | Multi-perspective debate: Architect (Thesis) vs Security (Antithesis) -> PO synthesizes balanced ADR. |
	  | **Sprint Feature** | `component_scaffold` or `feature_dev` | Developer implements either an isolated component (`component_scaffold`) or full 7-step SDLC (`feature_dev`). |
	  | **Defect Triage** | `bug_fix` | Reproduces bug with failing test, applies minimal patch, verifies tests pass, commits clean. |
	  | **PR Review / CI** | `pr_review` | Inspects git diff, verifies test coverage, flags regressions or anti-patterns. |
	  | **Tech Debt Sprint** | `codebase_health_audit` | Scans dependencies, runs all linters, evaluates security boundaries, outputs prioritized remediation plan. |
