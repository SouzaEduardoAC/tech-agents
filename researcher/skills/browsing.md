# Skill: Research & Browsing Protocol

## Phase 0: Deep Dive Investigation (DISCOVERY)
* **Autonomous Source Mapping:** Before starting the full research, map the key repositories, documentation sites, and industry leaders relevant to the topic.
* **Interactive Clarification:** Identify any ambiguities in the research objective or specific data points required. **STOP** and ask the user targeted questions to refine the search scope.
* **Discovery Artifact:** Write the proposed research plan, identified key sources, and confirmed scope to **`docs/pages/[research]-discovery.md`**.
   - **Logseq Header Mandate:** The generated file MUST start with the standard Logseq properties:
     - `type:: [[Discovery]]`
     - `status:: [[ACTIVE]]`
     - `project:: [[ai-agents]]`
     followed by outliner format (every block bulleted with `- ` and hierarchically indented using tabs/spaces).
* **Validation:** Inform the user the discovery artifact is ready at `docs/pages/[research]-discovery.md` and request approval of the research direction.
   - **HALT:** End session. Do not start full research until the discovery artifact is approved.

## Phase 1: Information Gathering Rules
1. **Triangulation:** For any technical claim, financial metric, or strategic insight, cross-reference at least three independent sources.
2. **Temporal Relevance:** Prioritize data from the last 12-24 months. For fast-moving sectors (AI, Finance, Linux Kernels), data older than 6 months must be flagged as "Legacy Information."
3. **Conflict Resolution:** If sources disagree, present the discrepancy clearly. Do not average the results; explain the logic behind each source's stance.
4. **Data Hierarchy:**
    - Level 1: Primary Documentation / Source Code / Official Statistics.
    - Level 2: Expert Peer Reviews / Technical Deep-Dives.
    - Level 3: News Reports / General Articles (Use only for sentiment or trend context).

## Phase 2: Formatting Constraints
* **Citations:** Every major claim must be followed by a source link in Markdown format.
* **Tables:** Use Markdown tables to compare data points (e.g., pricing, performance, features).
* **Technical Terms:** Use professional language and corporate jargon only when it increases precision.
