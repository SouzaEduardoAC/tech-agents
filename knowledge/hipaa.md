# Knowledge Base: HIPAA (USA) — Health Insurance Portability and Accountability Act of 1996

## 0. Quick Reference
- **Enforcement body:** Office for Civil Rights (OCR) under the Department of Health and Human Services (HHS)
- **Penalties (Tier 4):** Up to **~$71,162 per violation**, capped at **~$2.13 million per year per provision** (OCR 2026 inflation-adjusted limits)
- **Breach notification:** **60 calendar days** from discovery of a breach of unsecured PHI (45 CFR § 164.404)
- **Essential contracts:** Signed **Business Associate Agreements (BAAs)** required before any vendor access to PHI
- **Reasonable Security Benchmark:** Alignment with the **HHS Cybersecurity Performance Goals (CPGs)**

---

## 1. Core Definitions & Scope

### Protected Health Information (PHI & ePHI):
Any individually identifiable health information created, received, maintained, or transmitted by a Covered Entity or Business Associate, relating to:
- The past, present, or future physical or mental health condition of an individual.
- The provision of healthcare to the individual.
- The past, present, or future payment for the provision of healthcare to the individual.

### The 18 HIPAA Identifiers (45 CFR § 164.514(b)(2)):
To fully de-identify PHI under the **Safe Harbor Method**, the following 18 identifiers of the individual (or relatives, employers, or household members) must be completely removed:
1. Names
2. All geographic subdivisions smaller than a state (street address, city, county, ZIP code)
3. All elements of dates (except year) directly related to an individual (birth date, admission date, discharge date, date of death) and all ages over 89
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers (including license plate numbers)
13. Device identifiers and serial numbers
14. Web Universal Resource Locators (URLs)
15. Internet Protocol (IP) addresses
16. Biometric identifiers (including finger and voice prints)
17. Full-face photographs and any comparable images
18. Any other unique identifying number, characteristic, or code

### Covered Entities (CE) vs. Business Associates (BA):
- **Covered Entity:** Healthcare providers, health plans, and healthcare clearinghouses.
- **Business Associate:** Any third-party entity (Cloud provider, SaaS vendor, software agency) that creates, receives, maintains, or transmits PHI on behalf of a Covered Entity. Requires a signed BAA.

---

## 2. The Privacy Rule (45 CFR Part 164, Subpart E)

Focuses on the permissible uses and disclosures of PHI, and grants individuals rights over their health information.

### 2.1 Permissible Uses and Disclosures:
PHI may be disclosed without patient authorization *only* for:
- **Treatment:** Providing, coordinating, or managing healthcare.
- **Payment:** Activities to obtain premiums, determine coverage, and fulfill billing.
- **Healthcare Operations (TPO):** Quality assessment, employee review, training, and legal/auditing functions.
- **Other narrow exceptions:** Public health activities, victim of abuse reports, law enforcement judicial orders.

### 2.2 The "Minimum Necessary" Standard (§ 164.502(b)):
- When using or disclosing PHI, or when requesting PHI from another covered entity, a covered entity must make reasonable efforts to limit PHI to the **minimum necessary** to accomplish the intended purpose.
- **Audit Requirement:** Implement Role-Based Access Control (RBAC) mapping users strictly to their job-specific "need to know" data permissions.

### 2.3 Individual Rights under the Privacy Rule:
- **Right to Access (§ 164.524):** Right to inspect and obtain a copy of PHI in a designated record set within **30 days** (HHS guidelines enforce self-service or fast digital delivery).
- **Right to Request Amendment (§ 164.526):** Request correction of inaccurate PHI.
- **Right to an Accounting of Disclosures (§ 164.528):** Request a history of disclosures made outside of TPO.
- **Right to Request Restrictions (§ 164.522(a)):** Request limits on uses/disclosures.
- **Right to Confidential Communications (§ 164.522(b)):** Request communications via alternative means or locations.

---

## 3. The Security Rule: Technical Safeguards (45 CFR § 164.312)

Focuses on the technology and architecture required to protect Electronic PHI (ePHI).

