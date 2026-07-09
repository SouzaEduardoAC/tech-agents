# Skill: Pull Request Review Protocol (Cross-Platform)

This is the shared protocol for performing code reviews against pull requests from **GitHub**, **GitLab**, and **Azure DevOps**. It is extended by agent-specific reviewer skills.

---

## Prerequisites: Execution Context

> **Recommended:** Run this command from **your project's root directory** whenever possible.
> This allows your AI client to automatically load the project's context files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) into session context, enabling project-specific guardrails, documentation awareness, and supplementary stack hints during the review.
>
> If you are running the review outside a project directory, stack detection will rely entirely on Phase 0.4 (diff-based detection) and project-specific context will not be available.

---

## Phase 0: Platform Detection & Diff Acquisition

### Step 0.1 — Detect Platform from PR URL

Parse the `{{args}}` value (expected: a PR/MR URL or ID + optional repo context) and identify the platform:

| Pattern | Platform |
|---|---|
| `github.com/{owner}/{repo}/pull/{id}` | GitHub |
| `gitlab.com/{...}/-/merge_requests/{id}` | GitLab |
| `dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}` | Azure DevOps |
| `{org}.visualstudio.com/{project}/_git/{repo}/pullrequest/{id}` | Azure DevOps |

If the URL matches none of the above patterns, **STOP** and ask the user to provide the full PR URL and confirm the platform.

### Step 0.2 — Acquire the Diff

**MCP-First Strategy (preferred):**
Check if an MCP tool for the target platform is connected (e.g., `github`, `gitlab`, `azure-devops`, or generic `fetch`/`http`):

- **If GitHub MCP (`github` tool) is available:**
  - Use `get_pull_request` (or equivalent) to retrieve PR metadata: title, description, author, base/head branch.
  - Use `get_pull_request_files` (or equivalent) to retrieve the list of changed files and their diffs.

- **If GitLab MCP (`gitlab` tool) is available:**
  - Use the equivalent MR metadata and diff endpoints.

- **If a generic HTTP/fetch MCP is available:**
  - Construct the appropriate REST API URL for the platform and fetch the diff payload.
  - GitHub: `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`
  - GitLab: `GET /projects/{id}/merge_requests/{iid}/changes`
  - Azure DevOps: `GET /{org}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/changes`

**Fallback (no MCP available):**
If no usable MCP or network tool is available, **STOP** and instruct the user:
```
No network/MCP tools are available to fetch the PR diff automatically.
Please provide the diff content by running one of the following and pasting the output here:

  # GitHub CLI
  gh pr diff {PR_NUMBER} --repo {OWNER/REPO}

  # GitLab CLI
  glab mr diff {MR_IID} --repo {NAMESPACE/PROJECT}

  # Azure DevOps CLI
  az repos pr show --id {PR_ID}  # then fetch changes via API or UI
  
  # Or: Export a unified diff from the PR UI and paste it directly.
```

### Step 0.3 — Build the Review Context

After acquiring the diff, structure the working context:
- **PR Metadata:** Title, description, author, target branch, labels/tags.
- **Changed Files:** List of all modified files with their diff hunks.
- **PR Size Signal:** Count total lines changed (added + deleted). Flag if > 500 lines (large PR — recommend breaking it up).

### Step 0.4 — Tech Stack Detection from Diff

After building the review context, scan the list of **changed file extensions and config filenames** to identify the primary language(s) and framework(s). Only detect stacks that fall within your agent's domain — do not load out-of-scope references.

