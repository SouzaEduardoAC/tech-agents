# Backend Specialist Agent

A high-performance backend engineering agent for Gemini CLI, focused on software implementation, architectural planning, and senior-level code review.

## Overview

The Backend Agent is designed for rigorous, logic-driven server-side development. It operates in distinct modes (DISCOVERY, PLAN, IMPLEMENT, REVIEW, SQUAD-FLOW) to ensure that every change is validated against project standards and ROI logic before execution.

## Core Components

- **Brain (`brain/persona.md`):** Defines the identity for the Systems Architect & Engineer.
- **Skills:**
    - `protocol.md`: Engineering Execution Protocol covering DISCOVERY, PLAN, IMPLEMENT, and SQUAD-FLOW modes.
    - `reviewer.md`: Specialized senior-level code review and audit logic.
    - `doc_maintainer.md`: High-fidelity documentation sync with AST-level precision.
    - `security_auditor.md`: 7-step security audit covering OWASP Top 10, dependencies, and compliance.
- **Knowledge Base (`knowledge/`):**
    - `git_standard.md`: Standards for commits and branching.
    - `docs_standard.md`: Documentation and code comment requirements.
    - `patterns.md`: Preferred architectural and design patterns.
    - `roi_logic.md`: Decision-making framework for refactoring and new features.
    - `dependencies.md`: System-wide dependency management.
    - `auth_standard.md`: Security and authentication protocols.
    - `bottlenecks.md`: 8-vector Performance Audit checklist.
    - `security_standards.md`: OWASP Top 10, severity levels, and compliance references.
- **Commands:**
    - `/backend:create`: Execute a complete, end-to-end backend lifecycle (Investigation -> Plan -> Implementation -> Review).
    - `/backend:auditor`: Audit code for patterns, security, and performance.
    - `/backend:docs`: Synchronize the current codebase logic with the technical documentation suite.

## Installation

### 1. Agent Files
Symlink the `backend/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/tech-agents/backend ~/.gemini/agents/backend
```

### 2. Global Commands
Register the backend commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/backend/commands/backend ~/.gemini/commands/backend
```

## Usage

### 1. Full Backend Lifecycle
Execute a complete task starting from a PRD file created by the Product Owner. This includes mandatory planning, implementation, and review gates:
```text
/backend:create "Add a rate-limiter middleware as specified in docs/prds/rate_limiter.md"
```

### 2. Auditing & Quality
Perform a general review, security audit, or performance check:
```text
/backend:auditor "Review the newly implemented OAuth2 Refactor."
/backend:auditor security "Audit the authentication module for vulnerabilities."
```

### 3. Documentation
Sync the backend codebase logic with the technical documentation:
```text
/backend:docs "Synchronize the current authentication module with the technical specs."
```


## Directory Structure

```text
backend/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # Technical standards and logic bases
├── skills/         # Specialized engineering protocols
└── templates/      # Plan and report templates
```
