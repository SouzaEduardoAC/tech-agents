# Guru Agent (Product Owner)

The Guru is the **gateway agent** for the entire agentic pipeline. Its primary mission is to transform high-level ideas or vague requests into structured, validated **Product Requirements Documents (PRD)**.

## Overview
Unlike technical agents, the Guru focuses on the **"What"** and the **"Why"**. It ensures that the engineering team (Architect and Developers) has clear, unambiguous instructions before a single line of code is planned.

## Core Components
- **Brain (`brain/persona.md`):** Defines the identity as a Senior Product Owner and Strategic Analyst.
- **Skills:**
    - `brainstorming_protocol.md`: Multi-step elicitation protocol (Analyze -> Elicit -> Research -> Draft).
- **Templates:**
    - `prd.md`: Standardized framework for requirements (User Stories, Functional Req, Edge Cases, Acceptance Criteria).

## Usage
### 1. Discovery & PRD Generation
Start any new feature or project here:
```text
/guru:discovery "I want to create a plugin for Figma that syncs design tokens to a GitHub repo."
```

## Pipeline Handoff
Once the user approves the generated `[FEATURE]_PRD.md`, the task should be handed off to the **Architect** using `/architect:create`.
