# Agentic AI Framework (Universal Agent Hub)
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

## 🎮 How to Call Agents (Usage per LLM Environment)

Depending on your active LLM interface, calling and orchestrating the agents is standardized across three primary execution modes:

### 1. AntiGravity CLI & Gemini CLI (Slash Commands)
After running the `bootstrap` command, all agents register custom **slash commands** and **personas** directly in your CLI environment.
*   **Format**: `/[agent]:[command] [your goal]`
*   **Key Examples**:
    *   **Squad Orchestrator**: `/squad:run "Implement JWT authentication flow"`
    *   **Quicky (Quick Fixes)**: `/quicky:fix "Fix the type mismatch on line 42 in api.ts"`
    *   **Architect (Design/Docs)**: `/architect:create "Design a resilient connection pool"` or `/architect:docs "Sync the Logseq graph with recent migrations"`
    *   **Product Owner (Discovery/PO Interview)**: `/po:interview "A new service to parse PDFs"`
    *   **Council (Design Debate & Synthesis)**: `/council:debate "Implement real-time location and telemetry-based pricing"`

### 2. Claude Code (Model Context Protocol / MCP)
Claude Code communicates with the Hub using **MCP tool calls**. Since Claude is an agentic assistant, you do **not** need to write raw code or command syntax in the chat. You simply speak to Claude in natural language, and Claude will autonomously invoke the correct Hub tool.
*   **Natural Conversational Prompts (Recommended)**:
    *   *"Hey Claude, call squad to build the user dashboard page."*
    *   *"Claude, ask quicky to fix the label on the summary page."*
    *   *"Ask the architect to design a CQRS pattern for payments."*
*   **Under-the-Hood Tool Contract** (How Claude executes it behind the scenes):
    *   Format: `call_agent_command(agent="[agent-name]", command="[command]", args="[your goal]")`
    *   Example: `call_agent_command(agent="quicky", command="fix", args="Fix the summary label mismatch")`

*   **Available MCP Tools**:
    *   `list_agents`: Lists all available specialized agents and their commands.
    *   `call_agent_command`: Activates a specialized agent command with a task description.
    *   `get_agent_prompt`: Retrieves the persona, skills, and knowledge for a specific agent.
    *   `pipeline_start`: Initializes a new pipeline session and locks all gates in `.squad-state.json`.
    *   `request_approval`: Sets a gate status to `pending` and pauses the pipeline for human sign-off.
    *   `check_gate`: Checks if a specific pipeline gate is approved before starting the next phase.
    *   `pipeline_approve`: Approves a specific pipeline gate to unblock the next phase.

### 3. Cursor & Codex IDEs (System Rules & Persona Linking)
For Cursor, VS Code, or other IDEs using context files (like `.cursorrules` or custom system instructions), you link the agent's core identity file directly into your workspace.
*   **Link Command**: 
    ```bash
    npx github:SouzaEduardoAC/ai-agents link [agent-name] [target-file]
    ```
    *(e.g., `npx github:SouzaEduardoAC/ai-agents link squad .cursorrules` or `link quicky .cursorrules`)*
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
- **[[ai-agents-graph]]**: The master entry point.
- **[[TECHNICAL_SPECS]]**: Internal logic, MCP tools, and runtime specs.
- **[[BUSINESS_FLOW]]**: Use cases and global business rules.
- **[[Standardized Pipeline]]**: Our autonomous engineering lifecycle.

---

## 🤖 Core Agents
- **[[Squad Orchestrator]]**: PM / Chief Orchestrator.
- **[[Product Owner]]**: PO / Requirements Gateway.
- **[[Architect]]**: Systems Lead / Security Auditor.
- **[[Backend]]**, **[[Frontend]]**, **[[Mobile]]**: Implementation specialists.
- **[[Compliance]]**: Regulatory & Risk Auditor.
- **[[Researcher]]**: Strategic Analyst.
- **[[Automata]]**: Automation Architect.
- **[[Decoder]]**: Technical specification-to-business translator.
- **[[Forge]]**: Specialized meta-agent to design, scaffold, audit, and upgrade other agents (#MetaAgent).
- **[[Quicky]]**: Specialist for quick fixes, small tweaks, and isolated tasks maintaining documentation integrity.
- **[[Council]]**: Symmetrical multi-perspective debate and design synthesis engine.
