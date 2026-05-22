# Skill: Business Synthesis & Semantic Translation Protocol

This skill enables specialized agents to bridge the gap between highly technical, developer-optimized Logseq graph files and human-readable, professional business specifications for Business Analysts (BAs), Product Owners (POs), and other non-technical stakeholders.

## 1. Semantic Deduction Protocol

When requested to export a business flow, the agent might receive colloquial or approximate names (e.g., "retry system", "discount flow") rather than exact Logseq node names (e.g., `[[VIPDiscountCalculator]]`). The agent MUST use the following lookup and deduction mechanism:

1. **Scan the Central Registry:** First, load and inspect `docs/pages/registry.md` to identify active feature names and associated node mappings.
2. **Resolve by Synonym Mapping:** Search through all page headers and bodies in the `docs/pages/` folder. Parse the metadata (`title::`, `type::`) and textual descriptions to match colloquial business terms to the most likely technical node.
3. **Handle Ambiguity/Fuzzy Matches:**
   - If a direct match is found (e.g., "Standardized Pipeline" maps to `[[Standardized Pipeline]]`), load it.
   - If a fuzzy or semantic match is found (e.g., "token saving optimization" matches `[[TECHNICAL_SPECS]]`'s context optimization section), map it.
   - In the exported document, include a **Metadata Header** that explicitly documents the translation mapping:
     ```markdown
     # Business Specification: [Flow Name]
     
     ## Translation Registry
     * **Input Term:** "colloquial query term"
     * **Resolved Node:** [[Exact Technical Node Name]]
     * **Deduction Rationale:** Explanation of why this mapping was chosen.
     ```

---

## 2. Technical Noise Pruning Rules

All developer-centric technical details must be stripped out to maximize stakeholder readability.

1. **Prune AST Citations:** Automatically locate and remove all inline and trailing AST citations in the format `(ref: symbol)` or `(ref: file -> symbol)`.
2. **Strip System Properties:** Completely remove standard Logseq property key-value lines:
   - Lines matching `^\t*-?\s*[a-zA-Z0-9_]+::` (e.g., `httpStatus::`, `class::`, `table::`, `version::`, `status::`).
3. **Simplify Identifiers:** Translate technical code identifiers, classes, or database tables to natural English:
   - Translate camelCase, snake_case, or PascalCase names to spaced, readable terms (e.g., `VIPDiscountCalculator` -> "VIP Discount Calculator", `tbl_user_session` -> "User Session Table").

---

## 3. Structural Formatting & Synthesis

Raw Logseq files are heavily tab-indented outlines. The agent must convert these outlines into polished, high-fidelity business documentation structures:

### A. Business Rules Matrices (Tabular Logic Conversion)
Deeply nested bullet branches describing if-else logical structures, error codes, validation checks, or pricing tiers must be synthesized into **Markdown Tables**:
* Columns must be clean and highly legible, e.g.:
  | Scenario / Condition | Rule / Business Requirement | Expected Action / Outcome |
  | :--- | :--- | :--- |
  | VIP Customer with lifetime purchases > $500 | Apply automatic 15% discount at checkout | Reduce basket subtotal, apply `VIP_15` coupon |
  | Checkout fails due to card network timeout | Retry transaction automatically up to 3 times before prompting user | Delay retry by 2s, log telemetry, alert frontend |

### B. User-Centric Journeys (Mermaid Flowchart Translation)
Raw Mermaid flowchart code (`graph TD`, `sequenceDiagram`, etc.) or highly technical sequence lists must be translated into clear, step-by-step narrative journeys:
* Structure these journeys as logical stages from the end-user's perspective:
  1. **Stage 1: Initial Request:** Describe what the user does (e.g., "The customer clicks checkout and selects standard shipping").
  2. **Stage 2: Behind-the-Scenes Verification:** Describe the business logic verification in plain English (e.g., "The system verifies inventory availability and validates the customer session").
  3. **Stage 3: Success or Fallback:** Describe the output and user experience under success and error scenarios.

---

## 4. Universal Export Target

All business exports must be written to the `docs/exports/` directory relative to the active workspace root:
* **Filename Pattern:** `docs/exports/[flow-name-slug]_BUSINESS_SPEC.md`
* If the `docs/exports/` folder does not exist, the agent must create it.
* The exported file must always include standard metadata, clean Markdown headers (`#`, `##`, `###`), standard body text, matrices/tables, and clear bullet points without tab-nesting or system tags.
