# Mobile Specialist Agent (Dart/Flutter)

A high-performance mobile engineering agent for Gemini CLI, specialized in Dart and Flutter development, cross-platform architecture, and mobile-specific performance optimization.

## Overview

The Mobile Agent is designed for building beautiful, 60/120 FPS mobile applications. It operates in distinct modes (DISCOVERY, PLAN, IMPLEMENT, REVIEW, SQUAD-FLOW) to ensure that every mobile component is validated against best practices, frame rate metrics (Jank), and platform guidelines (Material/Cupertino).

## Core Components

- **Brain (`brain/persona.md`):** Defines the identity for the Mobile Architect & Specialist (Dart/Flutter).
- **Skills:**
    - `protocol.md`: Engineering Execution Protocol covering Mobile DISCOVERY, PLAN, and IMPLEMENT modes.
    - `reviewer.md`: Specialized senior-level Mobile review, A11y audit, and frame-rate analysis.
    - `doc_maintainer.md`: High-fidelity Mobile documentation sync with widget-level precision.
    - `security_auditor.md`: Mobile security audit covering Secure Storage, TLS, and Reverse Engineering.
- **Knowledge Base (`knowledge/`):**
    - `git_standard.md`: Standards for Mobile-focused commits and branching.
    - `docs_standard.md`: Mobile documentation and widget comment requirements.
    - `patterns.md`: Mobile & Flutter design patterns (BLoC, Riverpod, Clean Architecture).
    - `roi_logic.md`: Decision-making framework for Mobile features, App Store ratings, and retention.
    - `dependencies.md`: Mobile ecosystem (Dart, Flutter, Pub.dev, Native Interop).
    - `security_standards.md`: Mobile-specific security vulnerabilities (OWASP Mobile Top 10).
    - `bottlenecks.md`: Jank, Memory Leaks, and Binary Size performance checklist.
- **Commands:**
    - `/mobile:create`: Execute a complete, end-to-end mobile lifecycle (Investigation -> Plan -> Implementation -> Review).
    - `/mobile:auditor`: Audit mobile code for patterns, security, and performance.
    - `/mobile:docs`: Synchronize the mobile codebase logic with the technical documentation suite.

## Installation

### 1. Agent Files
Symlink the `mobile/` directory to your global Gemini agents folder:
```bash
ln -s /path/to/tech-agents/mobile ~/.gemini/agents/mobile
```

### 2. Global Commands
Register the mobile commands by symlinking the namespaced directory to your global commands:
```bash
ln -s ~/.gemini/agents/mobile/commands/mobile ~/.gemini/commands/mobile
```

## Usage

### 1. Full Mobile Lifecycle
Execute a complete mobile task starting from a PRD file created by the Product Owner. This includes mandatory planning, implementation, and review gates:
```text
/mobile:create "Add a real-time chat screen as specified in docs/prds/chat_feature.md"
```

### 2. Auditing & Quality
Perform a general mobile review, security audit, or performance check:
```text
/mobile:auditor "Review the newly implemented Riverpod providers for state sharing."
/mobile:auditor security "Audit the secure storage implementation for sensitive tokens."
```

### 3. Documentation
Sync the mobile codebase logic with the technical documentation:
```text
/mobile:docs "Synchronize the authentication flow widgets with the technical specs."
```


## Directory Structure

```text
mobile/
├── brain/          # Persona and identity definitions
├── commands/       # Slash command configurations (.toml)
├── knowledge/      # Technical standards and logic bases
├── skills/         # Specialized engineering protocols
└── templates/      # Plan and report templates
```
