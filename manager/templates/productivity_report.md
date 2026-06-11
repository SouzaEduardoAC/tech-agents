# Productivity Audit Report

**Audit Target:** `[Board Name/URL & Git Repository]`
**Date of Audit:** `[YYYY-MM-DD]`
**Scope:** `[Target team members, date range]`

---

## 1. Executive Summary
`[Provide a high-level summary of the team's operational health, highlight overall board-to-git alignment, and identify the most significant process bottlenecks discovered.]`

---

## 2. Telemetry & Correlation Matrix

| Developer / Handle | Board Tasks (Done) | PRs Merged | Linked Cards (%) | PR Comment Density | Avg Cycle Time (PR) | Rework Index |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `[Handle 1]` | `[Count]` | `[Count]` | `[XX%]` | `[Low/Med/High]` | `[X.X days]` | `[Low/Med/High]` |
| `[Handle 2]` | `[Count]` | `[Count]` | `[XX%]` | `[Low/Med/High]` | `[X.X days]` | `[Low/Med/High]` |

---

## 3. Workflow Friction & Bottleneck Analysis
`[Detail specific observations of process friction, grouping them by severity.]`

### 🔴 Critical Severity Friction
- **Observation:** `[Describe the friction pattern. E.g. "High PR feedback loop ping-pong on Repo X"]`
- **Telemetry Evidence:** `[List comment counts, cycle times, PR IDs, or card references.]`
- **Downstream Consequence:** `[What is the impact? E.g., delayed releases, developer burnout.]`

### 🟡 High Severity Friction
- **Observation:** `[E.g., Ghost work or unlinked commits]`
- **Telemetry Evidence:** `[List specific unlinked commits/PRs.]`
- **Downstream Consequence:** `[E.g., Lack of traceability, audit compliance failures.]`

### 🟢 Medium/Low Severity Friction
- **Observation:** `[E.g. Minor rework post feature completion]`
- **Telemetry Evidence:** `[List details.]`
- **Downstream Consequence:** `[List impact.]`

---

## 4. Key Process Recommendations
`[Provide concrete, actionable steps to improve velocity and reduce friction.]`

1. **`[Recommendation 1 Title]`**
   - **Rationale:** `[Why this recommendation is necessary based on telemetry findings.]`
   - **Action Item:** `[Specific steps to implement, e.g., "Implement git-commit-lint hooks for Jira IDs."]`
2. **`[Recommendation 2 Title]`**
   - **Rationale:** `[Details]`
   - **Action Item:** `[Details]`
