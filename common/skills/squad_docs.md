# Skill: Squad Documentation Protocol (v2026 - High-Fidelity & Deep-Dive)

This skill governs the execution of all `squad-docs` commands across specialized agents. It mandates a shift from summary-level indexing to use-case-by-use-case and component-by-component deep specification.

---

## 1. The Core Mandates

1.  **Zero-Summary Rule:** A single summary file (e.g. `BUSINESS_FLOW.md` or `TECHNICAL_SPECS.md`) is only an **index** of links pointing to detailed documentation pages. Writing a single summary block containing multiple entities is strictly prohibited.
2.  **No Boilerplate/Stubs:** If a section of a template is generated, it MUST contain concrete, production-grade technical or business specifications mapped from the codebase. If the information is genuinely missing in the code, mark it as `TODO` with specific questions for the developer/user, never leave it blank or delete it.
3.  **AST Citation Enforcement:** Every technical claim, data model field mapping, or endpoint definition MUST contain a precise codebase reference symbol: `(ref: code_symbol)` (e.g., class, controller method, decorator, database model instance).

---

## 2. The 3-Step Execution Protocol

### Step 1: Forensic Manifest Generation (The Discovery Phase)
Before writing any documentation page, the agent **MUST** perform a directory/code crawl to identify and list all target entities of its domain in the active workspace.
- **Product Owner / Decoder:** Enumerate all distinct business use cases, flows, or user journeys.
- **Architect / Backend / Mobile:** Enumerate all API controllers, routes, methods, data schemas/models, and service classes.
- **Frontend:** Enumerate all page routes, page controllers, complex UI components, and state management stores.
- **Researcher:** Enumerate all external/third-party integrations, SaaS dependencies, and AI/ML model interfaces.

*Output:* The agent must print a structured Markdown manifest (e.g., "Found 4 business flows and 6 endpoints") in the terminal/log output before proceeding.

### Step 2: Per-Entity Iteration Loop (The Generation Phase)
For EACH entity identified in the manifest, the agent **MUST** execute a separate file-generation step:
1.  Read the relevant codebase files (controllers, services, entities, tests) to understand the implementation.
2.  Dynamically resolve the correct template from `common/templates/logseq/`:
    - Business flows → `business_flow_page.md`
    - API endpoints / methods → `technical_endpoint.md`
    - Data schemas / models → `technical_data_model.md`
3.  Generate the dedicated Logseq page in the workspace's `docs/pages/` folder. The file name must match the entity slug (e.g., `docs/pages/[entity-name-slug].md`).
4.  Write the properties block first (mandatory: `type::`, `category::`, `status:: [[ACTIVE]]`, `project:: [[tech-agents]]`).
5.  Populate every single template section with high-fidelity, codebase-grounded facts.

### Step 3: Linkage & Index Reconstruction (The Integration Phase)
1.  Update the domain's main index page (e.g. `docs/pages/BUSINESS_FLOW.md` or `docs/pages/TECHNICAL_SPECS.md`).
2.  Add bulleted outliner links pointing to each of the newly created dedicated entity pages, mapping them to their statuses.
3.  Ensure all generated files are registered in `docs/pages/registry.md` under the correct feature blocks.
4.  Verify all new links in the Logseq outliner format are valid and do not leave ghost pages.

---

## 3. Dialectical Integrity

Every generated page must conclude with a mandatory **Dialectical Critique** block:
-   **Yellow Hat (Resilience):** How does the implementation handle errors, network cuts, database lockouts, or validations?
-   **Black Hat (Risks):** Where is the performance bottleneck? Are there security vulnerabilities (lack of auth/input validation)? Is there technical debt?
-   **Blind Spots:** What does the codebase assume that is not checked? What downstream side-effects are ignored?
