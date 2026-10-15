# Knowledge Base: LGPD (Brazil) — Lei Geral de Proteção de Dados (Law 13.709/2018)

## 0. Quick Reference
- **Enforcement body:** ANPD (Autoridade Nacional de Proteção de Dados)
- **Penalties:** Up to **2% of the private legal entity's gross revenue** in Brazil for the previous fiscal year, capped at **R$ 50 million per infraction** (Art. 52)
- **Breach notification:** **3 business days** from confirmation of the breach to ANPD and data subjects (Resolution CD/ANPD No. 15/2024)
- **Rights response SLA:** **15 calendar days** (Art. 19 SLA — strictest worldwide window)
- **Cross-border adequacy:** Recognized reciprocal adequacy with the EU/EEA as of **January 26, 2026 (EU Commission Decision 2026/179)**

---

## 1. The 10 Principles of Processing (Article 6)

Under the LGPD, all processing of personal data must be guided by good faith and comply with the following 10 principles:

| Principle | Statutory Requirement |
|-----------|------------------------|
| **1. Purpose (Finalidade)** | Processing must be for specific, legitimate, explicit, and informed purposes; no subsequent incompatible processing. |
| **2. Adequacy (Adequação)** | Compatibility of processing with the purposes disclosed to the data subject. |
| **3. Necessity (Necessidade)** | Processing must be limited to the minimum necessary for the achievement of its purposes (data minimization). |
| **4. Free Access (Livre Acesso)** | Easy and free consultation by data subjects regarding the form and duration of processing, as well as the integrity of their data. |
| **5. Quality (Qualidade dos Dados)** | Guarantee of accuracy, clarity, relevancy, and updating of data, according to the need for processing. |
| **6. Transparency (Transparência)** | Guarantee of clear, precise, and easily accessible information to data subjects about the processing and the shared controllers/processors. |
| **7. Security (Segurança)** | Adoption of technical and administrative measures capable of safeguarding data from unauthorized access or destruction (e.g., AES-256, TLS 1.3). |
| **8. Prevention (Prevenção)** | Adoption of measures to prevent occurrence of damage due to the processing of personal data. |
| **9. Non-discrimination (Não Discriminação)** | Impossibility of processing data for discriminatory, unlawful, or abusive purposes. |
| **10. Accountability (Responsabilização)** | Controller/processor must demonstrate the adoption of effective measures capable of proving compliance with LGPD rules. |

---

## 2. The 10 Lawful Bases for Processing (Article 7)

Unlike GDPR which provides 6 lawful bases, the LGPD provides **10 distinct legal bases** for processing non-sensitive personal data:

| Basis | Art. | Key Audit Check |
|-------|------|-----------------|
| **1. Consent** | 7(I) | Explicit, specific, free, informed, and revocable. Burden of proof rests on the controller. Must be separate from other contract terms. |
| **2. Legal / Regulatory Obligation** | 7(II) | Necessary for compliance with a legal or regulatory obligation imposed by Brazilian federal, state, or municipal law. |
| **3. Public Administration** | 7(III) | Necessary for the public administration to carry out public policies, execute public services, or implement regulations. |
| **4. Scientific Research** | 7(IV) | Executed by research public/private entities, ensuring anonymization of personal data whenever possible. |
| **5. Contract Execution** | 7(V) | Necessary for the execution of a contract or preliminary procedures related to a contract to which the data subject is a party. |
| **6. Regular Exercise of Rights** | 7(VI) | For the exercise of rights in judicial, administrative, or arbitration proceedings. |
| **7. Protection of Life or Safety** | 7(VII) | Necessary for the protection of life or physical safety of the data subject or a third party. |
| **8. Health Protection** | 7(VIII) | Exclusively for procedures performed by health professionals, health services, or sanitary authorities. |
| **9. Legitimate Interest** | 7(IX) | Supported by a **Legitimate Interest Assessment (LIA)** balancing test. Cannot override fundamental rights. Often requires ANPD audit review. |
| **10. Credit Protection** | 7(X) | Necessary for credit protection/scoring under the rules of specific Brazilian financial and banking legislation. |

---

## 3. Sensitive Personal Data (Articles 11–13)

