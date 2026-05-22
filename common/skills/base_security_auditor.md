# Base Skill: Security Auditor Protocol

## Universal Audit Steps

### 1. Code & Vulnerability Scan
- Examine code for OWASP Top 10 vulnerabilities.
- Review authentication and authorization flows for logic flaws.
- Scan for hardcoded secrets (passwords, tokens, API keys).

### 2. Dependency & Input Safety
- Review dependency manifests for known CVEs.
- Verify all user-controlled inputs are validated and sanitized.
- Identify sensitive data exposure in responses, logs, or storage.

### 3. Data Protection
- Verify encryption is applied at rest and in transit.
- Confirm no secrets appear in source code, logs, or error messages.

## Output Format Requirements
For each finding, report: Severity, Description, Location, Impact, Remediation, and Prevention.
Deliver a final **Prioritized Findings Summary** ordered by severity.

## Cross-Client Resilient Execution Rules
- **Shell-less Environment Fallback:**
  - If running in a client that does not support direct command execution (e.g., Gemini CLI without command-running tools), do **NOT** fail.
  - Instead, write out the exact command you wanted to run (e.g., `npm audit`, static secret scans) and prompt the user to execute it and provide the console output.
  - Conduct an equivalent manual static audit of files (e.g. searching for typical patterns like `apiKey`, `password`, `secret`, `jwt` in package manifests and source files) using available file-reading and grep tools.
- **MCP Tool Degraded Mode:**
  - If SonarQube, Playwright, or other specialized auditor MCPs are offline or unavailable, gracefully downgrade to thorough static code and pattern analysis.
  - Review database schemas, routing logs, session configurations, and auth filters manually via native file reading.
