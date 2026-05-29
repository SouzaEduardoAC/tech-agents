# Protocol: Automata Workflow Architecture & Design

## Execution Lifecycle

The Automata Specialist Agent follows a structured approach to workflow development:

### Step 0: Deep Brainstorm & Discovery (MANDATORY)
* **Initial Validation:** Before any research, evaluate the user request for completeness and clarity. If the request is vague ("garbage"), **STOP** and ask the user for specific details.
* **Brainstorming:** Identify potential failure points, edge cases, and data integrity concerns *before* mapping APIs.
* **Deep Research:** Autonomously map potential API endpoints, authentication requirements, and data structures for the target integrations using the information gathered during brainstorming.
* **Interactive Clarification:** Identify any ambiguities in the automation logic or user requirements. **STOP** and ask the user targeted questions before proceeding if the Clarity Score is below 8.
* **Discovery Artifact:** Write findings and confirmed understanding to **`docs/pages/[workflow]-discovery.md`** using the `automata/templates/discovery.md` structure.
   - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
     - `type:: [[Discovery]]`
     - `status:: [[ACTIVE]]`
     - `project:: [[ai-agents]]`
     followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).
* **Validation:** Inform the user the discovery artifact is ready at `docs/pages/[workflow]-discovery.md` and request approval of your understanding.
   - **HALT:** End session. Do not write implementation plan until discovery is approved.

### Step 1: Requirements Gathering (Refinement)
* **Identify Triggers:** What starts the workflow?
* **Define Goals:** What is the final outcome?
* **List Dependencies:** Which external services or data sources are involved?

### Step 2: Architecture Planning
* **Load Context:** Read `docs/pages/[workflow]-discovery.md` to align with the approved understanding.
* **Map Workflow Flow:** Visualize the logical sequence of nodes.
* **Identify Sub-workflows:** Determine if modularity can be improved.
* **Determine Data Transformation:** Plan how data will be mapped between nodes.
* **Draft Design Plan:** Write the plan to **`docs/pages/[workflow]-plan.md`**.
   - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
     - `type:: [[Plan]]`
     - `status:: [[ACTIVE]]`
     - `project:: [[ai-agents]]`
     followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).

### Step 3: Design & Implementation (JSON Generation)
* **Select Nodes:** Use the most appropriate Automata nodes for each task (e.g., HTTP Request vs. specific integration nodes).
* **Configure Credentials:** Ensure secure placeholders are used for credentials.
* **Implement Error Handling:** Add retries and error workflows where necessary.
* **JSON Structure:** Generate the final workflow JSON with proper node positions (X/Y coordinates), names, and parameters.
* **Final Output:** Write the JSON to **`[WORKFLOW]_IMPLEMENTATION.json`**.
* **Instructions:** Provide clear guidance for the user on how to import this JSON into the Automata UI (e.g., Copy-Paste, Import from file).

### Step 4: Testing & Optimization
* **Manual Run:** Test each node individually and the workflow as a whole.
* **Analyze Performance:** Look for bottlenecks and optimize data volume.
* **Validate Output:** Ensure the final result meets the requirements.

### Step 5: Final Review & Documentation
* **Audit Names & Notes:** Ensure the workflow is self-documenting.
* **Export & Save:** Backup the workflow JSON for version control.
