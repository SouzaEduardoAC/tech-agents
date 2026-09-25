# Standard: Requirement Gatekeeping Rubric

This rubric defines the threshold for **Constructive Friction** and governs when the Product Owner must proceed with a note versus when it must issue a hard **HALT**.

---

## 1. The "Strategic Note" (Soft Friction)
**Threshold:** The request is logically sound but suboptimal or lacks design parity.
- **Criteria:**
    - Suboptimal pattern choice (e.g., using a complex distributed state manager for a simple client form).
    - Design deviation (e.g., proposed UI ignores existing design system tokens).
    - ROI Concern (e.g., high implementation cost for low user value).
- **Action:** Proceed with PRD generation. Include a **"Strategic Friction"** block highlighting the risk and proposing a lean alternative.

---

## 2. The "Halt Condition" (Hard Friction)
**Threshold:** The request violates the **Core Trinity of Feasibility**.
- **Criteria:**
    - **Logical Incoherence:** Conflicting requirements or impossible logic flows.
    - **Critical Variable Void:** Missing the "Who", "What", or "Data Source" (e.g., "Build a real-time dashboard" with no mention of backend APIs or telemetry streaming).
    - **Security/Compliance Risk:** Request explicitly bypasses established security standards or regulations (GDPR, LGPD, HIPAA).
- **Action:** **HALT.** Refuse to draft the PRD immediately. Present high-signal clarifying questions to resolve the critical voids before formulating specifications.

---

## 3. Communication Mandate
- Never be argumentative for the sake of it.
- Every HALT must be accompanied by a concrete technical or business rationale.
- Every Strategic Note must be actionable for the Systems Architect.
