# Frontend Specialist Agent

A high-performance frontend engineering agent for Gemini CLI, specialized in VueJS, AngularJS, and ReactJS development, component architecture, and UI/UX optimization.

## Overview

The Frontend Agent is designed for building accessible, high-performance user interfaces. It operates in distinct modes (DISCOVERY, PLAN, IMPLEMENT, REVIEW, SQUAD-FLOW) to ensure that every UI component is validated against best practices, performance metrics (Web Vitals), and ROI logic.

## Core Components

- **Brain (`brain/persona.md`):** Defines the identity for the Frontend Architect & Specialist (Vue, Angular, React).
- **Skills:**
    - `protocol.md`: Engineering Execution Protocol covering UI DISCOVERY, PLAN, and IMPLEMENT modes.
    - `reviewer.md`: Specialized senior-level UI review, A11y audit, and performance analysis.
    - `doc_maintainer.md`: High-fidelity UI documentation sync with component-level precision.
    - `security_auditor.md`: Frontend security audit covering XSS, CSRF, CSP, and NPM vulnerabilities.
- **Knowledge Base (`knowledge/`):**
    - `git_standard.md`: Standards for UI-focused commits and branching.
    - `docs_standard.md`: UI documentation and component comment requirements.
    - `patterns.md`: Component architecture and state management patterns (Atomic, Redux, Pinia, etc.).
    - `roi_logic.md`: Decision-making framework for UI features, Lighthouse scores, and conversion.
    - `dependencies.md`: Frontend ecosystem (Vite, Frameworks, Testing, CSS).
    - `security_standards.md`: Frontend-specific security vulnerabilities (XSS, CSP, Auth storage).
    - `bottlenecks.md`: Web Vitals, Bundle Size, and Rendering performance checklist.
- **Commands:**
    - `/frontend:create`: Execute a complete, end-to-end frontend lifecycle (Investigation -> Plan -> Implementation -> Review).
    - `/frontend:auditor`: Audit UI code for patterns, security, accessibility, and performance.
    - `/frontend:docs`: Synchronize the UI codebase logic with the technical documentation suite.

## Installation

### 1. Agent Files
Symlink the `frontend/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/tech-agents/frontend ~/.gemini/agents/frontend
```

### 2. Global Commands
Register the frontend commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/frontend/commands/frontend ~/.gemini/commands/frontend
```

## Usage

### 1. Full Frontend Lifecycle
Execute a complete UI task starting from a PRD file created by the Product Owner. This includes mandatory planning, implementation, and review gates:
```text
/frontend:create "Add a multi-step registration form as specified in docs/prds/registration_form.md"
```

### 2. Auditing & Quality
Perform a general UI review, security audit, or performance check:
```text
/frontend:auditor "Review the newly implemented React Context for global state."
/frontend:auditor security "Audit the user input fields for potential XSS vulnerabilities."
```

### 3. Documentation
Sync the UI codebase logic with the technical documentation:
```text
/frontend:docs "Synchronize the checkout flow components with the technical specs."
```


## Directory Structure

```text
frontend/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # Technical standards and logic bases
├── skills/         # Specialized engineering protocols
└── templates/      # Plan and report templates
```
