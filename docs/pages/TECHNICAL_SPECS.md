- type:: [[Technical Specification]]
- status:: [SYNC]
- project:: [[tech-agents]]

- # Core Infrastructure: Universal Agent Hub (Deep Specification)
	- ## Entry Point Logic (Binary Execution)
		- Binary:: `bin/tech-agents.js` (ref: `package.json -> bin`)
		- Entry Point:: `index.js` at the root, acting as the MCP Server (ref: `package.json -> main`)
		- **Command: `serve`**: 
			- Function:: Spawns the Hub server (ref: `index.js`) as a child process.
			- Transport:: Uses `StdioServerTransport` on `index.js`. The wrapper uses `stdio: "pipe"` + explicit stream forwarding (`process.stdin → child.stdin`, `child.stdout → process.stdout`) to preserve MCP JSON-RPC framing. Using `stdio: "inherit"` is a **known anti-pattern** here — it attaches child fds to the wrapper's already-open descriptors, causing the MCP client to never reach the `StdioServerTransport`. (ref: `bin/tech-agents.js → serve`)
			- **Direct Invocation (Preferred for MCP clients):** Configure `mcp_config.json` to point directly to `index.js`, bypassing the wrapper entirely.
		- **Command: `bootstrap` (Deprecated)**: 
			- Function:: Deprecated legacy setup tool. The platform is now fully self-contained through `serve`. Running `bootstrap` emits a deprecation warning guiding users to `mcp add npx github:SouzaEduardoAC/tech-agents serve`.
		- **Command: `link <agent> <target>`**: 
			- Function:: Creates a hard filesystem symlink between the agent's core `persona.md` (or MCP usage guide) and a project-specific instruction file (e.g., `.cursorrules`, `.clauderules`).
	- ## The Orchestration Engine (The Bridge)
		- **Logic Mixing & Prompt Optimization (AMD Core)**: 
			- The Hub server performs a multi-stage optimized prompt assembly.
			- Formula:: `Prompt = identityMeta + Deduplicated/Relevant Common Standards + Deduplicated/Relevant Common Skills + Dynamic Stack Skills + Auto-Injected Agent Skills + Auto-Injected Agent Knowledge + Command Prompt (TOML)`.
			- **Late-Binding Deduplication**: Scanning TOML prompts for explicit `!{cat}` directives and dynamically filtering those files from prepended common sections to eliminate duplicate token injection (ref: `index.js -> compileCommonSection`, `index.js -> readAgentDirDeduped`).
			- **Heuristic Relevance Filtering**: Dynamically prepending only the subset of common files matching the active command keywords and intent, reducing common block token bloat by up to 70%. `business_synthesis.md` is gated behind `synthesize|translate|export|stakeholder|business|report|decoder` keywords — prevents it from polluting debate-oriented prompts (e.g. `council:debate`). `investigation.md` is gated behind `analyze|simulate|hypothetical|trace|csv|json|data file` keywords — prevents it from adding read-only framing to action-oriented commands. (ref: `index.js → compileCommonSection`)
			- **Agent Skills/Knowledge Auto-Injection**: `call_agent_command` now automatically loads `[agent]/skills/*.md` and `[agent]/knowledge/*.md` with dedup-aware filtering (`readAgentDirDeduped`) — files already explicitly `!{cat}`'d in the TOML are skipped. This makes every agent's full identity available regardless of TOML authoring completeness, mirroring `get_agent_prompt` layout. (ref: `index.js -> call_agent_command`)
		- **Shared Skills (common/skills/)**:
			- **`investigation.md` — Internal Investigation Protocol**:
				- Purpose:: Read-only behavioral simulation skill. Answers questions grounded in actual local files (CSV, JSON, configs, source code) and hypothetical data scenarios. Zero side effects — no artifacts produced, no implementation transitions triggered.
				- Phases:: Asset Mapping → Data Profiling → Behavioral Simulation → Findings Report.
				- Available via:: `architect:analyze`, `backend:analyze`, `frontend:analyze`, `mobile:analyze`, `po:analyze`.
				- Injection guard:: Only injected when the search target matches analyze/simulate/trace/csv/json/hypothetical keywords. (ref: `common/skills/investigation.md`, `index.js → compileCommonSection`)
			- **`mcp_usage_guide.md` — MCP Usage Guide**:
				- Purpose:: Foundational guide instructing any client LLM on the 7 MCP tools, 13 agents, 42+ commands, trigger phrases, aliases, and flowchart logic.
				- Behavior:: Statically linked via CLI (`link mcp <target>`) or dynamically served as the response of the `list_agents` tool, and always injected into the prompt of any running agent command as foundational baseline knowledge. (ref: `common/skills/mcp_usage_guide.md`, `index.js → compileCommonSection`)
		- **Dynamic Stack Detection (The Heuristic Engine)**:
			- Activated for: `architect`, `backend`, `frontend`, `mobile`.
			- Sniffs the project directory (`process.cwd()`) and immediately nested subdirectories (Depth-1 monorepo scan) for marker files (e.g. `pom.xml`, `package.json`, `pubspec.yaml`, `go.mod`, `.csproj`) or keywords in `taskArgs`.
			- Dynamically appends the relevant framework guides (e.g. `java.md`, `react.md`) to the context.
			- **Multi-Stack Guard (On-Demand Mode)**: If multiple primary stacks are detected (e.g. Java in `module-auth/` + React in `module-frontend/`), the engine aborts pre-injection and outputs an `On-Demand Manifest` with module attribution. This forces the LLM to explicitly use `view_file` to read the correct stack context only when needed, avoiding cross-contamination and token bloat. (ref: `index.js -> getDynamicKnowledge`, `scanWorkspace`)
			- **Exception — `review` Commands (Diff-Based Detection)**: The `backend:review`, `frontend:review`, and `mobile:review` commands operate against remote PR diffs, not local files. Stack detection for these commands bypasses `getDynamicKnowledge()` and instead runs **Phase 0.4** inside the prompt session: the agent scans changed file extensions and config markers from the acquired diff and calls `view_file` on the matching `common/stacks/*.md` reference. Detection is agent-scoped (backend → .NET/Java/Go; frontend → React/Angular/Vue/TS/JS; mobile → Flutter). Running from the project root is recommended to also load `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` into context for project-specific supplementary hints. (ref: `common/skills/pr_review.md → Phase 0.4`)
		- **Probe Resolution Logic (The !{cat} Pattern)**:
			- Pattern:: `/!\{cat\s+([^\}]+)\}/g`
			- Behavior:: Resolves paths relative to `AGENTS_ROOT` or `~/.gemini/agents`.
			- Fail-safe:: Replaces failed reads with `[Error reading file: path]`.
			- (ref: `index.js -> resolveProbes`)
		- **Registration Logic (The Graph Genome)**:
			- Every documentation turn MUST conclude with a write to `docs/pages/registry.md`.
			- Pointers: Features are indexed with mandatory `nodes:: [[Link]]` properties.
			- Purpose: Enables on-demand stakeholder reporting without full graph crawls. (ref: `common/skills/logseq_knowledge.md -> Phase 4`)
	- ## Data Standards & Guardrails
		- **Testing Gate**: Mandates unit tests for business logic and regression tests for bug fixes. (ref: `common/knowledge/testing_standard.md`)
		- **Licensing Gate**: Mandatory **HALT** and **ROI Logic** report for commercial dependencies. (ref: `common/knowledge/licensing.md`)
		- **Git Gate**: Strictly follows Conventional Commits 1.0.0, mandating both a scope and a body for all commits. (ref: `common/knowledge/git_standard.md`)
	- ## MCP Ecosystem (The Probe Layer)
		- ### Shipped with Agentic Hub
			- The following MCPs are automatically configured during the `bootstrap` phase.
			- **Agent Hub (Internal)**:
				- Description:: The core orchestration server developed in this repository.
				- Interaction:: Provides the `call_agent_command` tool to retrieve raw compiled prompts, and the `run_agent_loop` tool to execute multi-turn agent loops on the server side via client-side sampling.
				- Loop Completion Rule:: The server-side loop execution terminates ONLY when the agent outputs the `<task_complete>` tag, preventing premature exits on generic words like "complete" or "done".
				- Link:: [[Internal]] (ref: `index.js`)
				- **MCP Config Entry (Correct):** `{ "command": "node", "args": ["<ABSOLUTE_PATH>/bin/tech-agents.js", "serve"] }` — points to the CLI wrapper with the `serve` option (using stdin/stdout stream piping to forward JSON-RPC framing to `index.js`).
				- **Startup Diagnostics:** `index.js` wraps `server.connect(transport)` in a `try/catch`, writing fatal errors to `process.stderr` and calling `process.exit(1)` for visibility to MCP host processes. (ref: `index.js → transport connect`)
				- **`list_agents` Upgrade:** The `list_agents` tool dynamically detects and returns the full `mcp_usage_guide.md` text rather than a raw listing of folder names. This guarantees that any client LLM executing `list_agents` immediately receives the complete tool execution protocols, agent directory mapping, aliases, and flowchart, enabling out-of-the-box accuracy in external workspace environments. (ref: `index.js → list_agents`)
			- **Filesystem MCP**:
				- Description:: Secure access to the project's `/docs` directory for Logseq graph manipulation.
				- Interaction:: Used by ALL agents to read/write documentation, ADRs, and PRDs.
				- Server:: `@modelcontextprotocol/server-filesystem`
				- Link:: [GitHub](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
			- **Context7 MCP**:
				- Description:: Real-time, version-specific technical documentation retriever for thousands of libraries and frameworks to eliminate hallucinations. Works keyless or with an optional API key for higher rate limits.
				- Interaction:: Used by ALL agents to pull highly accurate, up-to-date syntax and API definitions for modern packages.
				- Server:: `@upstash/context7-mcp`
				- Link:: [GitHub](https://github.com/upstash/context7) | [Upstash](https://upstash.com/)
		- ### Recommended (External)
			- These MCPs are recommended for high-precision engineering but require manual environment or tool configuration (e.g., API Tokens, global CLI installation).
			- **Playwright MCP and Playwright CLI**:
				- Description:: Browser automation for visual verification, accessibility audits, and performance testing, running either as an MCP server or directly via the CLI.
				- Interaction:: Essential for `:auditor` commands and `frontend`/`mobile` verification phases.
				- Server/Package:: `@playwright/mcp` and `@playwright/cli`
				- Link:: [GitHub (MCP)](https://github.com/microsoft/playwright-mcp) | [Playwright CLI](https://playwright.dev/docs/cli)
			- **Google Stitch MCP**:
				- Description:: Design-to-code bridge for fetching UI/UX artifacts and Design DNA.
				- Interaction:: Used by `frontend`, `mobile`, and `po` for design-grounded discovery and creation.
				- Server:: `@_davideast/stitch-mcp`
				- Link:: [GitHub](https://github.com/davideast/stitch-mcp)
			- **SonarQube MCP**:
				- Description:: Real-time code quality and security analysis.
				- Interaction:: Integrated into `:auditor` commands for technical debt and security hotspot scanning.
				- Server:: `sonarqube-mcp-server`
				- Link:: [GitHub](https://github.com/SonarSource/sonarqube-mcp-server)
	- ## MCP-Level Human Approval Gate System
		- **Purpose:** Structural enforcement layer that makes it physically impossible at the API level for an LLM orchestrator to advance a pipeline phase without explicit human approval. Supplements (not replaces) the prompt-level `⚠️ MANDATORY HUMAN CHECKPOINT` prose guardrails in `run.toml`.
		- **State File:** `.squad-state-[branchSlug].json` resolved dynamically at the root of the active project by querying the current git branch name (e.g. `feature-auth` → `.squad-state-feature-auth.json`). Enables clean branch-scoped isolation and prevents session collisions.
		- **Project containment (CWD):** The state path is resolved by traversing upward from either: (1) the optional `cwd` parameter passed from the client tool call, or (2) `process.cwd()` as a fallback. This guarantees workspace-scoped isolation under a global MCP daemon process (like Claude Desktop) where the parent process CWD is locked to `~/`.
		- **Session Schema:**
			```json
			{
			  "session_id": "<timestamp>-<8-char-sha256-of-goal>",
			  "initiated_at": "<ISO 8601 timestamp>",
			  "goal": "<the pipeline goal string>",
			  "gates": {
			    "<gate_key>": {
			      "status": "locked | pending | approved",
			      "artifact": "<path to artifact file, optional>",
			      "requested_at": "<ISO timestamp, set when status→pending>",
			      "approved_at": "<ISO timestamp, set when status→approved>"
			    }
			  }
			}
			```
		- **Gate Lifecycle:** `locked` → `pending` (via `request_approval`) → `approved` (via `/squad:approve <gate>` command or `pipeline_approve` MCP tool).
		- **New MCP Tools (ref: `index.js`):**
			- **`pipeline_start`**: Initializes a new pipeline session. Accepts `{ goal: string, gates: string[], cwd?: string }`. Resolves the active project root based on `cwd` or `process.cwd()` and creates `.squad-state-[branchSlug].json` with all gates set to `locked` and a fresh `session_id`. If `.gitignore` exists at the resolved project root, automatically appends `.squad-state-*.json` if it does not already contain it. Must be called before any other gate tool.
			- **`request_approval`**: Called by an LLM agent at the END of a phase. Accepts `{ gate: string, artifact_path?: string, summary: string, cwd?: string }`. Resolves the dynamic state file path, sets the gate to `pending`, and returns a hard STOP message instructing the LLM to cease all further tool calls until the human approves. In standalone mode (no state file found), emits a soft STOP message without writing state.
			- **`check_gate`**: Called by an LLM agent at the START of the next phase. Accepts `{ gate: string, cwd?: string }`. Resolves the dynamic state file path. Returns `{ approved: true }` if gate is `approved`. Returns a **hard error** (`isError: true`) if gate is `pending` or `locked` — the MCP error response prevents the calling LLM from treating this as a success and continuing. In standalone mode (no state file found), returns `{ approved: true, message: "No active Squad session — proceeding with prompt-level guardrails only." }` to allow standalone agent runs to proceed unblocked.
			- **`pipeline_approve`**: Called to register human approval for a gate. Accepts `{ gate: string, cwd?: string }`. Updates the branch-scoped state file, transitioning the gate status to `approved` and stamping it with `approved_at`. Returns confirmation.
		- **Human Trust Anchor — `/squad:approve <gate>` / `pipeline_approve`:** The mechanisms to advance a gate from `pending` → `approved`. The slash command `/squad:approve` lives in `squad/commands/squad/approve.toml` and delegates directly to the `pipeline_approve` tool call for server-side branch resolution, ensuring client-side command simplicity.
		- **Standalone Mode Grace:** When no `.squad-state-[branchSlug].json` exists in the project traversal path, `check_gate` returns a soft advisory (`approved: true`) so that individual agents (architect, backend, frontend, mobile, automata, researcher, po) can run as standalone without being blocked by the gate system. Only `pipeline_start` activates the structural enforcement.
		- **Pipeline Gate Map:**
			| Agent | Gate Key | Phase Entry (`check_gate`) | Phase Exit (`request_approval`) |
			|-------|----------|---------------------------|--------------------------------|
			| Squad `run.toml` | `prd` | Phase 2 start | Phase 1 end |
			| Squad `run.toml` | `plan` | Phase 3/4 start | Phase 2 end |
			| Squad `run.toml` | `compliance` | Phase 4 start | Phase 3 end |
			| Architect `create.toml` | `discovery` | Phase 2 start | Phase 1 end |
			| Architect `create.toml` | `plan` | Phase 4 start | Phase 2 end |
			| Architect `create.toml` | `audit` | — | Phase 4 end |
			| Backend `create.toml` | `plan` | Phase 3 start | Phase 2 end |
			| Frontend `create.toml` | `plan` | Phase 3 start | Phase 2 end |
			| Mobile `create.toml` | `discovery` | Phase 2 start | Phase 1 end |
			| Mobile `create.toml` | `plan` | Phase 3 start | Phase 2 end |
			| Automata `plan.toml` | `discovery` | Phase 2 start | Phase 1 end |
			| Automata `plan.toml` | `plan` | — | Phase 2 end |
			| Researcher `investigate.toml` | `discovery` | — | Phase 1 end |
			| Researcher `report.toml` | `discovery` | Phase 2 start | Phase 1 end |
			| PO `discovery.toml` | `prd` | — | Step 5 end |
	- ## Full-Sync Deep Documentation Protocol (v2026)
		- **Purpose:** Mandates that a project-wide documentation sync (`/squad:full-sync`) produces high-fidelity, use-case-by-use-case and component-by-component deep specifications, rather than shallow index pages.
		- **Command Isolation:** Separate, dedicated `squad-docs` commands are created for each of the 8 participating agents (PO, Researcher, Architect, Backend, Frontend, Mobile, Forge, Decoder) to isolate full-sync documentation rules from normal development-time workflows.
		- **Manifest-First Extraction Pattern:** Participating agents must scan the codebase and print a structured list (manifest) of all discovered entities before generating documentation, preventing omissions.
		- **Per-Entity File Iteration:** For every entity in the manifest, the agent must generate a dedicated Logseq page in `docs/pages/` using the matching template from `common/templates/logseq/` (e.g., `business_flow_page.md`, `technical_endpoint.md`, `technical_data_model.md`).
		- **Cross-Linking & Registry Integration:** General summary files (e.g. `BUSINESS_FLOW.md`, `TECHNICAL_SPECS.md`) are rewritten to act as indexed list nodes linking to these generated deep-dive pages. All new pages are recorded in the global registry `docs/pages/registry.md`.
