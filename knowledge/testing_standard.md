# Testing & Quality Assurance Standards

This standard governs the verification and validation of all code changes across the agentic framework.

## 1. Core Philosophy: "Unverified Code is Debt"
- **Business Logic First:** All business rules, calculations, and domain logic MUST be covered by unit tests.
- **Regression Protection:** Every bug fix must include a regression test that reproduces the failure state before the fix is applied.
- **The 100% Rule:** No code is delivered if existing or new tests are failing.

## 2. Testing Levels
- **Unit Tests:** Focus on isolated business logic. Mock all external dependencies (DB, APIs).
- **Integration Tests:** Verify the interaction between the system and its immediate dependencies (e.g., API endpoints, Repository layers).
- **E2E/Smoke Tests:** High-level validation of the "Golden Path" for critical user journeys.

## 3. Implementation Protocol
1.  **Reproduction (Bug Fixes):** Before implementing a fix, write a test that fails.
2.  **Logic Verification:** For new features, tests must cover:
    - **Happy Path:** Expected behavior.
    - **Edge Cases:** Boundary values, empty states.
    - **Failure Modes:** How the system handles errors or invalid input.
3.  **Performance Check:** If the change touches high-volume loops or expensive IO, include a basic performance benchmark or time-complexity audit.

## 4. Test Quality Gate
- **Readability:** Tests must serve as documentation for the business rules.
- **Independence:** Tests must not depend on each other or a specific execution order.
- **Determinism:** Tests must produce the same result every time (no "flaky" tests).