| File Extension / Config Marker | Detected Stack | Reference File |
|---|---|---|
| `.cs`, `.csproj`, `.sln`, `global.json` | .NET (C#) | `common/stacks/dotnet.md` |
| `.java`, `pom.xml`, `build.gradle`, `build.gradle.kts` | Java / Spring Boot | `common/stacks/java.md` |
| `.go`, `go.mod`, `go.sum` | Go | `common/stacks/go.md` |
| `.dart`, `pubspec.yaml` | Flutter / Dart | `common/stacks/flutter.md` |
| `.tsx`, `.jsx`, or `package.json` containing `"react"` | React | `common/stacks/react.md` |
| `angular.json`, `nx.json`, `*.component.ts` | Angular | `common/stacks/angular.md` |
| `.vue`, `vue.config.js` | Vue | `common/stacks/vue.md` |
| `.ts`, `tsconfig.json` | TypeScript | `common/stacks/typescript.md` |
| `.js`, `.mjs`, `.cjs` | JavaScript | `common/stacks/javascript.md` |

**Self-Load Mandate — execute before Phase 1:**
- **Single stack detected:** Call `view_file` on the matching `common/stacks/<stack>.md` and internalize its guardrails. Apply them throughout Phase 2 as a Hard Guardrail layer on top of your domain-specific audit.
- **Multiple stacks detected (e.g., monorepo PR):** Output a brief manifest listing each detected stack and its reference file. Read each file in sequence. In Phase 2, apply the relevant stack guardrails per file, clearly attributing which stack rule each finding belongs to.
- **No known stack detected:** Note `Stack: Unknown / Unrecognized` in the Review Report header and proceed with generic best practices only. Do not block the review.

---

## Phase 1: Pre-Review Checklist

Before diving into the diff, evaluate these structural signals:

- [ ] **PR Description Quality:** Does it explain *what* changed and *why*? If not, note it as a finding.
- [ ] **Scope Containment:** Does the PR address a single concern? Flag scope creep.
- [ ] **Target Branch Sanity:** Is the base branch correct (feature → main, hotfix → main/develop)?
- [ ] **Linked Issue/Ticket:** Is there a reference to a task, story, or bug ID?
- [ ] **Breaking Change Declaration:** If the change is breaking, is it clearly flagged in the PR title/description?
- [ ] **Conventional Commit Compliance:** Verify the PR title strictly matches the `<type>(<scope>): <description>` convention (scope is mandatory).

---

## Phase 2: Diff Review (Agent-Specific Extension Point)

This phase is **extended by the calling agent's own `reviewer.md`** skill AND by the **Tech Stack Knowledge** loaded in Phase 0.4. Apply both the domain-specific checklist and the loaded stack guardrails to every changed file in the diff.

For each file in the diff:
1. Identify the file type, domain role, and which detected stack it belongs to.
2. Apply the relevant agent-specific checks (from `reviewer.md`).
3. Apply the **Stack Guardrails** from the `common/stacks/*.md` file loaded in Phase 0.4. Violations of Hard Guardrails (marked NEVER/Forbidden in the stack reference) are automatically elevated to 🔴 Critical or 🟠 High severity.
4. Note any finding with: **File path**, **Line number (if available)**, **Severity** (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low / 🔵 Info), **Stack Reference** (e.g., `[.NET §4 — EF Core]`), and **Description + Recommendation**.

---

## Phase 3: Structured Review Report

Produce the final review in the following format:

```markdown
## PR Review Report

**PR:** [Title] — [URL]
**Platform:** [GitHub | GitLab | Azure DevOps]
**Author:** [author]
**Base Branch:** [base] ← [head]
**Files Changed:** [N] | **Lines:** +[added] / -[deleted]

---

### 🟥 Critical Findings
(Items that MUST be addressed before merge. Potential security vulnerabilities, data loss, broken contracts.)

- `[file:line]` — Description. **Recommendation:** ...

### 🟧 High Findings
(Significant bugs, performance degradation, or major pattern violations.)

### 🟨 Medium Findings
(Code quality issues, missing tests, minor pattern drift.)

### 🟩 Low / Info Findings
(Style, naming, minor suggestions. No blocking impact.)

---

### ✅ Strengths
What the PR does well.

### 📋 Pre-Merge Checklist
- [ ] All critical and high findings resolved.
- [ ] Tests added/updated for changed logic.
- [ ] Documentation updated if public API changed.
- [ ] PR description updated to reflect any scope changes.

### 🔁 Verdict
**[ APPROVE | REQUEST CHANGES | NEEDS DISCUSSION ]**
Brief rationale.
```

---

## Cross-Client Resilient Execution Rules

- **No MCP + No Diff:** If neither MCP tools nor a pasted diff are available, provide the CLI fetch commands (see Phase 0.2 fallback) and HALT until the user supplies the diff.
- **Partial Diff:** If only a subset of files is available, scope the review explicitly and note what was not reviewed.
- **Large PR (>500 lines):** Review all files but add a top-level recommendation to split the PR.
