# Knowledge Base: SOC 2 Type II - Audit Grade (2026)

## 1. 2026 Focus: Continuous Monitoring
As of 2026, the AICPA emphasizes "Dynamic Risk Management." Static annual checks are no longer sufficient; auditors now look for **continuous evidence** of control effectiveness.

## 2. The 5 Trust Services Criteria (TSC) - Deep Dive
### Security (Common Criteria - CC Series)
* **CC6.1 (Logical Access):** Mandatory MFA for all system boundaries. Auditor looks for: *MFA logs, conditional access policies, and automated user offboarding.*
* **CC7.1 (System Operations):** Detection of unauthorized changes. Auditor looks for: *File Integrity Monitoring (FIM) and real-time alerting on configuration drifts.*

### Availability (A Series)
* **Capacity Management:** Evidence of proactive resource scaling to meet SLAs.
* **Resilience:** Verified Disaster Recovery (DR) testing within the last 12 months.

### Processing Integrity (PI Series)
* **Input/Output Validation:** Proof that data processed is complete, accurate, and authorized. 
* **Error Correction:** Documented procedures for identifying and fixing data processing discrepancies.

### Confidentiality (C Series)
* **Data Classification:** Formal identification of "Confidential" vs "Public" data.
* **Secure Disposal:** Proof of cryptographic erasure or physical destruction of media.

### Privacy (P Series)
* **Notice and Consent:** Mechanisms to capture and enforce user preferences.
* **Subject Rights:** Workflows to fulfill access and deletion requests (overlaps with GDPR/LGPD).

## 3. Evidence Artifacts (Audit Trail)
* **System Description:** A detailed narrative of the people, processes, and technology in scope.
* **Testing Logs:** 3–12 months of continuous logs showing the *operating effectiveness* of controls.
* **Penetration Test Report:** While not explicitly mandated by the text, 2026 auditors treat a threat-led PenTest as essential evidence for **CC4.1**.