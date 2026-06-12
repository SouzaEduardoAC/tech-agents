# Productivity Audit Report

**Audit Target:** `[Board Name/URL & Git Repository]`
**Date of Audit:** `[YYYY-MM-DD]`
**Scope:** `[Target team members, date range]`

---

## 1. Executive Summary
`[Provide a high-level summary of the team's operational health, highlight overall board-to-git alignment, and identify the most significant process bottlenecks discovered.]`

---

## 2. Telemetry & Correlation Matrix

| Developer / Handle | Board Tasks (Done) | Avg Cycle Time (Board Tasks) | PRs Merged | Traceability (%) | PR Comment Density | Avg Cycle Time (PR) | Rework & Churn Index |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `[Developer 1]` | `[Count]` | `[X.X days]` | `[Count]` | `[XX%]` | `[Low/Med/High]` | `[X.X days]` | `[Low/Med/High]` |
| `[Developer 2]` | `[Count]` | `[X.X days]` | `[Count]` | `[XX%]` | `[Low/Med/High]` | `[X.X days]` | `[Low/Med/High]` |

> [!NOTE]
> **Traceability (%)** represents the percentage of completed cards that link directly to a git branch, commit, or PR.
> **Rework & Churn Index** measures post-completion bug fix commits and recurring review iterations.

---

## 3. Work Classification & Contribution Profiles
`[Analyze the type of work handled by each developer to provide appropriate context for their activity metrics. Categorize contributions into: Architectural Changes, Core Integrations, Automations/CI-CD, Refactoring, or Small Fixes.]`

| Developer / Handle | Primary Work Focus | Work Type Distribution (%) | Heuristic & Velocity Context |
| :--- | :--- | :---: | :--- |
| `[Developer 1]` | `[e.g., Core Integrations & Architecture]` | `[Arch: XX%, Integrations: XX%, Fixes: XX%]` | `[e.g., Complex, high-risk changes; expect longer cycle times and higher review loops.]` |
| `[Developer 2]` | `[e.g., Small Fixes & Automations]` | `[Fixes: XX%, Automations: XX%, Refactor: XX%]` | `[e.g., Rapid, low-risk changes; expect short cycle times and minimal review loops.]` |

> [!TIP]
> Use this classification to avoid comparing raw velocity metrics (like cycle time) between developers handling major architectural refactoring and those doing minor documentation or bug fixes.

---

## 4. Developer Collaboration & Workload Friction Analysis
`[Detail specific observations of process friction affecting team member velocity, collaboration, and context-switching.]`

### 🔴 Context-Switching & Workload Overload
- **Observation:** `[Describe patterns where developers are stretched thin. E.g. "Dev A is handling >70% of PR reviews while juggling 3 active feature branches."]`
- **Telemetry Evidence:** `[PR review counts, open branches per person, comment volume, or cycle times.]`
- **Impact on People:** `[Cognitive overload, review delays, increased probability of shipping bugs.]`

### 🟡 Review Loop Ping-Pong & Communication Drag
- **Observation:** `[E.g. High review cycles or nit-picking patterns that slow down the merge process.]`
- **Telemetry Evidence:** `[Specific PR IDs with >10 comments or >3 change requests.]`
- **Impact on People:** `[Frustration, loss of feature momentum, disconnect between author and reviewer.]`

### 🟢 Scope Creep & Ghost Work Roadblocks
- **Observation:** `[E.g. Developers executing work that is not tracked on the board, leading to hidden effort.]`
- **Telemetry Evidence:** `[Unlinked commits or PRs matching developer handles.]`
- **Impact on People:** `[Lack of visibility for their contributions, misaligned sprint capacity planning.]`

---

## 5. Offloading Repetitive Work & Human-Agent Collaboration
`[Identify opportunities where specialized AI agents can automate routine tasks, allowing developers to focus on core engineering and deep creative work.]`

- **Opportunity to Offload:** `[E.g., Automating style reviews, nit-picking comments, or test generation.]`
- **Target Agent & Skill:** `[E.g., "Deploy Frontend/Backend reviewers to handle styling/lint checks to reduce human review cycles."]`
- **Benefit to Team:** `[Frees up developers for architectural design; reduces PR cycle time and discussion friction.]`

---

## 6. Key Process Recommendations & Action Items

1. **`[Recommendation 1 Title]`**
   - **Rationale:** `[Why based on telemetry]`
   - **Action Item:** `[Actionable step, owner, target date]`
2. **`[Recommendation 2 Title]`**
   - **Rationale:** `[Why]`
   - **Action Item:** `[Actionable step]`
