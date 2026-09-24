# Knowledge Base: GDPR (European Union) — Regulation 2016/679

## 0. Quick Reference
- **Enforcement body:** Lead Supervisory Authority (DPA) — one-stop-shop per Art. 56
- **Penalties:** Up to **€20M or 4% of global annual turnover** (Tier 2) / **€10M or 2%** (Tier 1)
- **Breach notification:** **72 hours** to supervisory authority (Art. 33)
- **Rights response SLA:** **1 calendar month** (extendable 2 months for complexity — Art. 12(3))
- **Cross-border enforcement:** Harmonized by Regulation (EU) 2025/2518

---

## 1. Core Principles (Article 5) — Auditor Must Verify ALL

The controller must be able to **demonstrate** compliance (accountability principle — Art. 5(2)). Burden of proof rests on the controller.

| Principle | Requirement |
|-----------|------------|
| Lawfulness, fairness, transparency | Processing must have a valid legal basis; must not mislead data subjects |
| Purpose limitation | Data collected for specified, explicit, legitimate purposes — cannot be repurposed incompatibly |
| Data minimisation | Only data adequate, relevant, and limited to what is necessary |
| Accuracy | Reasonable steps to ensure accuracy; data subjects can rectify |
| Storage limitation | No longer than necessary for the purpose; automated purge logic required |
| Integrity & confidentiality | Technical/organisational measures against unauthorized access, loss, destruction |
| **Accountability** | Controller must PROVE compliance at all times |

---

## 2. Lawful Bases (Article 6) — Map EVERY Processing Activity to One

| Basis | Art. | Key Audit Check |
|-------|------|----------------|
| **Consent** | 6(1)(a) | Freely given, specific, informed, unambiguous; withdrawal as easy as giving; documented with timestamp + version |
| **Contract** | 6(1)(b) | Processing genuinely necessary for contract; not merely convenient |
| **Legal obligation** | 6(1)(c) | Specific mandatory law (not merely permissive); obligation must be clear |
| **Vital interests** | 6(1)(d) | Narrow use; data subject must be incapable of giving consent |
| **Public task** | 6(1)(e) | Basis in Union or Member State law; public authority scope |
| **Legitimate interests** | 6(1)(f) | Requires documented **Legitimate Interest Assessment (LIA)**; cannot override fundamental rights |

---

## 3. Special Category Data (Article 9) — Heightened Protection

**Categories (processing prohibited by default):**
- Racial/ethnic origin, political opinions, religious/philosophical beliefs
- Trade union membership, genetic data
- Biometric data (when used for unique identification)
- Health data, sex life/sexual orientation

**Processing requires:** One Art. 6 lawful basis **PLUS** one Art. 9(2) exemption:
- **(a)** Explicit consent (not just standard consent)
- **(b)** Employment, social security, or social protection law obligations
- **(c)** Vital interests (data subject incapable of consent)
- **(d)** Legitimate activities of a non-profit with political/philosophical/religious/trade union purpose
- **(e)** Data manifestly made public by the data subject
- **(f)** Legal claims — establishment, exercise, or defence
- **(g)** Substantial public interest (Union/Member State law)
- **(h)** Health/social care purposes (medical professionals)
- **(i)** Public health (Art. 9(2)(i))
- **(j)** Archiving, research, statistics (Art. 89 safeguards)

**Article 10 — Criminal Conviction Data:** Only processable under official authority or specific Union/Member State law.

---

## 4. Data Subject Rights (Articles 12–22)

Response SLA: **1 calendar month** from receipt; extendable by 2 months for complex/multiple requests (notify within first month). First copy of data is free.

| Right | Article | Audit Implication |
|-------|---------|------------------|
| **Right to be informed** | 13–14 | Privacy notice must state: legal basis, retention periods, transfers, DPO contact, rights |
| **Right of access (SAR)** | 15 | Must provide copy of data + supplementary info |
| **Right to rectification** | 16 | Correct inaccurate/incomplete data; notify third parties if data was shared |
| **Right to erasure (RTBF)** | 17 | When purpose ceases, consent withdrawn, unlawful processing; **NOT absolute** — legal retention overrides |
| **Right to restrict processing** | 18 | "Freeze" data — store but do not actively process |
| **Right to data portability** | 20 | Applies only to consent/contract bases + automated processing; machine-readable format (JSON/CSV/XML) |
| **Right to object** | 21 | Absolute right against direct marketing; conditional vs. legitimate interests (LIA override required) |
| **Rights vs. automated decisions** | 22 | Right not to be subject to solely automated decisions with legal/significant effects; human review mechanism required |

---

## 5. Security of Processing (Article 32)

Risk-based approach. Measures must be appropriate to the risk, considering "state of the art":

* **Pseudonymisation and encryption** of personal data
* Ongoing **confidentiality, integrity, availability, and resilience** of processing systems
* Ability to **restore access** to data in a timely manner after an incident (verified backups)
* Process for **regularly testing, assessing, evaluating** effectiveness of TOMs

**2026 State-of-the-Art Standards (audit benchmarks):**
- Encryption at rest: **AES-256**
- Encryption in transit: **TLS 1.3**
- Access control: **MFA + RBAC + least privilege**
- Pseudonymisation: cryptographic key separation (key stored separately from pseudonymised data)

