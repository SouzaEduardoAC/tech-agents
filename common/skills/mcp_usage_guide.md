# Skill: MCP Usage Guide — Agent Hub Server

## Purpose
A foundational reference skill that teaches any LLM how to interact with the Agent Hub MCP server (`@souzaeduardoac/tech-agents`). This guide covers all exposed tools, the full agent catalog, command aliases, and a decision flowchart for selecting the right agent. It should be treated as required reading before making any MCP tool call.

---

## 1. Overview

The Agent Hub MCP server exposes **7 tools** for agent discovery, command execution, prompt retrieval, and pipeline management. The package is `@souzaeduardoac/tech-agents`.

**Core principle:** When you call `call_agent_command`, the returned prompt **IS** the agent. You must adopt its persona, follow its instructions, and execute its task. It is not informational — it is an identity transfer.

---

## 2. MCP Tools Reference

### Tool 1: `list_agents`

| Property | Value |
|---|---|
| Parameters | None |
| Returns | All available agents and their registered commands |
| When to use | Call this **FIRST** when unsure which agent or command to use. This is the discovery tool. |

---

### Tool 2: `call_agent_command`

| Property | Value |
|---|---|
| Parameters | `agent` (string), `command` (string), `args` (string) |
| Returns | The fully assembled agent prompt with persona, skills, and knowledge |
| When to use | When the user explicitly requests an agent, or when the task naturally maps to a specialized domain |

**Key behaviors:**
- The returned prompt IS the agent — adopt its persona and execute its instructions.
- Command aliases exist (e.g., `run` for squad maps to the actual command). The MCP handles alias resolution automatically.
- The `args` parameter should contain the full task description — be specific, as it becomes the agent's primary objective.

---

### Tool 3: `get_agent_prompt`

| Property | Value |
|---|---|
| Parameters | `agent` (string) |
| Returns | The full identity, persona, and knowledge base for an agent WITHOUT executing a command |
| When to use | To preview or understand an agent's capabilities before committing to a command |

---

### Tool 4: `pipeline_start`

| Property | Value |
|---|---|
| Parameters | `goal` (string), `gates` (array of strings), `cwd` (optional string) |
| Returns | Session ID, confirmation, and registered gates |
| When to use | Only at the beginning of a Squad `run` pipeline |

Creates a branch-scoped `.squad-state-[branch].json` file with all gates set to `locked`. Automatically appends `.squad-state-*.json` to `.gitignore`. If `cwd` is supplied, resolves the project root relative to it (enabling project isolation under global daemons). Must be called before `request_approval` or `check_gate`.

---

### Tool 5: `request_approval`

| Property | Value |
|---|---|
| Parameters | `gate` (string), `artifact_path` (optional string), `summary` (string), `cwd` (optional string) |
| Returns | A hard STOP message |
| When to use | After completing a pipeline phase. Only within Squad pipelines. |

⚠️ CRITICAL: This is a HARD STOP. Do NOT call any further agent tools or continue pipeline work after this tool returns. Wait for human approval. Uses `cwd` to find the project root and branch-scoped state file.

---

### Tool 6: `check_gate`

| Property | Value |
|---|---|
| Parameters | `gate` (string), `cwd` (optional string) |
| Returns | Approval status (approved/pending/locked) |
| When to use | At the **START** of each new pipeline phase, before doing any work |

Returns `approved: true` if the gate has been approved in the active branch-scoped state file. Returns an error if the gate is `pending` or `locked`. In standalone mode (no active session), returns a soft advisory. Uses `cwd` to locate the project root.

---

### Tool 7: `pipeline_approve`

| Property | Value |
|---|---|
| Parameters | `gate` (string), `cwd` (optional string) |
| Returns | Confirmation of approval |
| When to use | When the human approves via `/squad:approve <gate>` or directly through the MCP tool |

Updates the gate status to `approved` in the branch-scoped state file. Uses `cwd` to locate the project root.

---

## 3. Agent Catalog

### Squad Orchestrator (`squad`)
- **Description:** Multi-agent pipeline management and full documentation sync
- **Commands:** `run` (full pipeline), `full-sync` (document entire project), `approve` (approve pipeline gate)
- **Triggers:** "run the squad", "build X end-to-end", "orchestrate", "full pipeline"

### Product Owner (`po`)
- **Description:** Requirements gathering, PRD generation, stakeholder interviews
- **Commands:** `discovery` (transform ideas into PRDs), `interview` (interactive stakeholder grilling), `analyze` (business rule simulation), `docs` (document requirements), `squad-docs` (deep-dive project documentation of business flows)
- **Triggers:** "gather requirements", "write a PRD", "product discovery", "interview me"

### Architect (`architect`)
- **Description:** Systems architecture, security auditing, design patterns
- **Commands:** `create` (full lifecycle: investigate → plan → implement → review), `auditor` (patterns/security/perf audit), `analyze` (behavioral simulation), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of ADRs and resilience policies)
- **Triggers:** "design the system", "architect this", "audit the architecture"

### Backend (`backend`)
- **Description:** APIs, databases, server-side implementation
- **Commands:** `create` (full lifecycle), `auditor` (backend-specific audit), `analyze` (API/data simulation), `review` (PR review), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of routes and schemas)
- **Triggers:** "implement the API", "build the backend", "review this PR (backend)"

### Frontend (`frontend`)
- **Description:** UI implementation, React/Angular/Vue
- **Commands:** `create` (full lifecycle), `auditor` (UI audit), `analyze` (component/state simulation), `review` (PR review), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of pages and UI state)
- **Triggers:** "build the UI", "implement the frontend", "review this PR (frontend)"

