- type:: [[AcceptanceReport]]
- status:: [[ACTIVE]]
- project:: [[tech-agents]]
- verified_by:: [[Product Owner]]

# Product Acceptance Report: {{args}}

## 1. Executive Summary
- **Target Feature:** `{{args}}`
- **Reference PRD:** [[{{args}}-prd]]
- **Reference Architecture:** [[{{args}}-architecture]]
- **Overall Verdict:** `[ACCEPT | REJECT]`
- **Acceptance Summary:** [Brief 2-3 sentence overview of findings and business alignment]

---

## 2. Acceptance Criteria Verification Matrix
Confrontation of all Gherkin Given-When-Then criteria defined in the PRD against the actual implementation:

| Requirement ID | Scenario / Criteria | Verification Method | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[[FR-01]]** | Given [State], When [Action], Then [Result] | [Unit Test / API / Code] | `[PASS / FAIL / PARTIAL]` | [File / Test reference] |
| **[[FR-02]]** | Given [State], When [Action], Then [Result] | [Unit Test / API / Code] | `[PASS / FAIL / PARTIAL]` | [File / Test reference] |

---

## 3. MoSCoW Scope Fulfillment
- **Must Have:** [ ] 100% Implemented & Verified | [ ] Incomplete
  - *Details:* [Notes on Must-Have requirements]
- **Should Have:** [ ] 100% Implemented | [ ] Deferred / Partial
  - *Details:* [Notes on Should-Have requirements]
- **Could Have:** [ ] Implemented | [ ] Deferred
  - *Details:* [Notes on optional scope]
- **Won't Have:** [ ] Excluded as planned | [ ] Scope creep detected

---

## 4. Edge Cases & Boundary Handling
Review of Section 7 edge cases from the PRD:
- **[[EC-01]] [Edge Case Title]:** `[VERIFIED / UNHANDLED]` — [Findings on fallback/error handling]
- **[[EC-02]] [Edge Case Title]:** `[VERIFIED / UNHANDLED]` — [Findings on fallback/error handling]

---

## 5. Non-Functional & Behavioral Check
- **User Experience / Workflow Flow:** [Smooth, adheres to persona expectations]
- **API / Data Contract Integrity:** [Matches expected payload schemas]
- **Security & Permissions:** [Role checks and access controls respected]

---

## 6. Remediation Backlog (Required if Verdict is REJECT)
If any criteria failed or scope gaps were identified, specify the exact action items for Developer (Phase 4):
1. **[Issue 1]:** [Description, affected file/module, required fix]
2. **[Issue 2]:** [Description, affected file/module, required fix]

---

## 7. Sign-off & Next Steps
- **Verdict:** `[ACCEPT / REJECT]`
- **Recommended Action:** [Advance to Gate 'acceptance' / Revert to Developer Phase 4 for remediation]
