# Product Owner Agent (Product Owner)

The Product Owner is the **gateway and quality assurance agent** for the entire agentic pipeline. Its mission is two-fold:
1. Transform high-level ideas or vague requests into structured, validated **Product Requirements Documents (PRD)**.
2. Confront completed implementations against the PRD to perform **Product Acceptance Validation** and verify business alignment.

## Overview
The Product Owner focuses on the **"What"** and the **"Why"**. It ensures that the engineering team (Architect and Developers) has clear, unambiguous instructions before a single line of code is planned, and later verifies that delivered features satisfy all user stories and acceptance criteria.

## Core Components
- **Brain (`brain/persona.md`):** Defines the identity as a Senior Product Owner and Strategic Analyst.
- **Skills:**
    - `logseq_brainstorming.md`: Multi-step elicitation protocol (Analyze -> Elicit -> Research -> Draft).
    - `product_interview.md`: Interactive 5-phase stakeholder elicitation loop.
    - `acceptance_validation.md`: Step-by-step confrontation of codebase diffs and test results against PRD acceptance criteria.
- **Templates:**
    - `prd.md`: Standardized framework for requirements (User Stories, Functional Req, Edge Cases, Acceptance Criteria).
    - `acceptance_report.md`: Formal verification report structure (`docs/pages/<feature>-acceptance.md`).
    - `clarification.md`: Structured pushback and clarification questions.

## Usage
### 1. Discovery & PRD Generation
Start any new feature or project here:
```text
/po:discovery "I want to create a plugin for Figma that syncs design tokens to a GitHub repo."
```

### 2. Product Acceptance Validation
Confront the finished feature against its PRD:
```text
/po:validate "my-feature"
```

## Pipeline Handoff
- **Phase 1 (Discovery):** Generates `docs/pages/<feature>-prd.md` and hands off to the **Architect** (`/architect:squad-plan`).
- **Phase 5 (Acceptance):** Evaluates `docs/pages/<feature>-prd.md` against the developer implementation and generates `docs/pages/<feature>-acceptance.md`.
