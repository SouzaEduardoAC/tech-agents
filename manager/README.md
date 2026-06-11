# Agent: Manager (`manager`)

**Manager** is a specialized management and metrics orchestration agent in the Universal Agent Hub. It is designed to assist engineering leads, scrum masters, and product managers by analyzing development processes, identifying execution bottlenecks, and cross-referencing activity boards with git repositories to evaluate team velocity and productivity.

## 🛠 Command Library

### 1. `/manager:productivity` (Productivity Audit)
- **Objective:** Performs a deep correlation audit between activity boards (Jira, GitHub, GitLab, Azure Boards, Trello) and actual coding contributions in git repositories (Pull Requests, commits, code reviews).
- **Workflow:** 
  1. **Source Discovery & Input Elicitation:** Acquires the target Board URL/location and Git Project/Repository identifier. If not supplied in the input arguments, the agent will prompt the user to provide them.
  2. **Board Activity Scan:** Scrapes or retrieves recent card assignments, state transition speeds, cycle times, and discussion comments.
  3. **Git Repository Scan:** Analyzes PR history, commit frequencies, code review comments, and rework/churn cycles.
  4. **Correlation Synthesis:** Crosschecks whether board tasks are linked to git commits, checks for post-feature bug/fix loops, identifies PR back-and-forth loops, and measures actual rework density.
  5. **Report Generation:** Produces a structured report highlighting productivity bottlenecks and actionable workflow improvements.

## 📁 Structure
```
manager/
├── README.md                 # Technical user guide and command library
├── brain/
│   └── persona.md            # Core cognitive identity, rules, and style
├── commands/
│   └── manager/
│       └── productivity.toml # Executable TOML command for productivity
├── knowledge/
│   └── productivity_indicators.md  # Factual benchmarks and metrics guidance
└── skills/
    └── productivity_audit.md       # Step-by-step operational workflows
```
