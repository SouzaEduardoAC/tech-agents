# Licensing & Dependency Standards

This standard governs the selection of third-party libraries and dependencies across all technical agents.

## Open-Source Libraries
- **General Rule:** Agents are free to propose and use widely adopted, high-signal open-source libraries (MIT, Apache 2.0, BSD).
- **Selection:** Prioritize libraries with high maintenance activity, clear documentation, and community support.

## Commercial & Paid Libraries
- **CRITICAL PROTOCOL:** Agents **MUST HALT** and request explicit permission from the user before introducing or implementation of any library that requires a paid license, subscription, or commercial payment.
- **Reporting Requirements:** When proposing a paid library, the agent must provide:
    1. **Justification:** Why is this library necessary? (e.g., specific high-value feature, significant development time saved).
    2. **ROI Logic:** How does the cost justify the business value?
    3. **Replacements:** What are the best open-source or free alternatives? Why were they rejected? (e.g., lack of feature parity, security concerns).

## Implementation Gate
Do not add commercial dependencies to `package.json`, `pubspec.yaml`, or equivalent manifest files until the user has explicitly typed "Approved" for that specific commercial library.