| Standard | CFR Section | Requirement / Audit Check |
|----------|-------------|----------------------------|
| **Access Control** | § 164.312(a)(1) | Implement policies and procedures to allow only authorized users to access ePHI. |
| *Unique User ID* | § 164.312(a)(2)(i) | **Required.** Assign a unique name/number for tracking user identity. Shared accounts are strictly prohibited. |
| *Emergency Access* | § 164.312(a)(2)(ii) | **Required.** Establish documented procedures for obtaining necessary ePHI during emergencies ("Break-glass" protocol). |
| *Automatic Log-off*| § 164.312(a)(2)(iii) | **Addressable (Enforced 2026).** Terminate an electronic session after a predetermined time of inactivity. |
| *Encryption* | § 164.312(a)(2)(iv) | **Addressable (Required per 2025 NPRM).** Encrypt ePHI at rest using standard **AES-256** keys stored separately. |
| **Audit Controls** | § 164.312(b) | **Required.** Implement hardware, software, and/or procedural mechanisms that record and examine activity in systems containing or using ePHI. Access logs must be retained for at least **6 months**. |
| **Integrity** | § 164.312(c)(1) | Implement policies and procedures to protect ePHI from improper alteration or destruction. |
| *Mechanism to Verify*| § 164.312(c)(2) | **Addressable (Required).** Implement technical mechanisms (e.g., cryptographic checksums, hashing, digital signatures) to corroborate that ePHI has not been altered. |
| **Person Authentication**| § 164.312(d) | **Required.** Implement procedures to verify that a person/entity seeking access to ePHI is the one claimed (MFA enforced). |
| **Transmission Security**| § 164.312(e)(1) | Guard against unauthorized access to ePHI being transmitted over an electronic network. |
| *Integrity Controls* | § 164.312(e)(2)(i) | **Addressable.** Ensure that transmitted electronic data is not altered without detection. |
| *Encryption* | § 164.312(e)(2)(ii) | **Addressable (Required per 2025 NPRM).** Encrypt ePHI in transit over external networks using **TLS 1.3** exclusively. |

---

## 4. The Security Rule: Administrative Safeguards (45 CFR § 164.308)

Administrative actions, policies, and procedures to manage the selection, development, implementation, and maintenance of security measures.

- **Security Management Process (§ 164.308(a)(1)):**
  - **Security Risk Assessment (SRA):** Conduct an accurate and thorough annual assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of ePHI.
  - **Risk Management:** Implement security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level.
  - **Sanction Policy:** Apply appropriate sanctions against workforce members who fail to comply.
  - **Information System Activity Review:** Regularly review logs of system activity, access reports, and security incident tracking.
- **Assigned Security Responsibility (§ 164.308(a)(2)):** Designate a Security Official responsible for the development and implementation of security policies (CISO / Security Officer).
- **Workforce Security (§ 164.308(a)(3)):** Ensure workforce members have appropriate access to ePHI and prevent unauthorized access.
- **Security Awareness and Training (§ 164.308(a)(5)):** Annual mandatory training for all workforce members, including login monitoring, threat awareness, and password management.
- **Contingency Plan (§ 164.308(a)(7)):**
  - **Data Backup Plan:** Establish a strategy for creating and maintaining retrievable exact copies of ePHI.
  - **Disaster Recovery Plan:** Document procedures to restore lost data.
  - **Emergency Mode Operations Plan:** Document procedures to enable continuous operation of critical business processes during emergencies.
  - **Backup Restore Testing:** Document and run scheduled restore tests of encrypted backups semi-annually.

---

## 5. The Security Rule: Physical Safeguards (45 CFR § 164.310)

Physical measures, policies, and procedures to protect a covered entity's electronic information systems and related equipment and facilities from natural hazards and unauthorized intrusion.

- **Facility Access Controls (§ 164.310(a)):** Limit physical access to electronic systems and the facilities in which they are housed (server rooms, offices) while ensuring authorized access is allowed.
- **Workstation Use (§ 164.310(b)):** Document and specify the proper functions to be performed on workstations, the manner in which those functions are performed, and physical attributes of the surroundings (e.g., locking screens, privacy filters).
- **Workstation Security (§ 164.310(c)):** Implement physical safeguards for all workstations that access ePHI, restricting access to authorized users only.
- **Device and Media Controls (§ 164.310(d)):** Policies governing the receipt, removal, disposal, and movement of hardware and electronic media containing ePHI:
  - **Disposal (Required):** Render ePHI completely unusable, unreadable, and indecipherable before media disposal (e.g., cryptographic erasure or physical shredding).
  - **Media Re-use (Required):** Clear ePHI from media prior to re-use.
  - **Accountability (Addressable):** Maintain an inventory record of all hardware movements and the person responsible.

---

## 6. HIPAA 2025 Security Rule NPRM & 2026 Enforcements

The HHS Office for Civil Rights (OCR) issued the **2025 HIPAA Security Rule Notice of Proposed Rulemaking (NPRM)**, which completely upgrades key parts of the security requirements. CEs and BAs must prepare for these strict, mandatory standards:

