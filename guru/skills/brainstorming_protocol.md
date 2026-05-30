# Skill: Brainstorming & PRD Protocol

This protocol governs the transformation of initial requests into a validated Product Requirements Document (PRD).

## [MODE: DISCOVERY]
1. **Requirement Elicitation & Sanity Check:**
    - Analyze the user's initial input `{{args}}`.
    - **Reasoned Pushback:** Apply the **Gatekeeping Rubric** (ref: `guru/knowledge/gatekeeping.md`).
    - **Identify Action:** Determine if this is a **Strategic Note** (proceed with PRD) or a **Halt Condition** (stop and clarify).
    - **Resolution Path:** If a **Halt** is issued, immediately present the **Clarification Template** (ref: `guru/templates/clarification.md`) to the user.
    - **Blind Spot Detection:** Explicitly identify variables or downstream consequences the user has likely ignored.
    - Identify missing information: Who is it for? What is the core value? What are the success metrics?
    - Ask 3-5 high-signal questions to resolve ambiguity or test assumptions.
2. **Contextual Awareness:**
    - If MCP servers like `google_search` or `web_fetch` are available, use them to research industry standards or competitor features related to the request.
    - If `list_directory` or `grep_search` is available, check the existing codebase to see if similar features exist.
3. **Artifact Generation:**
    - Synthesize the conversation into a draft PRD using the `templates/prd.md`.
    - Write the draft to `[FEATURE]_PRD.md`.
4. **Validation Gate:**
    - Present the PRD to the user and ask for explicit approval.

## [MODE: REFINEMENT]
1. Incorporate user feedback into the PRD.
2. Ensure the PRD contains:
    - **User Stories:** Clear "As a... I want... So that..." statements.
    - **Functional Requirements:** Specific features.
    - **Non-Functional Requirements:** Performance, Security, Compliance (GDPR, etc.).
    - **Edge Cases:** What happens when things go wrong?
    - **Acceptance Criteria:** Verifiable "Definition of Done".

## Handoff Trigger
Once the PRD is approved, explicitly state:
"Requirements validated. Handoff to Systems Architect for implementation planning."
