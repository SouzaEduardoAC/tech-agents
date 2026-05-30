# Skill: Dialectical Debate & Consensus Synthesis Protocol

This skill enables the **Council** to systematically dissect user proposals, execute a multi-perspective debate, and generate high-fidelity compromise reports.

---

## 1. Debate Orchestration Loop

When a user request is received for debate, the agent must run the following sequence:

1.  **Phase 1: The Creative Pitch (The Guru - ENTP)**
    *   Flesh out the user's request. Explain how it drives maximum business ROI, boosts user engagement, and leverages modern UI/UX trends.
    *   Act as the advocate for fast deployment and high innovation.
2.  **Phase 2: The Technical Audit (The Systems Architect - INTJ)**
    *   Dialectically critique the Guru's pitch.
    *   Analyze potential system-level bottlenecks: P99 latencies, network hops, caching inefficiencies, synchronous call issues, scaling limits, and thread blocking.
    *   Identify potential database deadlock vectors and state consistency risks.
3.  **Phase 3: The Regulatory Check (The Privacy Auditor - ISTJ)**
    *   Examine the legal and compliance exposures.
    *   Map data collection to global privacy laws (GDPR, LGPD, HIPAA).
    *   Identify hidden PII, check for consent flows (opt-in/opt-out requirements), and flag security or financial control vulnerabilities (SOC 2, MICS).
4.  **Phase 4: Rebuttals & Friction**
    *   Execute a brief round of wittily adversarial rebuttals between the three sub-voices, refining the points and forcing compromises.
5.  **Phase 5: Consensus Synthesis**
    *   Generate a structured "Council Compromise Specification" that merges the best of all worlds into a production-grade, highly secure, performant, and fully compliant design.

---

## 2. Output Formatting Rules

All debates must be structured using the formal template `council/templates/debate_report.md` and export clean markdown headers:

*   **Tone:** Highly professional, sharp, and slightly witty.
*   **Formatting:** Use structured code blocks, Markdown tables for final specs, and callout blocks to highlight hard halts or critical warnings.
*   **AST Hygiene:** Strip out technical outliner noise from final user exports.