### Mobile (`mobile`)
- **Description:** Flutter/iOS/Android mobile development
- **Commands:** `create` (full lifecycle), `auditor` (mobile audit), `analyze` (widget/state simulation), `review` (PR review), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of screens and local storage)
- **Triggers:** "build the mobile app", "implement in Flutter", "review this PR (mobile)"

### Compliance (`compliance`)
- **Description:** Regulatory audits — GDPR, HIPAA, LGPD, SOC2
- **Commands:** `master` (deep cross-referencing audit), `audit` (privacy audit)
- **Triggers:** "run a compliance audit", "check GDPR", "audit for HIPAA"

### Council (`council`)
- **Description:** Multi-perspective debate engine (PO + Architect + Privacy Auditor)
- **Commands:** `debate` (symmetrical design debate and synthesis)
- **Triggers:** "debate this", "call the council", "multi-perspective review"

### Researcher (`researcher`)
- **Description:** Deep investigation and data-driven research
- **Commands:** `report` (data-driven research task), `investigate` (deep-dive research), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of external APIs and AI standards)
- **Triggers:** "research X", "investigate Y", "write a report on Z"

### Forge (`forge`)
- **Description:** Meta-agent designer — creates, audits, and upgrades other agents
- **Commands:** `create` (scaffold new agent), `discovery` (interactive agent design), `auditor` (audit existing agent), `upgrade` (upgrade agent), `docs` (Logseq sync), `squad-docs` (deep-dive documentation of registries and triple-anchors)
- **Triggers:** "create a new agent", "audit this agent", "upgrade the backend agent"

### Automata (`automata`)
- **Description:** Workflow automation architect
- **Commands:** `plan` (research and design workflows), `create` (generate validated JSON workflows)
- **Triggers:** "automate this workflow", "design an automation"

### Decoder (`decoder`)
- **Description:** Technical-to-business translator
- **Commands:** `export` (translate tech docs to business language), `docs` (Logseq sync), `squad-docs` (deep-dive translation of tech specs to business spec exports)
- **Triggers:** "translate this for stakeholders", "business export", "make this non-technical"


### Quicky (`quicky`)
- **Description:** Rapid, lightweight fix agent for small tweaks
- **Commands:** `fix` (execute minor task, update docs, commit)
- **Triggers:** "quick fix", "fix this typo", "add a log statement", "small tweak"

---

## 4. Decision Flowchart

Use this tree to select the right agent and command:

```
Is it a small fix/typo?
  └─ YES → quicky:fix

Is it a full feature requiring multiple phases?
  └─ YES → squad:run

Is it a design/architecture question?
  └─ YES → architect:create or architect:analyze

Is it API/backend work?
  └─ YES → backend:create or backend:analyze

Is it UI work?
  └─ YES → frontend:create or frontend:analyze

Is it mobile work?
  └─ YES → mobile:create or mobile:analyze

Is it a PR review?
  └─ YES → backend:review, frontend:review, or mobile:review (match domain)

Is it requirements/PRD?
  └─ YES → po:discovery or po:interview

Is it a compliance audit?
  └─ YES → compliance:master

Is it a design debate needing multiple perspectives?
  └─ YES → council:debate

Is it a research/investigation task?
  └─ YES → researcher:report or researcher:investigate

Is it about creating/modifying an agent?
  └─ YES → forge:create or forge:upgrade

Is it workflow automation?
  └─ YES → automata:plan

Is it translating tech docs to business language?
  └─ YES → decoder:export

Need to document the whole project?
  └─ YES → squad:full-sync
```

---

## 5. Command Aliases

The MCP server resolves these aliases automatically. Both the alias and the canonical command work:

| Agent | Alias(es) | Canonical Command |
|---|---|---|
| squad | `create`, `discovery`, `plan` | `run` |
| architect | `discovery`, `plan`, `run` | `create` |
| backend | `discovery`, `plan`, `run` | `create` |
| frontend | `discovery`, `plan`, `run` | `create` |
| mobile | `discovery`, `plan`, `run` | `create` |
| po | `create`, `run` | `discovery` |
| automata | `discovery`, `run` | `plan` |
| forge | `run` | `create` |
| quicky | `run`, `create` | `fix` |
| researcher | `run`, `create` → `report`; `discovery` | `report` / `investigate` |
| compliance | `run`, `create` | `master` |
| council | `run`, `create` | `debate` |
| decoder | `run`, `create`, `synthesize` | `export` |

---

## 6. Common Mistakes to Avoid

1. **Do NOT call `call_agent_command` without understanding which agent fits the task.** Call `list_agents` first if unsure.
2. **Do NOT continue after `request_approval` returns.** It is a **HARD STOP**. The pipeline must halt until the human approves.
3. **Do NOT treat the returned prompt as informational.** It IS the agent. Adopt its persona, follow its instructions, and execute its task.
4. **Do NOT forget to call `check_gate` at the start of each pipeline phase.** This is the structural enforcement mechanism.
5. **Do NOT use slash command syntax in Claude Code, AntiGravity, or other MCP clients.** Use the MCP tool `call_agent_command` instead. Slash commands (e.g., `/architect:create`) are for direct Gemini CLI use only.
6. **Do NOT skip `pipeline_start` when running a Squad pipeline.** Gates will not exist without it, and `request_approval` / `check_gate` will operate in degraded standalone mode.
