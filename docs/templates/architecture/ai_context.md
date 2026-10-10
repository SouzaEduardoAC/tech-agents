# AI COGNITIVE ANCHOR (v2.1)
[STACK: Lang, Framework, DB, Cache]

## 1. Architectural Design
- **Architecture Style:** [e.g., Hexagonal (Ports & Adapters), Clean Architecture, or Layered Monolith]
- **Layer Responsibilities:**
    - **Domain/Core:** [Describe what lives here: e.g., Entities, Value Objects, Domain Services]
    - **Application:** [e.g., Use Case orchestrators, Command/Query handlers]
    - **Infrastructure:** [e.g., DB Implementations, External Clients, Message Broker logic]
- **Data Flow:** [e.g., "Request -> Controller -> Application Service -> Domain -> Infrastructure (DB)"]

## 2. Dependency Management
- **Handling Mechanism:** [e.g., Manual Dependency Injection, IoC Container (e.g., Punq, Google Wire, Spring), or Service Locator]
- **Lifecycle Management:** [Identify patterns like Singleton, Scoped (per-request), or Transient]
- **Third-Party Boundary:** [How external libs are wrapped: e.g., "All 3rd party SDKs must be hidden behind an Interface in the Domain layer"]

## 3. Code Design & Patterns
- **Patterns Used:** [e.g., Repository, Strategy, Factory]
- **Usage Context:** [Specific scenarios for pattern application]

## 4. Conventions & Patterns
- **Naming:** [Conventions for variables/classes]
- **Logging:** [Log message structure]
- **Exceptions:** [Global exception handling strategy]

## 5. Critical Paths & Constraints
- [Path]: Controller -> Service -> Repository
- [Constraint]: "Infrastructure must depend on Domain, never the reverse."

## 6. Documentation Standards
- **Path:** All technical and business documentation must reside in the `/docs` folder.
- **Naming:** Files must use UPPER_SNAKE_CASE (e.g., TECHNICAL_SPECS.md).