### Definition (Art. 5(II)):
Sensitive data is any personal data regarding: racial or ethnic origin, religious conviction, political opinion, trade union membership, membership in a religious, philosophical, or political organization, health or sex life data, genetic or biometric data when linked to an individual.

### Legal Bases for Sensitive Data (Art. 11):
Processing of sensitive personal data is prohibited by default, unless one of the following applies:
1. **Explicit Consent:** Separate and specific consent given by the data subject for defined purposes.
2. **Without Consent (Art. 11(II)):** Only when indispensable for:
   - **(a)** Compliance with legal/regulatory obligations.
   - **(b)** Shared administration of public policies by public entities.
   - **(c)** Carrying out studies by research entities (anonymized where possible).
   - **(d)** Regular exercise of rights (contracts, administrative, or judicial proceedings).
   - **(e)** Protection of life or physical safety.
   - **(f)** Health protection, in procedures performed by health professionals or entities.
   - **(g)** Prevention of fraud and safety of data subjects in registration and identity validation in electronic systems (excluding profiling/credit scoring).

---

## 4. Fundamental Data Subject Rights (Articles 18–22)

The LGPD establishes extensive data subject rights that must be addressed within a strict statutory window of **15 calendar days** from the request (Art. 19(II)), which is the most challenging SLA globally.

| Right | Art. | Audit Implication & Technical Safeguards |
|-------|------|-----------------------------------------|
| **Confirmation of Processing** | 18(I) | Must confirm to the data subject whether their data is being processed. |
| **Access to Data** | 18(II) | Must provide a complete copy of all personal data in a clear and readable format. |
| **Correction** | 18(III) | Rectify incomplete, inaccurate, or out-of-date personal data. |
| **Anonymization, Blocking, or Deletion** | 18(IV) | For unnecessary, excessive, or unlawfully processed data. Must cascade to sub-processors. |
| **Data Portability** | 18(V) | Export data in an interoperable, structured, machine-readable format (JSON/CSV preferred). |
| **Deletion of Data Processed with Consent** | 18(VI) | Full purge of data where consent was the sole legal basis, unless a statutory retention obligation overrides. |
| **Information on Shared Entities** | 18(VII) | Detailed log of all public/private entities with whom the controller has shared the personal data. |
| **Information on Consent Refusal** | 18(VIII) | Inform data subjects about the consequences of denying consent (e.g., service limitations). |
| **Revocation of Consent** | 18(IX) | Revoke previously given consent via an easy, free, and immediate mechanism. |
| **Automated Decisions Review** | 20 | Right to request review of decisions taken solely on automated processing (AI profiling, credit score). Must provide clear criteria of the decision. |

---

## 5. Children and Adolescents' Data & 2026 ECA Digital

### Basic Rules (Art. 14):
- Processing must be done in their best interest.
- Requires **specific and highlighted consent** given by at least one parent or legal guardian.
- The controller must use reasonable efforts to verify that consent was indeed given by the guardian, considering current technologies.
- Public information must be simple, clear, and accessible to children.

### ECA Digital (Brazil, Law 15.211/2025 — Effective March 2026):
- Strictly prohibits automated profiling of minors for commercial or advertising purposes.
- Restricts the collection of minors' location data to cases of absolute emergency or active safety applications, requiring real-time notification to guardians.
- Mandates annual independent algorithmic impact assessments for any educational technology or digital platform utilized by Brazilian schools or children under 18.
- Establishes a zero-tolerance policy for behavioral manipulation or game mechanics ("dark patterns") targeting minors.

---

## 6. Security, Governance & Privacy by Design (Articles 46–51)

* **Security Safeguards (Art. 46):** Controllers and processors must adopt technical, administrative, and organizational security measures to protect personal data.
* **Audit Standard Tiers:** ANPD utilizes established international standards (ISO/IEC 27001, CIS Controls) for assessment.
  - Encryption at rest: **AES-256** enforced for all personal data repositories.
  - Encryption in transit: **TLS 1.3** enforced on all endpoints; legacy versions (TLS 1.1 or lower) must be disabled.
  - Identity Safeguards: Mandatory **MFA** and **RBAC** for all systems, database administrative panels, and APIs accessing PII.
