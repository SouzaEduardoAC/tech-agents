---
feature_name: "Pure V3 Architecture Migration"
problem_statement: "The tech-agents repository currently maintains dual architectures: a legacy v2 prompt-compiler injecting thousands of tokens of theatrical persona bloat across 191 unmaintained files, and a modern v3 deterministic harness with playbooks, lenses, toolboxes, and local checks. Maintaining both models leads to context bloat, persona drift, dual maintenance overhead, and architectural ambiguity."
user_stories:
  - "As an AI client (Gemini CLI, Claude Code, AntiGravity), I want to invoke high-precision SDLC workflows through deterministic playbooks and concise cognitive lenses, so that token consumption is minimized and execution is reliable."
  - "As a software engineer, I want all legacy persona files and TOML commands removed while retaining 100% of domain intelligence in a centralized knowledge base, so that repository maintenance is clean and no IP is lost."
  - "As a developer performing ad-hoc micro tasks, I want a lightweight stateless lens tool (lens_prompt), so that I can prime the model's professional mindset without spinning up a multi-step state machine."
acceptance_criteria:
  - scenario: "Centralized Knowledge Evacuation"
    given: "Unmigrated knowledge files in legacy agent directories (architect, po, automata, common)"
    when: "The migration script or relocation step executes"
    then: "All unique domain standards and templates exist under knowledge/ and docs/templates/ with zero lost heuristics."
  - scenario: "Clean Legacy Removal"
    given: "All 12 legacy agent folders and 59 TOML commands exist in the tree"
    when: "The v2 decommission step executes"
    then: "All legacy agent directories, persona.md files, and commands/*.toml are removed, and the toml npm dependency is removed from package.json."
  - scenario: "Internal Engine Path Alignment"
    given: "prompt_compiler.js references knowledge/stacks/ and common/skills/"
    when: "Dynamic stack detection and standard resolution run"
    then: "All paths resolve strictly to knowledge/stacks/ and docs/ without missing file errors."
  - scenario: "Stateless Lens Fast-Path Availability"
    given: "A user needs a single-turn stance execution"
    when: "Calling lens_prompt(lens, task)"
    then: "The tool returns the concise cognitive stance without requiring an active .squad-state file."
  - scenario: "Playbook Execution Integrity"
    given: "A pure V3 codebase"
    when: "Running npm test"
    then: "All V3 test suites pass cleanly with exit code 0."
moscow_prioritization:
  must_have:
    - "Evacuate unmigrated domain knowledge (bottlenecks.md, dependencies.md, n8n_core.md, prioritization_framework.md) to root knowledge/."
    - "Retarget dynamic stack resolution in engine/prompt_compiler.js to knowledge/stacks/."
    - "Remove all 12 legacy agent folders (architect, backend, frontend, mobile, compliance, po, council, decoder, quicky, researcher, automata, squad)."
    - "Remove toml dependency from package.json and clean up compileLegacyCommandPrompt."
    - "Expose stateless lens_prompt MCP tool for single-turn fast-path operations."
    - "Verify all 14 playbooks and check runners pass test suites."
  should_have:
    - "Refactor run_agent_loop to drive Playbook steps rather than legacy TOML commands."
    - "Update bin/tech-agents.js link command to link lenses and knowledge instead of legacy persona.md."
    - "Move docs/mcp_usage_guide.md to docs/mcp_usage_guide.md."
  could_have:
    - "Provide lightweight backward compatibility redirect in call_agent_command advising migration to playbook_start."
  wont_have:
    - "Retaining legacy .toml prompt files or regex probe (!{cat}) resolvers."
    - "Retaining multi-page persona markdown files."
edge_cases:
  - "User invokes an obsolete slash command (e.g. /backend:create) expecting prompt output."
  - "Workspace detection detects multiple stacks without legacy common/stacks directory present."
  - "Local hard checks executed in CI environment without npm test or linters installed."
---

# Product Requirements Document (PRD): Pure V3 Architecture Migration

## 1. Context & Objectives
The **tech-agents** platform has completed its transition from a prompt-compiler / persona-cosplay model (v2) to a deterministic, production-grade **Agentic Engineering Harness** (v3). 
This PRD specifies the complete decommissioning of legacy v2 files and dependencies, cementing v3 as the sole, canonical architecture.

## 2. Scope & Target State
- **Elimination of Legacy Footprint:** 191 files across 12 agent folders removed.
- **Dependency Streamlining:** Removal of `toml` parser and legacy probe-replacement logic.
- **Zero Knowledge Loss:** Complete consolidation into `knowledge/` and `docs/templates/`.
- **Fast-Path Usability:** Addition of `lens_prompt` for lightweight single-turn execution.

## 3. Work Breakdown & Dependencies
1. **Evacuation & Normalization:** Relocate remaining domain knowledge from `architect/`, `po/`, `automata/`, and `docs/templates/logseq/` to `knowledge/` and `docs/templates/`.
2. **Engine Decoupling:** Re-point all references in `engine/prompt_compiler.js` and `index.js` to `knowledge/stacks/` and `docs/`.
3. **Legacy Eradication:** Delete legacy folders and update `package.json`.
4. **Fast-Path MCP Tool:** Implement `lens_prompt` in `index.js`.
5. **Test Suite Verification:** Run `npm test` and ensure all test suites pass.
