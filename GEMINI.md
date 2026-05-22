# GEMINI CLI COGNITIVE ANCHOR (v2026)
**Stack:** Markdown, TOML, [[Gemini CLI]], Logseq Graph.

## 🧠 Gemini Integration
This repository is optimized for **Gemini CLI**. It uses a specialized `bootstrap` command to inject custom slash commands into the Gemini environment, enabling high-performance agentic workflows.

## 🗺 Documentation Map (Logseq Graph)
- **Master Graph:** [[ai-agents-graph]]
- **Protocols:** [[Engineering Protocol]], [[Logseq Knowledge]]
- **Specs:** [[TECHNICAL_SPECS]], [[BUSINESS_FLOW]]

## 🛠 Gemini Commands
The following namespaces are registered via `/bin/agent-hub bootstrap`:
- `/architect:*`: Systems design and auditing.
- `/brainstormer:*`: Discovery and PRD generation.
- `/backend:*`, `/frontend:*`, `/mobile:*`: Core implementation.
- `/compliance:*`: Audit and regulation.

## 🤖 Specialized Agents
- [[Master Orchestrator]]: Multi-agent pipeline management.
- [[Brainstormer]]: Requirements gathering and #PRD generation.
- [[Architect]]: Systems architecture and security auditing.
- [[Backend]] / [[Frontend]] / [[Mobile]]: Implementation specialists.
- [[Compliance]]: Regulatory audits (#GDPR, #HIPAA, #SOC2).
- [[Researcher]]: Deep information synthesis.
- [[n8n]]: Workflow #Automation architect.
## 🛠 Active Work & Tasks
- DONE: Verify path normalization across all agents. (ref: [[code-dna]])
- DONE: Implement prompt late-binding deduplication and heuristic relevance filtering (#AMD compiler optimization). (ref: [[TECHNICAL_SPECS]])
- DONE: Formulate resilient cross-client execution fallbacks and degraded tools protocols. (ref: [[code-dna]])
- TODO: Mature [[compliance/skills/audit_protocol.md|Compliance Audit Protocol]].
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #GeminiCLI #AgenticFramework #Logseq