* **Privacy by Design:** Documented evidence that privacy impact was evaluated during container and microservice architectural layout planning.
* **Incident Log:** Systematic logging of all security events. Even non-reportable incidents must be logged and archived for at least **5 years** (Resolution CD/ANPD 15/2024).

---

## 7. Operational Roles & Documentation (Articles 37–41)

### Record of Processing Activities (RoPA - Art. 37)
- Both the controller and the processor must maintain a detailed, structured **Registro das Operações de Tratamento de Dados Pessoais**.
- Must contain: processing purposes, data categories, recipient sharing logs, security measures, and data retention policies.

### Data Protection Impact Assessment (RIPD - Art. 38)
- Known as **Relatório de Impacto à Proteção de Dados Pessoais (RIPD)**.
- Triggered by: High-risk processing, use of sensitive personal data, profiling, or when processing is based on **Legitimate Interest (Art. 7(IX))**.
- Must outline: descriptions of collected data, risk analysis, and technical/organizational mitigation safeguards.

### The DPO / Encarregado (Art. 41)
- The controller **must appoint a Data Protection Officer** (Encarregado pelo Tratamento de Dados Pessoais).
- The DPO's identity and contact information must be publicly disclosed, clearly and prominently, on the controller's website.
- **SLA:** DPO must act as the direct liaison with data subjects and the ANPD.
- *Small business relief:* ANPD Resolution No. 2/2022 exempts micro-enterprises and startups from the mandatory DPO requirement, provided they do not perform high-risk processing.

---

## 8. Breach Notification (Resolution CD/ANPD No. 15/2024)

The ANPD finalized strict operational guidelines for reporting security incidents:

- **Notification Window:** **3 business days** from the date the controller has confirmation that a security incident has occurred which may cause significant risk or damage to data subjects.
- **Notification Target:** Must simultaneously notify the ANPD and the affected data subjects.
- **Supplementary Report Window:** Up to **20 business days** from the initial notification to provide comprehensive forensic logs, impact matrices, and detailed mitigation results.
- **Required Notification Content:**
  1. Description of the nature of the affected personal data.
  2. Information on the affected data subjects (number, profiles).
  3. Description of safety measures used for data protection (e.g., encryption status).
  4. Legal, security, and operational consequences of the incident.
  5. Mitigations implemented or planned.
  6. DPO/Encarregado contact details.

---

## 9. Cross-Border Data Transfers (Articles 33–36)

International transfers of personal data are permitted only under specific mechanisms:

1. **Adequacy Decision (Art. 33(I)):** Countries or international organizations recognized by the ANPD as providing an adequate level of protection.
   - **Brazil-EU Adequacy Decision (January 2026):** Reciprocal adequacy is fully in effect per Commission Decision 2026/179. Transfers between Brazil and EU/EEA are fully normalized and **no longer require SCCs or TIAs**, simplifying compliance for organizations operating in both jurisdictions.
2. **Standard Contractual Clauses (SCCs):** Specific clauses approved by the ANPD. Must be utilized if adequacy is not met.
3. **Binding Corporate Rules (BCRs):** Approved by the ANPD for intra-group corporate transfers.
4. **Specific Derogations:** Consent, contract necessity, protection of life, judicial cooperation.

---

## 10. Enforcement, Audits & Penalties (Articles 52–54)

The ANPD enforces administrative sanctions following formal audit investigations:

| Sanction Type | Statutory Threshold | Audit Mitigating Factors |
|---------------|---------------------|--------------------------|
| **Simple Warning** | Non-compliance warning | Prompt remediation, cooperative posture. |
| **Simple Fine** | Up to **2% of gross revenue** capped at **R$ 50M per infraction** | Level of cooperation, proof of TOMs, active DPO, active RoPA/RIPD, immediate containment. |
| **Daily Fine** | Applied until non-compliance is resolved | Accumulated daily up to the R$ 50M cap. |
| **Public Disclosure** | Public publication of the infraction | Severe brand damage; triggered by willful neglect. |
| **Data Blocking** | Temporary suspension of processing affected data | Halts operational lines using the data. |
| **Data Deletion** | Mandatory erasure of all affected data | Total destruction of data sets processed illegally. |
| **Suspension/Prohibition**| Temporary or permanent ban on processing activities | Complete operational shutdown of the systems. |