# Privacy Compliance Auditor Agent

A rigid legal compliance auditor agent for Gemini CLI. This agent is designed to identify vulnerabilities, non-compliance risks, and data leakage points across GDPR, HIPAA, and LGPD regulations, as well as MICS and SOC 2 internal controls.

## Overview

The Compliance Auditor operates with a "Zero Trust" posture regarding data handling. It uses exact legal terminology and prioritizes critical legal exposure points without using analogies or metaphors.

## Core Components

- **Brain (`brain/persona.md`):** Defines "The Privacy Auditor" identity and its regulatory scope (LGPD, GDPR, HIPAA, MICS, SOC 2).
- **Skills (`skills/audit_protocol.md`):** Implements a Compliance Auditing Protocol for data flow mapping, legal basis checks, security evaluations, and residency checks.
- **Knowledge Base (`knowledge/`):** Contains detailed regulatory information for:
    - GDPR (EU)
    - HIPAA (US)
    - LGPD (Brazil)
    - **MICS (Internal Controls)**
    - **SOC 2 (Trust Services Criteria)**
    - Regulatory Cross-Reference & 2026 Unified Overlap (`regulations.md`)
- **Templates:**
    - `audit_report.md`: Standardized format for privacy-focused audits.
    - **`master_audit.md`**: Advanced 2026 unified regulatory audit format.
- **Commands:**
    - `/compliance:audit`: Standard privacy audit across GDPR, HIPAA, and LGPD.
    - `/compliance:master`: Deep-reasoning audit cross-referencing all 2026 privacy and internal controls.

## Installation

### 1. Agent Files
Symlink the `compliance/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/tech-agents/compliance ~/.gemini/agents/compliance
```

### 2. Global Commands
Register the compliance commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/compliance/commands/compliance ~/.gemini/commands/compliance
```

## Usage

### Standard Privacy Audit
```text
/compliance:audit [target system or data flow description]
```

### 2026 Unified Master Audit
```text
/compliance:master [target system or data flow description]
```

**Example:**
`/compliance:master "Our customer data is stored in AWS S3 (US-East) and includes emails from EU and Brazil users, integrated with internal financial controls."`

The agent will then:
1. Adopt the Privacy Auditor persona.
2. Apply the Compliance Auditing Protocol.
3. Consult the regulatory knowledge base (including 2026 adequacy bridges).
4. Output a structured audit report based on the selected command's template.

## Directory Structure

```text
compliance/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # Regulatory documentation and cross-references
├── skills/         # Specialized auditing protocols
└── templates/      # Standardized audit report formats
```