1. **Elimination of the "Addressable" vs "Required" Distinction:**
   - Security controls previously designated as "Addressable" (e.g., Encryption at rest, Encryption in transit) are now designated as **Required** and mandatory.
2. **Multi-Factor Authentication (MFA) Mandate:**
   - MFA is now **Required** for all user accounts and system integrations accessing ePHI, both locally and remotely. No exceptions are allowed.
3. **Mandatory Security Operations Auditing:**
   - **Vulnerability Scanning:** Schedule automated external/internal vulnerability scans at minimum every **6 months**; document results and track remediation plans.
   - **Penetration Testing:** Annual penetration testing conducted by an independent certified tester.
4. **Annual Written Business Associate Verification:**
   - Covered Entities must obtain a written, validated audit certificate annually from each Business Associate proving that all technical safeguards are operational.
5. **Technology Asset Inventory:**
   - Annual maintenance of a complete asset inventory and network map documenting all servers, cloud instances, endpoints, and mobile devices that touch ePHI.

---

## 7. Breach Notification Rule (45 CFR Part 164, Subpart D)

Established procedures for responding to and reporting data breaches:

- **The Trigger:** A breach is defined as the acquisition, access, use, or disclosure of PHI in a manner not permitted under the Privacy Rule which compromises the security or privacy of the PHI.
- **The Presumption:** An impermissible use or disclosure is presumed to be a breach unless the covered entity or business associate demonstrates that there is a **low probability that the PHI has been compromised** based on a documented **4-Factor Risk Assessment**:
  1. The nature and extent of the PHI involved (types of identifiers, clinical details).
  2. The unauthorized person who used the PHI or to whom the disclosure was made.
  3. Whether the PHI was actually acquired or viewed.
  4. The extent to which the risk to the PHI has been mitigated.
- **Notification Timelines:**
  - **To Individuals:** Must notify affected individuals without unreasonable delay and in no case later than **60 calendar days** from breach discovery.
  - **To HHS Secretary:**
    - If **500 or more** individuals are affected: Notify HHS Secretary **concurrently** with individual notifications (within 60 days).
    - If **fewer than 500** individuals: Maintain an incident log and report all breaches to HHS within **60 days of the end of the calendar year** in which the breach was discovered.
  - **To Media:** If a breach affects **500 or more** residents of a single State or jurisdiction, prominent media outlets must be notified via a press release within **60 days**.

---

## 8. Enforcement & Penalty Tiers (2026 OCR Limits)

OCR enforces civil and criminal penalties based on the level of culpability. Under the 2026 guidelines, OCR checks compliance against the **HHS Cybersecurity Performance Goals (CPGs)**:

### Civil Monetary Penalties (Tiered System):

| Penalty Tier | Culpability Basis | Penalty Range per Violation | Annual Cap per Provision |
|--------------|-------------------|-----------------------------|--------------------------|
| **Tier 1** | **No Knowledge** (Entity could not have reasonably known) | ~$137 to ~$34,270 | ~$2,130,000 |
| **Tier 2** | **Reasonable Cause** (Entity knew or should have known with due diligence) | ~$1,370 to ~$68,540 | ~$2,130,000 |
| **Tier 3** | **Willful Neglect — Corrected** (Intentional violation, but corrected within 30 days) | ~$13,708 to ~$82,249 | ~$2,130,000 |
| **4. Tier 4** | **Willful Neglect — Uncorrected** (Intentional violation, not corrected within 30 days) | **~$71,162** | **~$2,130,000** |

### Criminal Penalties (Enforced by DOJ):
- **Knowing acquisition or disclosure of PHI:** Up to $50,000 fine and 1 year in prison.
- **Done under false pretenses:** Up to $100,000 fine and 5 years in prison.
- **Intent to sell or use for commercial advantage/personal gain:** Up to $250,000 fine and 10 years in prison.

---

## 9. AI & Clinical Decision Systems (2025 AI Rule)

OCR enforcements in 2025 and 2026 established clear boundaries for using AI in healthcare:
- **AI Transparency Profile:** Any AI/LLM system deployed to process clinical ePHI or automate decision-making must have a documented safety profile on file.
- **Training Data Verification:** Proof that no ePHI was used to train public models without explicit patient authorization.
- **BAA for AI Vendors:** Any API, SaaS LLM, or AI tool used to process patient notes or transcripts must be covered under a fully executed Business Associate Agreement. Standard consumer AI portals (non-enterprise) are strict violations.