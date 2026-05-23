# CLAUDE CODE COGNITIVE ANCHOR (v2026)
**Stack:** Markdown, TOML, [[Agent Hub]], Logseq Graph.

## 🧠 Claude Integration
This repository is a **Specialized Agent Hub** designed for high-fidelity engineering, compliance, and research tasks. It uses an **[[Agentic Modular Design]] (#AMD)** where each agent is a self-contained unit of persona, skills, and knowledge.

Claude Code interacts with this Hub exclusively via the **MCP server**. There are no slash commands — all agent execution is done through MCP tool calls.

## 🚀 Setup (One-Time)
Register the Hub as an MCP server in your environment:
```bash
mcp add agent-hub -- npx github:SouzaEduardoAC/ai-agents serve
```

## 🛠 MCP Tools
The following tools are available via the `agent-hub` MCP server:

| Tool | Description |
|------|-------------|
| `list_agents` | Lists all available specialized agents. |
| `call_agent_command` | Runs a specific command from an agent's library (e.g., `create`, `auditor`, `docs`). |
| `get_agent_prompt` | Returns the full assembled persona, skills, and knowledge for an agent. |

### Usage Pattern
```
call_agent_command(agent="architect", command="create", args="Your goal here")
call_agent_command(agent="brainstormer", command="discovery", args="Feature name")
call_agent_command(agent="forge", command="create", args="New Agent Spec")
call_agent_command(agent="master", command="run", args="High-level project goal")
```

## 🗺 Documentation Map (Logseq Graph)
The project documentation is managed as a knowledge graph in `docs/pages/`.
- **Master Graph:** [[ai-agents-graph]]
- **Technical DNA:** [[code-dna]]
- **Protocols:** [[Engineering Protocol]], [[Logseq Knowledge]]
- **Specs:** [[TECHNICAL_SPECS]], [[BUSINESS_FLOW]]

## 📜 Documentation Protocol Integrity
**CRITICAL MANDATE:** You MUST always respect and update the entire documentation protocol of all agents (such as journals, registry, and graphs) when modifying the repository, EVEN if you are not currently operating as the specific agent responsible for that domain. Code changes without corresponding protocol updates are strictly prohibited.

## 🤖 Specialized Agents
- [[Master Orchestrator]]: Multi-agent pipeline management.
- [[Brainstormer]]: Requirements gathering and #PRD generation.
- [[Architect]]: Systems architecture and security auditing.
- [[Backend]] / [[Frontend]] / [[Mobile]]: Implementation specialists.
- [[Compliance]]: Regulatory audits (#GDPR, #HIPAA, #SOC2).
- [[Researcher]]: Deep information synthesis.
- [[n8n]]: Workflow #Automation architect.
- [[Business Synthesizer]]: Technical documentation-to-business translator.
- [[Forge]]: Specialized meta-agent to design, scaffold, audit, and upgrade other agents.

## 🛠 Active Work & Tasks
- DONE: Verify path normalization across all agents. (ref: [[code-dna]])
- DONE: Implement prompt late-binding deduplication and heuristic relevance filtering (#AMD compiler optimization). (ref: [[TECHNICAL_SPECS]])
- DONE: Formulate resilient cross-client execution fallbacks and degraded tools protocols. (ref: [[code-dna]])
- DONE: Implement [[Business Synthesizer]] to translate tech docs for BAs/POs. (ref: [[common/skills/business_synthesis.md]])
- DONE: Mature [[compliance/skills/audit_protocol.md|Compliance Audit Protocol]] (mapped detailed GDPR, LGPD, and HIPAA reference guidelines in compliance/knowledge/).
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #ClaudeCode #AgenticFramework #Logseq
