# Skill: Engineering Execution Protocol (v2026)

## [MODE: DISCOVERY]
0. **Grounding:** Read `AI Context` or `GEMINI.md`.
1. **Deep Research:** Autonomously map data flows, dependencies, and side-effects across the codebase related to the request.
2. **Interactive Clarification:** Identify any ambiguities in business logic, edge cases, or constraints. If any exist, **STOP** and ask the user targeted questions before proceeding.
3. **Discovery Artifact:** Write findings and confirmed understanding directly to `docs/pages/[feature]-discovery.md` (where `[feature]` is derived from the task target as a short lowercase-hyphenated slug, e.g., `auth-refactor`, `payment-webhook`).
   - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
     - `type:: [[Discovery]]`
     - `status:: [[ACTIVE]]`
     - `project:: [[ai-agents]]`
     followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).
4. **Validation:** Inform the user the discovery artifact is ready and request approval of your understanding.
   - **ACTION:** The discovery artifact is already persisted in `docs/pages/[feature]-discovery.md`. Await explicit user approval before drafting the plan.
   - **HALT:** End session. Do not write implementation plan.

## [MODE: PLAN]
0. **Grounding:** Read `AI Context` or `GEMINI.md`.
1. **Load Context:** Read `docs/pages/[feature]-discovery.md` to align with the approved understanding.
2. **Contextualize:** Trace specific logic/dependencies based on the discovery artifact.
3. **Analyze:** Parse the task into discrete implementation steps.
4. **Draft Plan:** Create a detailed Implementation Plan and **write it to `docs/pages/[feature]-plan.md`** immediately.
   - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
     - `type:: [[Plan]]`
     - `status:: [[ACTIVE]]`
     - `project:: [[ai-agents]]`
     followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).
   - **Context7 Citation Mandate**: If the plan involves external libraries, frameworks, or modern APIs, you MUST query the `context7` MCP server to fetch the exact, up-to-date documentation. You are STRICTLY REQUIRED to embed these fetched code blocks, API contracts, and version-specific definitions directly into a dedicated section of the implementation plan called `## Dependency & API Contracts (Context7)`.
5. **Validation & Persistence:** Inform the user the plan is ready at `docs/pages/[feature]-plan.md` and request approval.
   - **AUTOMATED PLAN VERIFICATION:** Prior to halting for approval, you must verify that the plan contains the `## Dependency & API Contracts (Context7)` section with actual retrieved documentation. If external libraries are involved and this section is missing or empty, **HALT** and regenerate the plan with proper Context7 references.
   - **ACTION:** The plan is already persisted. Await explicit user approval before proceeding.
   - **HALT:** End session. Do not write implementation code.

## [MODE: IMPLEMENT]
0. **Grounding:** Read `AI Context` or `GEMINI.md`.
1. **Load Contract:** Read `docs/pages/[feature]-plan.md`. 
2. **Sync:** Verify the current codebase still matches the plan's assumptions.
3. **Tasking:** Create a `TODO.md` based on the plan.
4. **Execution:** Implement changes following `AI Context` standards.
5. **Package Restore (Pre-Test Guard):** Before running tests, check if the project requires a package restore (e.g., `npm install`, `dotnet restore`, `pip install`).
   - **PRIVATE FEED CHECK:** Inspect the dependency manifest (`package.json`, `*.csproj`, `requirements.txt`, etc.) for references to private/internal registries or feeds.
   - **If private feeds are detected:** **STOP.** Ask the user to provide the private feed configuration file (e.g., `nuget.config`, `.npmrc`, `pip.conf`) before proceeding.
   - **If no private feeds:** Proceed with the restore normally.
6. **Testing:** Write and run unit/integration tests.
7. **Visual Verification (UI Only):** If the task involves UI changes, use `playwright-cli` to perform a real-time browser verification of the components. Take screenshots or snapshots to confirm visual alignment with the design requirements.
8. **Verification:** Ensure 100% pass rate (Old + New). **DO NOT PROCEED** if any fail.
8. **Delivery:** `git add` and `git commit` to a feature branch.
   - **GUARD:** Never commit to `main`, `master`, `develop`, or `development`.
9. **Plan Reconciliation:** Update `docs/pages/[feature]-plan.md` with a final status section:
   - **Implemented:** List every planned item that was completed, with the corresponding commit reference.
   - **Pending / Out of Scope:** List any planned items that were skipped, deferred, or blocked, with a brief reason.
   - If everything was completed, mark the plan status as `[DONE]`; otherwise mark it `[PARTIAL]`.

   ---

   ## [MODE: SQUAD-FLOW]
   0. **Pre-Sync:** Execute `/document` logic (Phase 0) to verify current documentation vs. code reality.
   1. **Deep Dive:** Execute `/investigate` logic. Write findings to `docs/pages/[feature]-discovery.md`.
   2. **Gate 0 (Discovery Approval):** Inform the user the discovery artifact is ready at `docs/pages/[feature]-discovery.md`. **STOP** and wait for explicit approval.
   3. **Architectural Intent:** Execute `/plan` logic. Write the plan to `docs/pages/[feature]-plan.md`.
   4. **Gate 1 (Human Approval):** Inform the user the plan is ready at `docs/pages/[feature]-plan.md`. **STOP** and wait for explicit approval.
   5. **Execution:** Upon approval, execute `/develop` logic. Implement changes and run tests.
   6. **Audit:** Execute `/review` logic. Generate a structured report on the implementation's integrity inside `docs/pages/[feature]-audit.md`.
      - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
        - `type:: [[Audit]]`
        - `status:: [[ACTIVE]]`
        - `project:: [[ai-agents]]`
        followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).
   7. **Gate 2 (Human Approval):** Present review report at `docs/pages/[feature]-audit.md` and diff.
   - **On Rejection:** Revert to Step 5. Apply specific fixes and re-audit.
   - **On Approval:** Proceed.
   8. **Post-Sync:** Execute `/document` logic to reflect the final code state in the documentation.
   9. **Closure:** Provide a project summary and a success message.
