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
- `/squad:*`: Multi-agent pipeline orchestration and full documentation sync.
- `/architect:*`: Systems design and auditing.
- `/po:*`: Discovery and PRD generation.
- `/backend:*`, `/frontend:*`, `/mobile:*`: Core implementation.
- `/compliance:*`: Audit and regulation.
- `/decoder:*`: Technical specification-to-business translator.
- `/forge:*`: Meta-agent design, creation, and auditing.
- `/quicky:*`: Quick fixes, minor tweaks, and isolated code changes.
- `/council:*`: Symmetrical multi-perspective design debate and synthesis.

## 🤖 Specialized Agents
- [[Squad Orchestrator]]: Multi-agent pipeline management.
- [[Product Owner]]: Requirements gathering and #PRD generation.
- [[Architect]]: Systems architecture and security auditing.
- [[Backend]] / [[Frontend]] / [[Mobile]]: Implementation specialists.
- [[Compliance]]: Regulatory audits (#GDPR, #HIPAA, #SOC2).
- [[Researcher]]: Deep information synthesis.
- [[Automata]]: Workflow #Automation architect.
- [[Decoder]]: Technical documentation-to-business translator.
- [[Forge]]: Meta-agent design, creation, and auditing.
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
- DONE: Implement structural MCP-level human approval gate system (`pipeline_start`, `request_approval`, `check_gate`, `pipeline_approve` tools + `/squad:approve` command) to make it physically impossible for LLM orchestrators to auto-approve pipeline phase transitions. (ref: `index.js`, `.squad-state.json`, `squad/commands/squad/approve.toml`, `[[TECHNICAL_SPECS]]`)
- DONE: Implement MCP usage guide skill and serve it dynamically via list_agents tool. (ref: `common/skills/mcp_usage_guide.md`, `index.js`, `bin/agent-hub.js`, `[[TECHNICAL_SPECS]]`)
- TODO: Implement automated AST-sync for [[Mobile]] widget trees.

#AMD #GeminiCLI #AgenticFramework #Logseq
