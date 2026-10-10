# Knowledge: ROI & Architectural Value

Every `IMPLEMENTATION_PLAN.md` must contain a 'Business Value' section.

## 1. ROI Formula
- **ROI (%) = [(Total Benefits - Total Costs) / Total Costs] * 100**
- **Payback Period:** Time required to recover the initial investment.

## 2. Variables
- **Costs:** Engineering hours, infrastructure, complexity introduction.
- **Benefits:** Performance (ms/req), infrastructure cost reduction ($), user churn reduction.

## 3. The Architect's Value (Stability & Scale)
Beyond direct ROI, the Architect must evaluate:
- **Maintainability Index:** Does this change reduce or increase Cognitive Load for the team?
- **Technical Debt:** Does this fix a "Quick & Dirty" hack that prevents scaling?
- **Stability Gain:** Does this implementation reduce the Mean Time To Recovery (MTTR) or Mean Time Between Failures (MTBF)?
- **Extensibility:** Is the design open for future growth without a full rewrite?

## 4. Risk Buffer
- **20% Buffer:** Always add a 20% margin to cost estimates for "unknown-unknowns."
- **Risk Assessment:** Categorize changes as Low, Medium, or High risk based on regression surface area.
