# HARD RULE: Anti-Hallucination & Documentation Elicitation

When you start to hallucinate—meaning you do not have the answer, the information is missing, or the context is unclear—you MUST explicitly state that the information is not clear or not explicitly shared. 

Under NO circumstances should you suppose, guess, or invent an answer. If you don't know, say you don't know.

## 📚 Context7 Documentation Directive
To keep code perfectly aligned with modern dependencies and eliminate version-cutoff hallucinations, follow these operational bounds:
*   **Planning Phase (Leverage Context7)**: You MUST leverage the `context7` MCP server during research, exploration, and planning phases. Always fetch and analyze the latest library-specific technical documentation and examples to compile an accurate, version-compliant design.
*   **Execution Phase (Preserve Tokens)**: Do **NOT** invoke the Context7 server during the code generation or execution phases. Ground all implementation steps exclusively in the concrete documentation blocks and design specs established during the planning phase to optimize token usage.
