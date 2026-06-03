# Changelog

## [1.4.0](https://github.com/SouzaEduardoAC/ai-agents/compare/v1.3.1...v1.4.0) (2026-06-03)


### Features

* **mcp:** implement command aliasing and agent discovery ([5c022cd](https://github.com/SouzaEduardoAC/ai-agents/commit/5c022cd43a2cfbdf400ff7418c2fc6914fdcfa58))
* **mcp:** update tool schema descriptions to guide agentic clients ([834f69a](https://github.com/SouzaEduardoAC/ai-agents/commit/834f69a446930e0440cc3db2bc7f45c8bd06393c))

## [1.3.1](https://github.com/SouzaEduardoAC/ai-agents/compare/v1.3.0...v1.3.1) (2026-06-03)


### Bug Fixes

* dynamically read package version from package.json in index.js a… ([70b07fb](https://github.com/SouzaEduardoAC/ai-agents/commit/70b07fb46f440b959aa6f5c59b3ec5e5743b92fa))
* dynamically read package version from package.json in index.js and CLI binary ([a7fad08](https://github.com/SouzaEduardoAC/ai-agents/commit/a7fad089e9101d2e1c319eded4c5c92c0c5a6ca1))

## [1.3.0](https://github.com/SouzaEduardoAC/ai-agents/compare/v1.2.0...v1.3.0) (2026-05-30)


### Features

* rename guru to Product Owner and oracle to Researcher for funct… ([4cd6685](https://github.com/SouzaEduardoAC/ai-agents/commit/4cd6685b72e94b51bf1f1988416f4b669e26e245))
* rename guru to Product Owner and oracle to Researcher for functional clarity ([ab3edfb](https://github.com/SouzaEduardoAC/ai-agents/commit/ab3edfbfe49565f064ceec870e60c3adf8926449))

## [1.2.0](https://github.com/SouzaEduardoAC/ai-agents/compare/v1.1.0...v1.2.0) (2026-05-30)


### Features

* create new Council agent for design and compliance debates ([4772144](https://github.com/SouzaEduardoAC/ai-agents/commit/4772144c5782bbc6970374294f36ff66074e99bd))
* rename brainstormer, researcher, and synthesizer agents to po, researcher, and decoder ([6ee4784](https://github.com/SouzaEduardoAC/ai-agents/commit/6ee4784074ddfe8a05d1fd811f04f1d29b4a10a8))

## [1.1.0](https://github.com/SouzaEduardoAC/ai-agents/compare/v1.0.0...v1.1.0) (2026-05-29)


### Features

* **protocol:** convert execution protocols to Logseq outliner graph … ([a615e79](https://github.com/SouzaEduardoAC/ai-agents/commit/a615e79d3325be8ce3b77065c2991bf9a283022d))
* **protocol:** convert execution protocols to Logseq outliner graph nodes ([8ff1a6d](https://github.com/SouzaEduardoAC/ai-agents/commit/8ff1a6d0fc1ac087435ef9c98a3c91396f5049fd))

## 1.0.0 (2026-05-29)


### Features

* add 'bootstrap' command to automatically setup Gemini slash commands ([2593b57](https://github.com/SouzaEduardoAC/ai-agents/commit/2593b5792a3011c5a3694e77c82acae92d557ddc))
* add Clarification Template for Product Owner Halt conditions ([cc9611f](https://github.com/SouzaEduardoAC/ai-agents/commit/cc9611ff00dbddd5b88a6728b332dc63fa9d8213))
* add common licensing knowledge and auto-inject into all agents ([f059cf6](https://github.com/SouzaEduardoAC/ai-agents/commit/f059cf666e8d42b6d98ab5c17f17100fd4b059c3))
* add Context7 MCP tool integration to all agents and documentation ([51b3a98](https://github.com/SouzaEduardoAC/ai-agents/commit/51b3a98d155c992493af62b69159cca1f4b391a3))
* add Master Orchestrator agent and Gemini /master command ([b571e5f](https://github.com/SouzaEduardoAC/ai-agents/commit/b571e5f31ea759f0ee98a31b6696a4cdd067fd1f))
* add n8n specialist agent and update documentation ([7a103cc](https://github.com/SouzaEduardoAC/ai-agents/commit/7a103cc1d8e0cc0fd18a1bd6097c2057c8bbd3c6))
* **po:** add product interview command and update PRD templates ([62d9e78](https://github.com/SouzaEduardoAC/ai-agents/commit/62d9e7801b18aa2ef7b9e0e5bab71f2581c08fe7))
* codify compliance trigger criteria for Master Orchestrator ([fa13a15](https://github.com/SouzaEduardoAC/ai-agents/commit/fa13a15862a9c777bf5275519e02d24dc3fc442c))
* **compiler:** inject active agent identity tag to response header ([0dbb6a1](https://github.com/SouzaEduardoAC/ai-agents/commit/0dbb6a1e0a088b5233f92cc347cec457d7ed25d5))
* **engineer:** implement mandatory Investigative Deep Dive phase ([7eee5b9](https://github.com/SouzaEduardoAC/ai-agents/commit/7eee5b93c213ed8fa8d4c3b3ba71652dcf0a8ab4))
* establish Base + Extension skill architecture ([93c962c](https://github.com/SouzaEduardoAC/ai-agents/commit/93c962c37ef4fd10a06867d279c851eb93f5c19f))
* expand Master Orchestrator pipeline and cross-agent delegation logic ([931d71d](https://github.com/SouzaEduardoAC/ai-agents/commit/931d71d8f92f95c0d58561b40018de7e42b34e39))
* explicitly integrate n8n for simple and complex automations in master pipeline ([b8e6c22](https://github.com/SouzaEduardoAC/ai-agents/commit/b8e6c22b26ef4af93b59451fd1b8dfc4522ac18b))
* **forge:** implement specialized meta-agent for agent creation, auditing, and upgrading ([240ade3](https://github.com/SouzaEduardoAC/ai-agents/commit/240ade3424235eb00879c7469f5b3a73e00e2d70))
* **hub:** prompt token pruning, dynamic scoping & resilient execution fallbacks ([a1f2dc2](https://github.com/SouzaEduardoAC/ai-agents/commit/a1f2dc23b18d6f64f3104e505ed55d537b717731))
* implement dual-anchor AI context protocol (AGENTS.md & GEMINI.md) ([8a4bccb](https://github.com/SouzaEduardoAC/ai-agents/commit/8a4bccbe201ec5d4138a9dd5f9bcca46946b8b9c))
* implement dynamic, domain-aware knowledge loading for backend, frontend, and mobile stacks ([8c6bec0](https://github.com/SouzaEduardoAC/ai-agents/commit/8c6bec0d988c5ef776ad0998a0e3faa463395d16))
* implement formal Gatekeeping Rubric for Product Owner discovery ([1d93869](https://github.com/SouzaEduardoAC/ai-agents/commit/1d93869b20c1da0bb5ac95cd0f19b9293fdb53dc))
* implement Logseq Knowledge Skill with centralized docs/ structure and MCP filesystem integration ([9bac47a](https://github.com/SouzaEduardoAC/ai-agents/commit/9bac47ae073bad8a6649b725d509ecc202ac6809))
* implement unified testing standards across all technical agents ([d9609a6](https://github.com/SouzaEduardoAC/ai-agents/commit/d9609a6d2c5b45e5bd6df8b2b484a9a17787c7d4))
* integrate google stitch MCP as recommended extension and upgrade agent capabilities ([8ff4d40](https://github.com/SouzaEduardoAC/ai-agents/commit/8ff4d40cc78806bf544edc92f06a5f46fb9c78ac))
* integrate playwright-cli and sonarqube MCP into core infrastructure and agent protocols ([9aa4e43](https://github.com/SouzaEduardoAC/ai-agents/commit/9aa4e43e4b0e4e539a184c3262849798074a6298))
* introduce Quicky agent, patch Forge and sync docs ([6198c52](https://github.com/SouzaEduardoAC/ai-agents/commit/6198c527c7474798ab4d8520334c8eff95718c01))
* **n8n:** implement 3-phase lifecycle and mandatory brainstorming ([7f8ac80](https://github.com/SouzaEduardoAC/ai-agents/commit/7f8ac80526e49c7de6ddff2fe34b17acde11875d))
* **n8n:** implement mandatory Investigative Deep Dive phase ([46eca20](https://github.com/SouzaEduardoAC/ai-agents/commit/46eca20abb308d06cb4b23176bc59a6f3b6f3718))
* overhaul agent architecture with specialized specialists and MCP integration ([9da1063](https://github.com/SouzaEduardoAC/ai-agents/commit/9da1063f40e665fdb504c853d2633a7410010597))
* **researcher:** implement mandatory Investigative Deep Dive phase ([8d68615](https://github.com/SouzaEduardoAC/ai-agents/commit/8d68615e38cabb6768cbad1c2f35be114af35c4d))
* synchronize n8n, researcher, and compliance agents with truth-first standards ([280c721](https://github.com/SouzaEduardoAC/ai-agents/commit/280c721255fdcfb2c31fe871efe52597f56fd9e7))
* **decoder:** implement specialized Decoder agent and export command ([6c9f259](https://github.com/SouzaEduardoAC/ai-agents/commit/6c9f2591edff03c05739e533515f87789df9bdc9))
* transform to Universal Agent Hub with PRD-first pipeline ([59510fd](https://github.com/SouzaEduardoAC/ai-agents/commit/59510fde62b584fb1935c6b567831359c7e9f96e))
* universal command support for all 4 LLMs ([fd5e386](https://github.com/SouzaEduardoAC/ai-agents/commit/fd5e3869e0640e74c75abb5de7d1a58cbdd63719))
* upgrade Product Owner to Critical Strategist with Reasoned Pushback logic ([88bfad0](https://github.com/SouzaEduardoAC/ai-agents/commit/88bfad05190b8edb12f3314725ccd5f33047ea13))


### Bug Fixes

* adjust quicky command directory structure ([822e6a5](https://github.com/SouzaEduardoAC/ai-agents/commit/822e6a5f6c0f6d90c1f24954be9fdd0954c5cac3))
* **compiler:** resolve prompt collisions and platform-specific leaks ([4f4a41a](https://github.com/SouzaEduardoAC/ai-agents/commit/4f4a41aa757c3a0e018b90551072dc3cd208175e))
* **deps:** address dependabot security vulnerabilities ([9476a1a](https://github.com/SouzaEduardoAC/ai-agents/commit/9476a1a7d6b1e4eb603541a0d5aa3e0cb3db7087))
* **hub:** resolve global AGENTS_ROOT path and bump package version to v1.1.0 ([90dab3f](https://github.com/SouzaEduardoAC/ai-agents/commit/90dab3ff3f5585fe5d57bc9d0df08b133c001ded))
