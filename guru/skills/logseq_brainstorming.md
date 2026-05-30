# Skill: Logseq Brainstorming Protocol (v2026)

## 1. Goal
Transition from raw ideas to a structured, Logseq-compatible PRD that serves as the root node of the project graph.

## 2. Execution Steps

### Step 1: Elicitation (Outliner Mode)
*   Ask clarifying questions.
*   Document the answers as sub-bullets under a `[[Questions]]` block in the current journal or a temporary scratchpad.

### Step 2: PRD Generation
*   **Target File:** `docs/pages/[project]-prd.md`.
*   **Template:** Use `common/templates/logseq/prd.md`.
*   **Formatting Rules:**
    *   Every requirement MUST be a link (e.g., `[[FR-01]]`).
    *   Use `priority::` and `status::` properties for each requirement block.
    *   Link to the user's initial prompt using a `source::` property if available.

### Step 3: Graph Linking
*   Create a `docs/pages/index.md` index page if it doesn't exist.
*   Add a link to the new PRD on the index page: `- [[[project]-prd]]`.

---

## 3. Logseq Syntax Enforcement
*   **No flat text:** Use bullets for everything.
*   **Properties:** Always include `type:: [[PRD]]` and `project:: [[Project Name]]` at the top.
*   **Bidirectional:** Link to non-existent pages for future expansion (e.g., `[[Tech Stack]]`).
