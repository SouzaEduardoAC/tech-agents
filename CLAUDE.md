# CLAUDE CODE COGNITIVE ANCHOR (v2026)
**Stack:** Markdown, TOML, [[Tech Agents]], Logseq Graph.

## 🧠 Claude Integration
This repository is a **Specialized Tech Agents** platform designed for high-fidelity engineering, compliance, and research tasks. It uses an **[[Agentic Modular Design]] (#AMD)** where each agent is a self-contained unit of persona, skills, and knowledge.

Claude Code interacts with this platform exclusively via the **MCP server**. There are no slash commands — all agent execution is done through MCP tool calls.

## 🚀 Setup (One-Time)
Register the platform as an MCP server in your environment:
```bash
mcp add tech-agents -- npx github:SouzaEduardoAC/tech-agents serve
```

## 🛠 MCP Tools
### Native V3 Playbook Tools
| Tool | Description |
|------|-------------|
| `playbook_list` | Lists all available declarative playbooks (`feature_dev`, `bug_fix`, `security_audit`, etc.). |
| `playbook_start` | Initializes a playbook session, locks gates, and sets active step. |
| `playbook_step` | Compiles active step context, cognitive lens, and scoped toolbox permissions. |
| `playbook_run_checks` | Runs local deterministic hard checks (tests, linters, git status). |
| `playbook_advance` | Validates hard checks and gates, advancing to the next step. |
| `playbook_status` | Returns session progress, completed step history, and gate states. |

### Legacy V2 MCP Tools (100% Backward-Compatible)
| Tool | Description |
|------|-------------|
| `list_agents` | Lists all available specialized agents and returns MCP Usage Guide. |
| `call_agent_command` | Runs a specific command from an agent's library (e.g., `create`, `auditor`, `docs`). |
| `get_agent_prompt` | Returns the full assembled persona, skills, and knowledge for an agent. |
| `run_agent_loop` | Runs a server-side managed execution loop via client LLM sampling. |
| `pipeline_start` | Initializes a new pipeline session and locks all approval gates in `.squad-state-[branch].json`. |
| `request_approval` | Signals phase completion and sets a gate to `pending`. Returns a hard STOP message. |
| `check_gate` | Verifies a gate is `approved` before starting the next phase. Returns `isError: true` if blocked. |
| `pipeline_approve` | Approves a specific pipeline gate to unblock the next phase, updating the gate status to `approved`. |

### V3 Playbook Usage Pattern
```
playbook_start(playbook="feature_dev", goal="Implement OAuth2 multi-tenant authentication")
playbook_step()
request_approval(gate="prd", summary="PRD drafted with 3 acceptance scenarios")
pipeline_approve(gate="prd")
playbook_advance()
playbook_status()
```

### V2 Legacy Command Pattern
```
call_agent_command(agent="architect", command="create", args="Your goal here")
call_agent_command(agent="po", command="discovery", args="Feature name")
call_agent_command(agent="council", command="debate", args="User request here")
call_agent_command(agent="automata", command="plan", args="Automate webhook integration")
call_agent_command(agent="squad", command="run", args="High-level project goal")
call_agent_command(agent="squad", command="full-sync", args="Sync codebase documentation")
```

## 🗺 Documentation Map (Logseq Graph)
The project documentation is managed as a knowledge graph in `docs/pages/`.
- **Master Graph:** [[tech-agents-graph]]
- **Technical DNA:** [[code-dna]]
- **Protocols:** [[Engineering Protocol]], [[Logseq Knowledge]]
- **Specs:** [[TECHNICAL_SPECS]], [[BUSINESS_FLOW]]

## 📜 Documentation Protocol Integrity
**CRITICAL MANDATE:** You MUST always respect and update the entire documentation protocol of all agents (such as journals, registry, and graphs) when modifying the repository, EVEN if you are not currently operating as the specific agent responsible for that domain. Code changes without corresponding protocol updates are strictly prohibited.

## 🤖 Specialized Agents
- [[Squad Orchestrator]]: Multi-agent pipeline management.
- [[Product Owner]]: Requirements gathering and #PRD generation.
- [[Architect]]: Systems architecture and security auditing.
- [[Backend]] / [[Frontend]] / [[Mobile]]: Implementation specialists.
- [[Compliance]]: Regulatory audits (#GDPR, #HIPAA, #SOC2).
- [[Researcher]]: Deep information synthesis.
- [[Automata]]: Workflow #Automation architect.
- [[Decoder]]: Technical documentation-to-business translator.
- [[Quicky]]: Specialist for quick fixes, small tweaks, and isolated tasks maintaining documentation integrity.
- [[Council]]: Symmetrical multi-perspective debate and design synthesis engine.

## 🛠 Active Work & Tasks
- DONE: Verify path normalization across all agents. (ref: [[code-dna]])
- DONE: Implement prompt late-binding deduplication and heuristic relevance filtering (#AMD compiler optimization). (ref: [[TECHNICAL_SPECS]])
- DONE: Formulate resilient cross-client execution fallbacks and degraded tools protocols. (ref: [[code-dna]])
- DONE: Implement [[Decoder]] to translate tech docs for BAs/POs. (ref: [[common/skills/business_synthesis.md]])
- DONE: Mature [[compliance/skills/audit_protocol.md|Compliance Audit Protocol]] (mapped detailed GDPR, LGPD, and HIPAA reference guidelines in compliance/knowledge/).
- DONE: Reorganize default MCP stack, promote Context7 default integration with key placeholders, and enforce automated planning-level citation validation in the execution protocol. (ref: `[[TECHNICAL_SPECS]]`, `common/knowledge/anti_hallucination.md`)
- DONE: Standardize global Logseq documentation protocol and interface (`/agent:docs`) across all agents via the new Squad `/squad:full-sync` orchestrator. (ref: [[registry]])
- DONE: Implement cross-platform and stack-aware Pull Request reviews for implementation specialists (Backend, Frontend, Mobile). (ref: `common/skills/pr_review.md`, `[[registry]]`)
- DONE: Implement structural MCP-level human approval gate system (`pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve` tools + `/squad:approve` command) to make it physically impossible for LLM orchestrators to auto-approve pipeline phase transitions. (ref: `index.js`, `.squad-state-*.json`, `squad/commands/squad/approve.toml`, `[[TECHNICAL_SPECS]]`)
- DONE: Implement Phase 5 Product Acceptance & Requirement Validation in Squad pipeline and PO agent (`/po:validate`, `/po:squad-validate`, `acceptance_validation.md`, `acceptance` gate). (ref: `po/commands/po/squad-validate.toml`, `squad/commands/squad/run.toml`, `[[TECHNICAL_SPECS]]`)
- DONE: Implement V3 Hybrid Architecture: Declarative Playbooks, Cognitive Lenses, Scoped Toolboxes, and Deterministic Local Hard/Soft Checks with full MCP integration and E2E verification. (ref: `V3_ARCHITECTURE_SPEC.md`, `engine/`, `playbooks/`, `lenses/`, `checks/`, `[[TECHNICAL_SPECS]]`)
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #ClaudeCode #AgenticFramework #Logseq #V3Hybrid
