# Knowledge: Prioritization & Business ROI Framework (v2026)

This framework defines the formal mathematical and logical models the Product Owner must use to prioritize requirements, calculate business value, and assess financial feasibility. It bridges strategic discovery with technical estimation.

---

## 1. MoSCoW Prioritization Standard

To prevent scope creep and establish a clear minimum viable product (MVP), every functional and non-functional requirement must be mapped to one of the following four tiers:

| Tier | Definition | Statutory Rule |
| :--- | :--- | :--- |
| **Must Have (M)** | Core functional necessity. Without it, the release is legally or technically impossible to launch. | **No workarounds exist.** |
| **Should Have (S)** | High-value, important requirement. Necessary for standard operational flow, but has a viable manual workaround. | **Can be deferred to V1.1 if needed.** |
| **Could Have (C)** | Desirable feature that enhances user experience or visual aesthetics with minimal technical dependencies. | **Subject to spare resource bandwidth.** |
| **Won't Have (W)** | Out of scope for the current release window. Recognized as valuable but explicitly deferred to a future epic. | **Documented in the "Won't Have" list.** |

---

## 2. RICE Scoring Heuristics

To remove subjective bias from the prioritization pipeline, apply the **RICE** model to rank features.

$$\text{RICE Score} = \frac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$$

### 2.1 Metric Scales & Standards:

1. **Reach (Monthly Volume):**
   - Estimate the number of users or transactions this feature will impact in a standard 30-day window.
   - *Scale:* Integer (e.g., `100` users, `5000` transactions).
2. **Impact (Value Multiplier):**
   - The direct contribution of the feature to user satisfaction, retention, or direct business metrics.
   - *Scale:*
     - `3.0` = **Massive Impact** (Drives acquisition, solves a primary user pain point).
     - `2.0` = **High Impact** (Greatly improves productivity, positive feedback driver).
     - `1.0` = **Medium Impact** (Incremental usability upgrade).
     - `0.5` = **Low Impact** (Minor convenience).
3. **Confidence (Data-Driven Certainty):**
   - The reliability of our Reach, Impact, and Effort estimates based on analytics, market research, or technical prototypes.
   - *Scale:*
     - `1.0` = **100% (High Confidence)** (Backed by existing user data, clear prototypes, and developer agreement).
     - `0.8` = **80% (Medium Confidence)** (Qualitative user feedback, partial data, similar industry examples).
     - `0.5` = **50% (Low Confidence)** (Speculative estimate; requires further discovery or researcher deep-dive).
     - *Rule:* Any confidence value $\le 0.5$ triggers a **Strategic Note** recommending a `/researcher:investigate` feasibility study.
4. **Effort (Person-Months / Story Points):**
   - The estimated time and resource budget required for design, implementation, and testing.
   - *Scale:* Standard Fibonacci sequence `[1, 2, 3, 5, 8, 13]`.
     - `1` = Simple tweak (hours/days).
     - `3` = Medium component (1-2 weeks).
     - `5` = Large component (3-4 weeks).
     - `8+` = Major architectural undertaking (months).

---

## 3. Financial Feasibility & Business ROI Model

Every feature or system optimization must prove its financial viability before development allocation.

### 3.1 ROI Coefficient:
Calculate the **ROI Coefficient** to justify feature development cost:

$$\text{ROI} = \frac{\text{Estimated Annual Financial Value (Savings / Revenue)}}{\text{Estimated Initial Development Cost (Effort \times Company Rate)}}$$

*Heuristics:*
- **High Viability:** $\text{ROI} \ge 2.0$ (Returns double the investment in year 1).
- **Moderate Viability:** $1.0 \le \text{ROI} < 2.0$ (Returns cost, incremental gain).
- **Low Viability:** $\text{ROI} < 1.0$ (Negative return; requires explicit non-financial strategic justification like legal compliance).

### 3.2 Cost of Delay (CoD):
The financial penalty or missed opportunity cost incurred per week/month that a feature is delayed from production.
- **Formulas:**
  - *Revenue CoD:* `Projected Weekly Revenue`.
  - *Operational CoD:* `Weekly staff hours wasted on manual workaround * hourly cost`.

---

## 4. Risk Matrix & Feasibility Gates

Before finalizing a PRD, the PO must score project risks from `1` (Negligible) to `5` (Critical):

| Risk Category | Key Assessment Check | Action Trigger |
| :--- | :--- | :--- |
| **Technical Risk** | Unproven tech stack, complex data migrations, or third-party API dependencies. | Score $\ge 4$ requires an Architect architectural spike. |
| **Operational Risk** | High support staff overhead, training costs, or manual monitoring dependencies. | Score $\ge 4$ requires an Automata automation check. |
| **Compliance Risk** | Regulatory vulnerability (GDPR, LGPD, HIPAA breaches). | Score $\ge 4$ triggers a mandatory Compliance audit block. |
