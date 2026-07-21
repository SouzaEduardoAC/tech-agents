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

## 🎮 How to Call Agents (Usage per LLM Environment)

Depending on your active LLM interface, calling and orchestrating the agents is standardized via MCP tool calls:

### 1. Codex App/CLI, Gemini App/CLI & Claude Code (MCP)
Agents are executed dynamically via MCP tools (`list_agents`, `call_agent_command`, `get_agent_prompt`, `run_agent_loop`). Simply speak to your assistant in natural language or call commands via MCP:
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

*   **SSO/Token-based Loop Execution (MCP Sampling)**:
    In enterprise or token-based SSO environments (like AntiGravity or Codex) where local API keys are unavailable, you can run agents inside a server-managed execution loop using the client's own LLM session:
    *   *Natural Conversational Prompt*: *"Hey assistant, run the quicky loop to fix the label mismatch."*
    *   *Under-the-Hood Tool Contract*: `run_agent_loop(agent="quicky", command="fix", args="Fix the label mismatch")`
    *   *Behavior*: The server manages conversation history, pins the system prompt (preventing Codex persona drift), intercepts local tool actions (filesystem, terminal commands) formatted as XML tags (`<read_file>`, `<write_file>`, `<run_command>`, `<task_complete>`), executes them on the host, and feeds the outputs back into the loop.

*   **Available MCP Tools**:
    *   `list_agents`: Lists all available specialized agents and their commands.
    *   `call_agent_command`: Activates a specialized agent command, returning the raw compiled prompt (prompt injection fallback).
    *   `run_agent_loop`: Executes a server-side multi-turn agent loop via client LLM sampling (SSO-compatible).
    *   `get_agent_prompt`: Retrieves the persona, skills, and knowledge for a specific agent.
    *   `pipeline_start`: Initializes a new pipeline session and locks all gates in `.squad-state-[branch].json`.
    *   `request_approval`: Sets a gate status to `pending` and pauses the pipeline for human sign-off.
    *   `check_gate`: Checks if a specific pipeline gate is approved before starting the next phase.
    *   `pipeline_approve`: Approves a specific pipeline gate to unblock the next phase.

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
