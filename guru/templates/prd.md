# PRD: [Feature Name]

## 1. Overview
- **Problem Statement:** What problem are we solving?
- **Goal:** What is the primary objective?
- **Success Metrics (KPIs):**
  - [KPI-01]: [Target baseline and metric]
  - [KPI-02]: [Target baseline and metric]

## 2. Target Audience & Personas
- **Primary Persona:** [Role, Technical Aptitude, Key operational goals]
- **Secondary Persona:** [Role, Technical Aptitude, Key operational goals]

## 3. User Stories
- [ ] **AS A** [Role], **I WANT** [Action], **SO THAT** [Value / Business Goal].
- [ ] **AS A** [Role], **I WANT** [Action], **SO THAT** [Value / Business Goal].

## 4. Functional Requirements & MoSCoW Priorities
Every requirement must carry a specific MoSCoW priority (`Must Have`, `Should Have`, `Could Have`, `Won't Have`) and link back to its user stories.

- **[[FR-01]] [Feature Title]**
  - **Description:** [Clear description of functional behavior]
  - **MoSCoW:** [Must / Should / Could / Won't]
  - **User Story Link:** [User Story Reference]
- **[[FR-02]] [Feature Title]**
  - **Description:** [Clear description of functional behavior]
  - **MoSCoW:** [Must / Should / Could / Won't]
  - **User Story Link:** [User Story Reference]

## 5. Non-Functional Requirements
- **Performance:** [e.g., API latency <200ms at p99, page loads <1.5s]
- **Security:** [e.g., Keycloak JWT Bearer authentication, TLS 1.3 encryption]
- **Compliance:** [e.g., 15-day LGPD SLA enforcement, GDPR Art 32 compliance, 6-month logs]

## 6. Prioritization & Business ROI Analysis
Use the **Prioritization & Business ROI Framework** (ref: `knowledge/prioritization_framework.md`) to prioritize scope:

### 6.1 RICE Scoring Matrix
| Requirement | Reach | Impact | Confidence | Effort | RICE Score | Rank |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **[[FR-01]]** | [Users] | [Scale 0.5-3] | [Scale 0.5-1] | [Fibonacci] | [Score] | [1] |
| **[[FR-02]]** | [Users] | [Scale 0.5-3] | [Scale 0.5-1] | [Fibonacci] | [Score] | [2] |

### 6.2 Financial Feasibility Metrics
- **Estimated Initial Development Cost:** [Effort * Company Rate]
- **Estimated Annual Financial Value:** [Operational Savings / Revenue generated]
- **ROI Coefficient:** [Value / Cost - target $\ge 2.0$ for High Viability]
- **Cost of Delay (CoD):** [Estimated financial loss per week/month delayed]

## 7. Edge Cases & Technical Constraints
- **[[EC-01]] [Edge Case Title]**
  - **Scenario:** [What happens when things go wrong?]
  - **Resolution:** [System fallback behavior]
- **[[C-01]] [Technical Constraint]**
  - **Description:** [e.g., Legacy database access read-only, strict offline local caching]

## 8. Acceptance Criteria (Definition of Done)
Map clear Gherkin-style `Given-When-Then` test parameters:

- [ ] **Acceptance Criteria for [[FR-01]]:**
  - **Given** [Initial system state]
  - **When** [User performs the action]
  - **Then** [Expected system outcome]
- [ ] **Acceptance Criteria for [[FR-02]]:**
  - **Given** [Initial system state]
  - **When** [User performs the action]
  - **Then** [Expected system outcome]

## 9. Handoff Notes for Systems Architect
- Technical dependencies, target stack alignment, or potential integration risks discovered during brainstorming.
