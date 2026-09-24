# Regulatory Cross-Reference

| Feature | GDPR | LGPD | HIPAA |
| :--- | :--- | :--- | :--- |
| **Legal Basis** | 6 options (Consent, Contract, etc.) | 10 options | Standard of Care/Treatment |
| **Data Protection Officer** | Mandatory (mostly) | Mandatory | Privacy Official |
| **Breach Notification** | 72 hours | "Reasonable time" | 60 days |
| **Penalties** | Up to 4% Global Turnover | Up to 2% (Max 50m BRL) | Tiered (Civil & Criminal) |

# Knowledge Base: Unified Compliance & Overlap Matrix (2026)

## 1. The 2026 Global Bridge: Brazil ↔ EU Adequacy

As of **January 26, 2026**, the European Commission and the Brazilian ANPD formally recognize each other’s data protection levels as **equivalent**.

* **Impact:** Standard Contractual Clauses (SCCs) are no longer mandatory for transfers between these zones.
* **Unified Strategy:** A single **Data Protection Impact Assessment (DPIA/RIPD)** can now satisfy both GDPR (Art. 35) and LGPD (Art. 38) requirements if it addresses the nuances of both (e.g., the 15-day LGPD subject access window).
* **Audit Check:** Verify if the entity is still using legacy SCCs. In 2026, relying on "Adequacy" is the more efficient, lower-risk legal basis.

## 2. Core Control Mapping (The "Unified Control" Set)

The following technical controls are "Golden Rules"—implementing them once satisfies every framework in your agent's current scope.

| Control Category | Technical Standard (2026) | Frameworks Covered |
| --- | --- | --- |
| **Encryption** | AES-256 (Rest), TLS 1.3 (Transit) | **ALL** (GDPR, LGPD, HIPAA, SOC 2, MICS) |
| **Identity & Access** | MFA + RBAC + Unique User IDs | **ALL** |
| **Logging/Auditing** | 6-month minimum immutable logs | **HIPAA** (Required), **SOC 2** (Required), **MICS** (Critical) |
| **Breach Readiness** | 72-hour internal detection-to-report | **GDPR** (Mandatory), **LGPD** (Expected), **HIPAA** (Best Practice) |
| **AI Transparency** | Logic Explainability + Impact Assessment | **GDPR** (AI Act Bridge), **LGPD**, **HIPAA** (2025 AI Rule) |

## 3. Divergence & Conflict Zones

Where the frameworks differ, the agent must flag the **strictest** requirement as the default "Safe Path."

### A. Data Subject Rights & Deadlines

* **The Conflict:** GDPR allows 30 days; LGPD strictly mandates **15 days**.
* **Agent Rule:** If any Brazilian data is involved, the agent must enforce the **15-day SLA** for all requests to ensure zero-risk compliance.

### B. "The Right to be Forgotten" vs. "Legal Retention"

* **The Conflict:** GDPR/LGPD grant the right to deletion. HIPAA and MICS/SOC 2 (for financial/health records) often mandate retention for 6–10 years.
* **Agent Rule:** Legal retention (Compliance with Law) **supersedes** deletion requests. The agent must verify that "Deleted" data is actually archived in a "Locked/Read-Only" state for legal defense rather than fully purged if a retention law applies.

### C. Internal Controls (MICS) vs. Privacy (GDPR/LGPD)

* **The Conflict:** MICS requires detailed "Segregation of Duties" logs which may contain PII (Names/IDs).
* **Agent Rule:** Implement **Log Anonymization**. Access to the raw logs containing PII must itself be a restricted, audited event.

## 4. 2026 "Red Flag" Checklist

1. **EU-US Data Privacy Framework (DPF):** Still valid in 2026, but the agent must check if the US vendor is currently **active** on the DPF list before skipping SCCs.
2. **Shadow AI:** Any use of LLMs or third-party AI tools must be documented in the **RoPA (Record of Processing Activities)**.
3. **HIPAA 2026 Security Rule:** Reduction of "Addressable" (optional) safeguards. Encryption and MFA are now essentially **Required** for all healthcare-related ePHI.
