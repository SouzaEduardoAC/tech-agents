# Knowledge: Productivity Indicators & Benchmarks (v2026)

This document provides metrics standards, behavioral patterns, and evaluation heuristics to guide the Manager agent in determining developer workflow health and team productivity.

---

## 1. Board vs. Git Correlation Indicators
A healthy agile workflow is characterized by tight coupling between planning tools (boards) and execution tools (repositories).

### 1.1 Card-to-PR Linkage
- **Pattern:** Every active feature, task, or bug card on the board must link to one or more PRs or commits.
- **Healthy Metric:** > 90% of board cards in "Done" or "In Review" have explicitly linked PRs.
- **Mismatch Indicator (Ghost Work):** Many PRs are merged without an associated board card. This indicates untracked scope creep, undocumented requirements, or planning overhead.
- **Mismatch Indicator (Paper Tasks):** Board cards are moved to "Done" without any code changes or commits. This suggests tasks are either too administrative, represent phantom progress, or work was done under a different task name.

### 1.2 Post-Release Bug Bindings (Rework Churn)
- **Pattern:** When a card is marked "Done", it should remain closed. Immediately opening new "Fix" or "Refactor" cards that reference the original card suggests premature completion.
- **Indicators of Friction:**
  - A feature card is marked "Done", and within 72 hours, a bug card is created referencing that feature.
  - High volume of commits with messages like "fix", "typo", "cleanup", or "patch" following a major merge.

---

## 2. Code Review & PR Friction Indicators
Code reviews are essential for quality, but excessive cycles signal friction.

### 2.1 PR Comment Density & Back-and-Forth Loops
- **PR Comment Density:** Total number of comments on a PR divided by the number of changed files.
- **Back-and-Forth Loop (Ping-Pong):** Multiple review iterations where a reviewer requests changes, the developer pushes updates, the reviewer requests more changes, and so on.
- **Evaluation Heuristics:**
  - **Healthy:** 1 to 2 review cycles, < 5 comments per PR. Discussions focus on minor details or architectural alignment.
  - **Friction (Process Gatekeeping):** > 4 review cycles, > 15 comments. Discussions drag on for days over stylistic details, indicating missing style guidelines or nitpicking.
  - **Friction (Misalignment):** High comment volume focusing on "how it works" or "missing requirements", indicating that specifications were unclear, or that the developer didn't understand the goal.

### 2.2 PR Relevance & Contribution Type
Not all lines of code are equal. The agent must evaluate the nature of changes:
- **High Relevance/Impact:** Core business logic modifications, database migrations, security implementation, or new component creation.
- **Medium Relevance/Impact:** Refactoring, test additions, CSS styling changes, or package updates.
- **Low Relevance/Impact:** Documentation/Markdown changes, comment additions, format adjustments, or build configuration tweaks.
- **Friction Signal:** A team member shows a high volume of PRs but the content is exclusively low relevance, indicating "activity padding" without core feature progress.

---

## 3. Recommended Remediation Patterns
When workflow friction is identified, the agent should recommend process-level solutions instead of individual coaching:
- **High PR comment density due to style/formatting:** Recommend automated linting and formatting pre-commit hooks.
- **High PR comment density due to requirements misalignment:** Recommend PO-developer sync-ups (Three Amigos meetings) before starting work.
- **Card-to-PR mismatch (Ghost work):** Recommend enforcing board ID checks via Git branch naming conventions or commit message hooks.
- **High post-release bug rates:** Recommend increasing unit test coverage requirements or setting up a peer review mandate for critical feature paths.