---

## 6. Privacy by Design and by Default (Article 25)

* Privacy must be embedded at the system design stage — not retrofitted
* Default settings must expose the **minimum amount of personal data**
* Audit check: Is there a documented privacy-by-design process in the SDLC?

---

## 7. Controller/Processor Obligations

### Data Processing Agreements — DPA (Art. 28)
- Required between **every controller-processor pair**; cannot be waived
- Must specify: subject matter, duration, nature/purpose, data types, obligations/rights
- Processor **cannot engage sub-processors** without controller's prior written authorization

### Records of Processing Activities — ROPA (Art. 30)
- Mandatory for controllers with ≥250 employees **OR** non-occasional processing **OR** special category data
- Must document: purposes, data categories, data subject categories, recipients, transfers, retention periods, security description

### Data Protection Officer — DPO (Articles 37–39)
**Mandatory when:**
1. Processing by a public authority (Art. 37(1)(a))
2. Core activities require **large-scale, regular, systematic monitoring** of individuals (Art. 37(1)(b))
3. Core activities involve **large-scale special category or criminal conviction data** (Art. 37(1)(c))

DPO must: have expert knowledge, be independent, not receive instructions on tasks, report to highest management level.

### Data Protection Impact Assessment — DPIA (Art. 35)
**Mandatory** for high-risk processing. Triggers include:
- Systematic profiling with legal/significant effects (Art. 35(3)(a))
- **Large-scale** processing of special categories (Art. 35(3)(b))
- Systematic monitoring of publicly accessible areas (Art. 35(3)(c))
- Also triggered by: new technologies, matching/combining datasets, location tracking, vulnerable subjects, biometric systems

Minimum DPIA content: description of processing, necessity/proportionality assessment, risk assessment, mitigation measures.

---

## 8. Breach Notification (Articles 33–34)

* **Art. 33 — Controller → Supervisory Authority:** Within **72 hours** of becoming aware; if after 72h, include reasons for delay. **Processors must notify controllers without undue delay.**
* **Art. 34 — Controller → Data Subjects:** Without undue delay when breach is **likely to result in high risk**. Exceptions: encryption renders data unintelligible; mitigating action taken; disproportionate effort (use public communication instead).

---

## 9. Cross-Border Data Transfer Mechanisms (Chapter V, Arts. 44–50)

| Mechanism | Provision | Audit Check |
|-----------|-----------|------------|
| **Adequacy Decision** | Art. 45 | Is destination on EU Commission adequacy list? (UK, Japan, Canada, NZ, Switzerland, South Korea, USA-DPF, **Brazil as of January 27, 2026 — Decision 2026/179**) |
| **Standard Contractual Clauses (SCCs)** | Art. 46(2)(c) | Are 2021 EU Commission SCCs in place? Is a **Transfer Impact Assessment (TIA)** documented? |
| **Binding Corporate Rules (BCRs)** | Art. 46(2)(b) | Has the lead DPA approved the BCRs? |
| **EU-US Data Privacy Framework (DPF)** | Art. 45 | Is the US vendor **currently active** on the DPF certification list (dataprivacyframework.gov)? Confirmed valid by EU General Court September 3, 2025. |
| **Derogations** | Art. 49 | Explicit consent, contract necessity, legal claims — narrow use only |

**Brazil-EU Adequacy (January 2026):** As of Commission Decision 2026/179 (January 27, 2026), data transfers between EU/EEA and Brazil no longer require SCCs. Adequacy is now the primary mechanism. Verify that transfer registers are updated and legacy SCCs are retired.

---

## 10. Enforcement & Penalties (Article 83)

| Tier | Maximum Fine | Typical Violations |
|------|-----------|--------------------|
| **Tier 1** | **€10M or 2% of global annual turnover** (higher of) | ROPA (Art. 30), security (Art. 32), breach notification (Art. 33), DPO (Art. 37), DPIA (Art. 35) |
| **Tier 2** | **€20M or 4% of global annual turnover** (higher of) | Core principles (Art. 5), unlawful processing (Art. 6/9), invalid consent, illegal transfers (Chapter V), violations of data subject rights (Arts. 12–22) |

Art. 84 permits Member States to set additional **criminal penalties**.

---

## 11. AI & Automated Decisions (Article 22) — 2026 Priority

* **Human-in-the-loop:** Data subjects have the right NOT to be subject to decisions based solely on automated processing with legal or similarly significant effects
* **Explainability (EU AI Act Bridge):** Regulators in 2026 treat "AI Explainability" as a compliance requirement — document how the algorithm reached each decision
* **Transparency Profile:** Any AI processing personal data must have documented inputs, risk mitigations, and decision logic

---

## 12. 2026 Regulatory Updates

* **Procedural Regulation (2026):** Regulation (EU) 2025/2518 harmonizes cross-border enforcement; introduces stricter 15-month deadlines for final regulatory decisions across DPAs
* **Brazil-EU Adequacy:** Decision 2026/179 — removes SCC requirement for BR↔EU transfers (subject to 4-year review)
* **Post-Quantum Cryptography Readiness:** Regulators flagging this as "state of the art" consideration for high-value data processing