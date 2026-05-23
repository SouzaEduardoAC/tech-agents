# GEMINI CLI COGNITIVE ANCHOR (v2026)
**Stack:** Markdown, TOML, [[Gemini CLI]], Logseq Graph.

## 🧠 Gemini Integration
This repository is optimized for **Gemini CLI**. It uses a specialized `bootstrap` command to inject custom slash commands into the Gemini environment, enabling high-performance agentic workflows.

## 🗺 Documentation Map (Logseq Graph)
- **Master Graph:** [[ai-agents-graph]]
- **Protocols:** [[Engineering Protocol]], [[Logseq Knowledge]]
- **Specs:** [[TECHNICAL_SPECS]], [[BUSINESS_FLOW]]

## 📜 Documentation Protocol Integrity
**CRITICAL MANDATE:** You MUST always respect and update the entire documentation protocol of all agents (such as journals, registry, and graphs) when modifying the repository, EVEN if you are not currently operating as the specific agent responsible for that domain. Code changes without corresponding protocol updates are strictly prohibited.

## 🛠 Gemini Commands
The following namespaces are registered via `/bin/agent-hub bootstrap`:
- `/architect:*`: Systems design and auditing.
- `/brainstormer:*`: Discovery and PRD generation.
- `/backend:*`, `/frontend:*`, `/mobile:*`: Core implementation.
- `/compliance:*`: Audit and regulation.
- `/synthesizer:*`: Technical specification-to-business translator.
- `/forge:*`: Meta-agent design, creation, and auditing.

## 🤖 Specialized Agents
- [[Master Orchestrator]]: Multi-agent pipeline management.
- [[Brainstormer]]: Requirements gathering and #PRD generation.
- [[Architect]]: Systems architecture and security auditing.
- [[Backend]] / [[Frontend]] / [[Mobile]]: Implementation specialists.
- [[Compliance]]: Regulatory audits (#GDPR, #HIPAA, #SOC2).
- [[Researcher]]: Deep information synthesis.
- [[n8n]]: Workflow #Automation architect.
- [[Business Synthesizer]]: Technical documentation-to-business translator.
- [[Forge]]: Meta-agent design, creation, and auditing.
## 🛠 Active Work & Tasks
- DONE: Verify path normalization across all agents. (ref: [[code-dna]])
- DONE: Implement prompt late-binding deduplication and heuristic relevance filtering (#AMD compiler optimization). (ref: [[TECHNICAL_SPECS]])
- DONE: Formulate resilient cross-client execution fallbacks and degraded tools protocols. (ref: [[code-dna]])
- DONE: Implement [[Business Synthesizer]] to translate tech docs for BAs/POs. (ref: [[common/skills/business_synthesis.md]])
- DONE: Mature [[compliance/skills/audit_protocol.md|Compliance Audit Protocol]] (mapped detailed GDPR, LGPD, and HIPAA reference guidelines in compliance/knowledge/).
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #GeminiCLI #AgenticFramework #Logseq
