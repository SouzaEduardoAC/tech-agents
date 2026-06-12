# Skill: Productivity Audit Protocol (v2026)

This protocol defines the step-by-step procedure for analyzing team member productivity, correlating workflow board states with version control records, and reporting operational friction points.

---

## Phase 1: Source Discovery & Input Elicitation
Before starting the audit, you must verify access credentials, active toolsets, and input parameters:
1.  **Extract Arguments:** Read target arguments to identify the target Board URL, Git Repository, and list of target team members.
2.  **Verify Location Parameters:**
    - **Board Location:** Must be a valid URL or named board space (e.g., Jira board key, GitHub project board URL, Azure DevOps board path).
    - **Git Project:** Must identify the repository or project space containing the codebase (e.g., org/repo).
3.  **Mandatory Prompt Fallback:**
    - If the Board URL or Git Repository path is missing or ambiguous, output a clear, friendly request asking the user to specify:
      - *The URL of the task board (e.g., Jira, Trello, Azure Boards, GitHub Projects)*
      - *The location/name of the Git repository or project*
      - *The team members' names or usernames (optional)*
4.  **Check Available CLI / MCP Tools:**
    - Check if you have connected MCP servers (GitHub, GitLab, Jira, etc.) or CLI binaries (`gh`, `az`, `git`).
    - If tools are active, prepare to query. If no integrations are found, fall back to **Phase 5 (Elicitation Fallback)**.

---

## Phase 2: Board Activity Extraction
If APIs/CLIs are available, execute the following scan on the project board:
1.  **Retrieve Cards:** List active, in-progress, and recently completed cards assigned to the target team members.
2.  **Track Transitions:** Extract timestamp histories for card status transitions (e.g., "To Do" to "In Progress", "In Review" to "Done").
3.  **Capture Board Comments:** Extract card comment histories to review the volume and tone of task-level communication.

---

## Phase 3: Git Activity Correlation
Scan the git repository records for the corresponding period:
1.  **Pull Requests (PRs) / Merge Requests (MRs):** Find all PRs/MRs opened, reviewed, or merged by the target team members.
2.  **Commit History:** Extract commits, checking files modified, changes count, and whether commit messages link to board card IDs.
3.  **PR Feedback Loop Metrics:**
    - **Comment Density:** Count reviews and comments on each PR.
    - **PR Cycle Time:** Time elapsed between PR creation and merge.
    - **Rework Iterations:** Check for multiple pushes/rework cycles after review comments or after the PR has been approved/merged.

---

## Phase 4: Synthesis & Correlation Analysis
Synthesize board activity and Git telemetry to identify the following correlation factors:
1.  **Card-to-Code Alignment:**
    - Verify if completed board cards have corresponding commits or PR references.
    - Identify "ghost work" (commits and PRs made without any corresponding board cards).
2.  **Rework & Bug Bindings:**
    - Check if new cards (e.g., "Bug Fix", "Rework") are bound to the original feature card post-implementation.
    - Measure if feature completion is immediately followed by a high rate of fix-up commits.
3.  **Communication & PR Friction:**
    - Look for "ping-pong" patterns: high comment frequency and long back-and-forth loops on PRs or board cards.
    - Calculate if the PR comments suggest architectural misunderstandings (many change requests) vs. standard code style reviews.
4.  **PR Relevance:**
    - Categorize PR contributions by size, scope, and impact (e.g., documentation changes, configuration tweaks, vs. core feature logic delivery).

---

## Phase 5: Elicitation Fallback (Manual Mode)
If active MCP servers or CLI environments are unavailable or lack permissions to scan the board/repo:
1.  **Activate Manual Interview:** Inform the user that direct API scanning is unavailable and pivot to interview mode.
2.  **Prompt for Core Telemetry:** Ask the user to provide representative data points, such as:
    - *Which cards have been stuck in "In Progress" or "In Review" longest?*
    - *How many pull requests are experiencing high comment counts or rework loops?*
    - *Are developers committing code directly without linking task IDs?*
3.  **Process User Data:** Analyze the provided manual inputs using the same evaluation heuristics as automated data.

---

## Phase 6: Reporting & Writing
Formulate the productivity report adhering to the templates and write it to the workspace root:
1.  **Select Template:** Use the default `manager/templates/productivity_report.md` template to structure the report.
2.  **Report Header Format:** Ensure the header of the report has the following fields on separate, individual lines:
    **Audit Target:** `[Board Name/URL & Git Repository]`
    **Date of Audit:** `[YYYY-MM-DD]`
    **Scope:** `[Target team members, date range]`
3.  **Synthesize Metrics:** Organize findings into structured Markdown comparison tables matching the template layout.
4.  **Outline Friction Areas:** Group detected friction by severity (Critical, High, Medium, Low) as defined in the template.
5.  **Formulate Structural Solutions:** Ensure every finding has a constructive, process-focused recommendation matching the template recommendations section.
6.  **Write Output File:** Write the synthesized markdown report to a file named `productivity_report.md` in the workspace root.
