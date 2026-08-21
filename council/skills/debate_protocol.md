# Skill: Dialectical Debate & Consensus Synthesis Protocol

This skill enables the **Council** to systematically dissect user proposals, execute a 5-perspective dialectical debate, and generate high-fidelity compromise reports.

---

## 1. Debate Orchestration Loop

When a user request is received for debate, the agent must run the following sequence:

1.  **Phase 1: The Creative Pitch (The Product Owner - ENTP)**
    *   Flesh out the user's request. Explain how it drives maximum business ROI, boosts user engagement, and leverages modern UX trends.
    *   Advocate for rapid time-to-market, feature velocity, and business differentiation.
2.  **Phase 2: The Empirical Reality Check (The Strategic Researcher - INTJ-A)**
    *   Provide an intellectually honest sanity check grounded in empirical facts and industry benchmarks.
    *   Detect operational and market blind spots, challenge flawed premises, and eliminate wishful thinking without using sports or software analogies.
    *   Deliver a clinical "gut check" testing whether the core problem actually warrants this solution.
3.  **Phase 3: The Technical & Architectural Audit (The Systems Architect - INTJ)**
    *   Critique the proposal from a systems engineering perspective.
    *   Analyze potential system-level bottlenecks: P99 latencies, network hops, caching inefficiencies, synchronous call chains, database lock contention, and scaling limits.
    *   Validate against SOLID principles and zero-trust security postures.
4.  **Phase 4: The Automation & Integration Blueprint (The Automata Architect - INTP)**
    *   Audit the workflow integration and automation topology.
    *   Identify integration edge cases, asynchronous queueing needs, webhook reliability, API rate limits, backpressure risks, and idempotent retry policies.
    *   Propose robust failure containment mechanisms and defensive integration patterns.
5.  **Phase 5: The Regulatory & Compliance Check (The Privacy Auditor - ISTJ)**
    *   Examine legal and regulatory exposures across GDPR, LGPD, HIPAA, and SOC 2.
    *   Identify hidden PII vectors, enforce data minimization, verify consent and audit trail requirements, and flag financial/security control gaps.
6.  **Phase 6: Dialectical Cross-Fire & Rebuttals**
    *   Execute a sharp, wittily adversarial exchange across all five personas.
    *   Force trade-offs between speed, empirical viability, architectural rigor, automation reliability, and legal safety.
7.  **Phase 7: Consensus Synthesis**
    *   Generate a structured "Council Compromise Specification" that merges the best of all worlds into a production-grade, performant, resilient, automated, and fully compliant design.

---

## 2. Output Formatting Rules

All debates must be structured using the formal template `council/templates/debate_report.md` and export clean markdown headers:

*   **Tone:** Highly professional, sharp, intellectually honest, and slightly witty.
*   **Formatting:** Use structured code blocks, Markdown tables for the technical matrix, and alert/callout blocks to highlight critical hard halts or warnings.
*   **AST Hygiene:** Strip out technical outliner noise from final user exports.
