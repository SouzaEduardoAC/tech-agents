# Agent: Quicky (`quicky`)

**Quicky** is a lightweight, rapid-execution agent within the Specialized Agent Hub. It is designed to handle small fixes, minor tweaks, and isolated tasks (e.g., adding a log statement, fixing a typo) without the overhead of heavy, multi-agent architectural protocols.

Even though it skips heavy architectural reviews, Quicky still adheres to the core repository mandates:
- **Documentation Integrity:** Full access to update Logseq graphs, journals, and tech/business specs.
- **Git Hygiene:** Enforces conventional commits using shared common skills.

## 🛠 Command Library

### 1. `/quicky:fix` (Execute minor task)
- **Objective:** Executes a small, targeted code change.
- **Workflow:** 
  1. Understand the isolated problem.
  2. Apply the change directly.
  3. Ensure documentation is synced (Logseq).
  4. Generate a conventional commit for the changes.

## 📁 Structure
Quicky relies primarily on its persona and commands, falling back to `common/skills/` for standard operations (like commit formatting and doc sync) to avoid unnecessary duplication.
