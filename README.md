# Agentic AI Framework (Universal Agent Hub) v1.1.0
**Standardized orchestration for specialized AI Agents across Gemini, Claude, AntiGravity, and Codex.**

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
- **Navigation**: Start at the **[[ai-agents-graph]]** node for a full architectural deep-dive.

---

## 🚀 Installation & Updates

### 1. Start the MCP Server
Required for **Claude Code** and **AntiGravity CLI**.
```bash
# Register the hub as an MCP tool
mcp add agent-hub -- npx github:SouzaEduardoAC/ai-agents serve
```

### 2. Universal Bootstrap (One-Time Setup)
Installs all AntiGravity CLI slash commands and personas locally.
```bash
npx github:SouzaEduardoAC/ai-agents bootstrap
```

### 3. IDE Integration (Codex / Cursor)
Link an agent persona to your local project (e.g., `.cursorrules`):
```bash
npx github:SouzaEduardoAC/ai-agents link [agent-name] [target-file]
```

### 🔄 Keeping it Current
To update the Hub logic and local personas:
```bash
npx --prefer-online github:SouzaEduardoAC/ai-agents bootstrap
```

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
- **[[ai-agents-graph]]**: The master entry point.
- **[[TECHNICAL_SPECS]]**: Internal logic, MCP tools, and runtime specs.
- **[[BUSINESS_FLOW]]**: Use cases and global business rules.
- **[[Standardized Pipeline]]**: Our autonomous engineering lifecycle.

---

## 🤖 Core Agents
- **[[Master Orchestrator]]**: PM / Chief Orchestrator.
- **[[Brainstormer]]**: PO / Requirements Gateway.
- **[[Architect]]**: Systems Lead / Security Auditor.
- **[[Backend]]**, **[[Frontend]]**, **[[Mobile]]**: Implementation specialists.
- **[[Compliance]]**: Regulatory & Risk Auditor.
- **[[Researcher]]**: Strategic Analyst.
- **[[n8n]]**: Automation Architect.
- **[[Business Synthesizer]]**: Technical specification-to-business translator.
- **[[Forge]]**: Specialized meta-agent to design, scaffold, audit, and upgrade other agents (#MetaAgent).
- **[[Quicky]]**: Specialist for quick fixes, small tweaks, and isolated tasks maintaining documentation integrity.
