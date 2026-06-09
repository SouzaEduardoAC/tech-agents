# Skill: Internal Investigation Protocol

## Purpose
A structured, read-only behavioral simulation skill. Use it to answer questions grounded in actual files, code, and data — not assumptions or memory. This skill produces no output artifacts, triggers no implementation commands, and has no side effects. Its sole output is an accurate, grounded answer.

---

## Phase 0: Asset Mapping
Before touching anything, identify every file relevant to the question.

1. **Locate referenced files.** Use `view_file` or `grep_search` to find source files, data files (CSV, JSON, YAML, TOML), configs, or schemas mentioned in the question.
2. **Map code entry points.** Identify the function, method, class, or service that processes the target data — find it by name or by tracing imports and dependencies.
3. **Hard rule — never assume file content.** If a file is referenced but cannot be located, **STOP** and tell the user explicitly: what file is missing and what path was searched. Do not reason about its contents from memory or training data.
4. **Declare your map.** Before proceeding, state clearly: which files you found, which functions you will trace, and what question you are answering.

---

## Phase 1: Data Profiling
Read and structurally understand the input before tracing any logic.

- **For CSV files:** Parse headers, infer data types per column, identify nullable fields, estimate cardinality, and flag any structurally inconsistent rows.
- **For JSON files:** Map the top-level schema, nesting depth, key types, required vs. optional fields, and any fields with polymorphic or ambiguous values.
- **For YAML / TOML / config files:** Identify the configuration surface — which keys affect behavior, which have defaults, which are required.
- **For source files (code):** Identify the function signature, parameter types, return types, and declared constraints (null checks, validations, guards).

State the profiled structure explicitly before moving to Phase 2. Do not simulate behavior against an assumed structure.

---

## Phase 2: Behavioral Simulation
Trace the code path step-by-step against the profiled data — real input or a hypothetical scenario.

1. **Apply the input.** Feed the profiled data (or the stated hypothetical) into the identified entry point, step by step.
2. **Follow every branch.** For each conditional (`if`, `switch`, `guard`, `match`), state which branch executes and why.
3. **Flag edge cases explicitly.** For each of the following, state whether the code handles it correctly, silently ignores it, or throws:
   - Null / undefined / missing required fields
   - Type mismatches (e.g., string where integer is expected)
   - Boundary values (zero, empty array, max int, empty string)
   - Unexpected enum values or out-of-range inputs
4. **Track state mutations.** If the code modifies the input, note what changes and at which step.
5. **Surface side effects.** Flag any external calls (DB writes, HTTP requests, queue pushes) that would be triggered by this data path, even if they are not the focus of the question.

---

## Phase 3: Findings Report
Deliver a structured, direct answer. No filler, no hedging.

```
### Behavioral Simulation — Findings

**Question:** [Restate the original question exactly]
**Files traced:** [List every file read]
**Input profiled:** [One-line summary of the data structure]

---

**Observed behavior:**
[Step-by-step trace result — what the code actually does with this input]

**Edge cases identified:**
- [Case]: [Handled / Unhandled / Throws — with the specific line or function responsible]

**Risks:**
- [Any data integrity, runtime, or logical risk surfaced during the trace]

**Direct answer:**
[A single, unambiguous answer to the original question]
```

If the simulation is inconclusive because a file was missing, a function body was inaccessible, or the code path is non-deterministic, state that explicitly instead of guessing.
