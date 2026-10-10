# Technical Specification: Pure V3 Architecture Engine & Interface

## 1. Scope & Objective
This specification formalizes the exact code, interface, and file transformations for decommissioning legacy v2 and establishing pure v3 execution in `@souzaeduardoac/tech-agents`.

---

## 2. Interface Contracts

### 2.1 New Stateless Tool: `lens_prompt`
- **Name:** `lens_prompt`
- **Description:** "Retrieve the primed cognitive lens prompt for single-turn, ad-hoc tasks without initializing a stateful playbook session."
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "lens": {
        "type": "string",
        "description": "Name of the cognitive lens (e.g., architect, backend, frontend, mobile, compliance, po, qa, quicky, council, automata, researcher)."
      },
      "task": {
        "type": "string",
        "description": "The specific task, question, or code review request."
      },
      "context": {
        "type": "string",
        "description": "Optional code snippet, diff, or file contents to inject."
      },
      "cwd": {
        "type": "string",
        "description": "Optional workspace root directory."
      }
    },
    "required": ["lens", "task"]
  }
  ```
- **Return Contract:**
  Returns text formatted with Lens stance, relevant project stack guidance from `knowledge/stacks/`, and the injected task context.

### 2.2 Refactored Tool: `list_agents`
- **Description:** Returns the complete catalog of 14 Playbooks, 11 Cognitive Lenses, and points to the MCP Usage Guide in `docs/mcp_usage_guide.md`.

### 2.3 Refactored Tool: `run_agent_loop`
- Refactored to execute playbook steps via MCP sampling or advise `playbook_step` execution.

### 2.4 Retired Legacy Tools:
- `call_agent_command` (Decommissioned)
- `get_agent_prompt` (Decommissioned)

---

## 3. Directory Relocations & Purges

### 3.1 Relocations into `knowledge/` and `docs/templates/`:
- `knowledge/bottlenecks.md` $\rightarrow$ `knowledge/bottlenecks.md`
- `knowledge/dependencies.md` $\rightarrow$ `knowledge/dependencies.md`
- `knowledge/patterns.md` $\rightarrow$ `knowledge/patterns.md`
- `knowledge/roi_logic.md` $\rightarrow$ `knowledge/roi_logic.md`
- `knowledge/n8n_core.md` $\rightarrow$ `knowledge/n8n_core.md`
- `knowledge/prioritization_framework.md` $\rightarrow$ `knowledge/prioritization_framework.md`
- `docs/mcp_usage_guide.md` $\rightarrow$ `docs/mcp_usage_guide.md`
- `docs/templates/logseq/*` $\rightarrow$ `docs/templates/logseq/`
- `docs/templates/architecture/*` $\rightarrow$ `docs/templates/architecture/`
- `docs/templates/automata/*` $\rightarrow$ `docs/templates/automata/`

### 3.2 Dynamic Stack Retargeting in `engine/prompt_compiler.js`:
All 9 stacks in `getDynamicKnowledge` (React, Angular, Vue, TS, JS, Flutter, Go, Java, Dotnet) retargeted from `knowledge/stacks/` to `knowledge/stacks/`.

### 3.3 Purge:
- Remove directories: `architect/`, `backend/`, `frontend/`, `mobile/`, `compliance/`, `po/`, `council/`, `decoder/`, `quicky/`, `researcher/`, `automata/`, `squad/`, and `common/`.
- Remove `toml` from `package.json` dependencies.
