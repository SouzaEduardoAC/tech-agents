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
The following tools are available via the `tech-agents` MCP server:

| Tool | Description |
|------|-------------|
| `list_agents` | Lists all available specialized agents. |
| `call_agent_command` | Runs a specific command from an agent's library (e.g., `create`, `auditor`, `docs`). |
| `get_agent_prompt` | Returns the full assembled persona, skills, and knowledge for an agent. |
| `pipeline_start` | Initializes a new pipeline session and locks all approval gates in `.squad-state-[branch].json`. |
| `request_approval` | Signals phase completion and sets a gate to `pending`. Returns a hard STOP message. |
| `check_gate` | Verifies a gate is `approved` before starting the next phase. Returns `isError: true` if blocked. |
| `pipeline_approve` | Approves a specific pipeline gate to unblock the next phase, updating the gate status to `approved`. |

### Usage Pattern
```
call_agent_command(agent="architect", command="create", args="Your goal here")
call_agent_command(agent="po", command="discovery", args="Feature name")
call_agent_command(agent="council", command="debate", args="User request here")
call_agent_command(agent="forge", command="create", args="New Agent Spec")
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
- [[Forge]]: Specialized meta-agent to design, scaffold, audit, and upgrade other agents.
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
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #ClaudeCode #AgenticFramework #Logseq
