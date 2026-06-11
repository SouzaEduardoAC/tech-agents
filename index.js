import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";
import toml from "toml";

const AGENTS_ROOT = path.dirname(fileURLToPath(import.meta.url));

const pkg = fs.readJsonSync(path.join(AGENTS_ROOT, "package.json"));

const server = new Server(
  {
    name: "agent-hub",
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Resolves probes like !{cat path} and !{gemini mcp list} inside a string.
 */
async function resolveProbes(content) {
  // 1. Resolve !{cat ...}
  const catRegex = /!\{cat\s+([^\}]+)\}/g;
  let resolvedContent = content;
  let match;
  
  while ((match = catRegex.exec(content)) !== null) {
    const rawPath = match[1].trim();
    // Normalize slashes to forward slashes for matching, but keep native for resolving
    const normalizedRaw = rawPath.replace(/\\/g, "/");
    const absolutePath = normalizedRaw.startsWith("~/.gemini/agents") 
      ? path.join(AGENTS_ROOT, normalizedRaw.replace("~/.gemini/agents/", ""))
      : path.resolve(AGENTS_ROOT, rawPath);

    try {
      const fileData = await fs.readFile(absolutePath, "utf-8");
      resolvedContent = resolvedContent.replace(match[0], fileData);
    } catch (e) {
      resolvedContent = resolvedContent.replace(match[0], `[Error reading file: ${rawPath}]`);
    }
  }

  // 2. Resolve !{gemini mcp list} 
  // For Claude/AntiGravity, we tell them to check their own toolset.
  resolvedContent = resolvedContent.replace(/!\{gemini mcp list\}/g, "[Context: Check your connected MCP tools for specialized capabilities.]");

  return resolvedContent;
}

async function readMarkdownDir(dirPath) {
  if (!(await fs.pathExists(dirPath))) return "";
  // Glob requires forward slashes, even on Windows where path.join uses backslashes
  const globPattern = path.join(dirPath, "*.md").replace(/\\/g, "/");
  const files = await glob(globPattern);
  let content = "";
  for (const file of files) {
    const fileContent = await fs.readFile(file, "utf-8");
    const fileName = path.basename(file);
    content += `\n### File: ${fileName}\n${fileContent}\n`;
  }
  return content;
}

/**
 * Combines deduplication and heuristic relevance filtering to optimize injected common files.
 */
async function compileCommonSection(dirPath, searchTarget, cattedBasenames, category) {
  if (!(await fs.pathExists(dirPath))) return "";
  const files = await fs.readdir(dirPath);
  let content = "";

  for (const file of files) {
    if (!file.endsWith(".md") && !file.endsWith(".toml")) continue;
    const basename = path.basename(file);

    // 1. Deduplication: Skip if already explicitly catted in the prompt
    if (cattedBasenames.has(basename)) {
      continue;
    }

    // 2. Heuristic Relevance Filtering
    let isRelevant = false;
    if (category === "knowledge") {
      if (basename === "auth_standard.md") {
        isRelevant = /auth|security|login|session|token|secret|jwt/.test(searchTarget);
      } else if (basename === "git_standard.md" || basename === "licensing.md" || basename === "testing_standard.md") {
        isRelevant = /create|implement|fix|refactor|audit|reviewer|test|dependency|npm|install/.test(searchTarget);
      } else {
        // Fallback: default to true for other standards
        isRelevant = true;
      }
    } else if (category === "skills") {
      // Pre-compute what the command already explicitly provides
      const hasLogseq = cattedBasenames.has("logseq_knowledge.md");
      const hasAgentReviewer = [...cattedBasenames].some(n => n.endsWith("reviewer.md"));
      const hasAgentSecurityAuditor = [...cattedBasenames].some(n => n.endsWith("security_auditor.md"));

      if (basename === "logseq_knowledge.md") {
        // Skip — already explicitly catted by the command; dedup above handles this,
        // but guard here too for clarity.
        isRelevant = false;
      } else if (basename === "doc_maintainer.md") {
        // doc_maintainer and logseq_knowledge are mutually exclusive protocols.
        // Only inject doc_maintainer when the command has NOT opted into Logseq.
        isRelevant = !hasLogseq &&
          /docs|document/.test(searchTarget) &&
          !/logseq/.test(searchTarget);
      } else if (basename === "base_reviewer.md") {
        // Only inject the generic base reviewer when the command has no agent-specific
        // reviewer already — prevents two competing review protocols in one prompt.
        isRelevant = !hasAgentReviewer &&
          /audit|review|create|implement|security|test|bottleneck|perf|fix|refactor/.test(searchTarget);
      } else if (basename === "base_security_auditor.md") {
        // Same guard for the security auditor base — skip when an agent-specific
        // security_auditor is already present.
        isRelevant = !hasAgentSecurityAuditor &&
          /audit|review|create|implement|security|test|bottleneck|perf|fix|refactor/.test(searchTarget);
      } else if (basename === "business_synthesis.md") {
        // Only inject business synthesis for commands that explicitly deal with
        // translating tech specs to business language. Council's debate protocol
        // supersedes this; injecting it there creates competing output formats.
        isRelevant = /synthesize|translate|export|stakeholder|business|report|decoder/.test(searchTarget);
      } else if (basename === "investigation.md") {
        // Only inject the internal investigation protocol for analyze-mode commands.
        // Injecting it into create/audit/fix prompts would add token overhead and
        // a conflicting read-only framing to action-oriented tasks.
        isRelevant = /analyze|analyse|investigation|investigate|simulate|hypothetical|what if|how would|behavior|behaviour|trace|csv|json|parse|data file/.test(searchTarget);
      } else if (basename === "pr_review.md") {
        // Only inject the PR review protocol for review-scoped commands that target
        // pull/merge requests. This prevents the cross-platform diff-fetching framing
        // from leaking into unrelated create/audit/analyze commands.
        isRelevant = /review|pull.?request|pull request|merge.?request|merge request|\bpr\b|\bmr\b|github\.com.*pull|gitlab\.com.*merge|dev\.azure\.com.*pullrequest|visualstudio\.com.*pullrequest/.test(searchTarget);
      } else {
        // Fallback: default to true for other skills
        isRelevant = true;
      }
    }

    if (isRelevant) {
      const fileContent = await fs.readFile(path.join(dirPath, file), "utf-8");
      content += `\n### File: ${basename}\n${fileContent}\n`;
    }
  }

  return content;
}

// Directories that are never user modules — skip them during depth-1 scan.
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".cache", ".idea", ".vscode",
  "dist", "build", "out", "target", ".next", ".nuxt", "coverage",
  "__pycache__", ".gradle", ".m2",
]);

/**
 * Scans the workspace for technology stack marker files.
 * Handles two layouts:
 *   A) Single-module: marker files (pom.xml, package.json, etc.) sit directly in CWD.
 *   B) Monorepo / multi-module: CWD is a project root whose children are module dirs,
 *      each containing their own marker files one level deeper.
 *
 * Returns:
 *   rootFiles    — file names found directly in CWD (Layout A)
 *   moduleFiles  — flat array of { file, module } pairs from immediate subdirs (Layout B)
 */
async function scanWorkspace() {
  const rootEntries = await fs.readdir(process.cwd(), { withFileTypes: true }).catch(() => []);
  const rootFiles = rootEntries.filter(e => e.isFile()).map(e => e.name);

  const moduleFiles = [];
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const subFiles = await fs.readdir(path.join(process.cwd(), entry.name)).catch(() => []);
    for (const f of subFiles) {
      moduleFiles.push({ file: f, module: entry.name });
    }
  }

  return { rootFiles, moduleFiles };
}

/**
 * Detects if a specific stack knowledge should be loaded based on the environment or task arguments.
 */
async function getDynamicKnowledge(taskArgs = "", agent = "") {
  const detectedStacks = [];
  const { rootFiles, moduleFiles } = await scanWorkspace();
  // files = rootFiles for backward-compat with single checks; moduleFiles used for depth-1 monorepo detection
  const files = rootFiles;
  const taskArgsLower = taskArgs.toLowerCase();

  // Helper: check if a marker filename exists at root OR in any immediate submodule.
  // Returns the module name if found in a submodule, "" if found at root, null if not found.
  const findMarker = (predicate) => {
    if (files.some(predicate)) return "";  // found at root
    const hit = moduleFiles.find(({ file }) => predicate(file));
    return hit ? hit.module : null;        // found in module, or null
  };

  const isBackendAgent = agent === "backend";
  const isFrontendAgent = agent === "frontend";
  const isMobileAgent = agent === "mobile";
  const isArchitect = agent === "architect";

  // --- BACKEND STACKS ---
  if (isBackendAgent || isArchitect) {
    // Detection Logic for .NET
    const dotnetModule = findMarker(f => f.endsWith('.csproj') || f.endsWith('.sln') || f === 'global.json');
    const hasDotnetMention = taskArgsLower.includes('dotnet') || taskArgsLower.includes('c#');
    if (dotnetModule !== null || hasDotnetMention) {
      const dotnetPath = path.join(AGENTS_ROOT, "common", "stacks", "dotnet.md");
      if (await fs.pathExists(dotnetPath)) {
        detectedStacks.push({ name: ".NET", file: "dotnet.md", path: dotnetPath, module: dotnetModule ?? "" });
      }
    }

    // Detection Logic for Java
    const javaModule = findMarker(f => f === 'pom.xml' || f === 'build.gradle' || f === 'build.gradle.kts' || f.endsWith('.java'));
    const hasJavaMention = taskArgsLower.includes('java') || taskArgsLower.includes('spring boot');
    if (javaModule !== null || hasJavaMention) {
      const javaPath = path.join(AGENTS_ROOT, "common", "stacks", "java.md");
      if (await fs.pathExists(javaPath)) {
        detectedStacks.push({ name: "Java / Spring Boot", file: "java.md", path: javaPath, module: javaModule ?? "" });
      }
    }

    // Detection Logic for Go
    const goModule = findMarker(f => f === 'go.mod' || f === 'go.sum' || f.endsWith('.go'));
    const hasGoMention = taskArgsLower.includes('golang') || (taskArgsLower.includes('go ') && !taskArgsLower.includes('google')) || taskArgsLower === 'go';
    if (goModule !== null || hasGoMention) {
      const goPath = path.join(AGENTS_ROOT, "common", "stacks", "go.md");
      if (await fs.pathExists(goPath)) {
        detectedStacks.push({ name: "Go (Golang)", file: "go.md", path: goPath, module: goModule ?? "" });
      }
    }
  }

  // --- FRONTEND STACKS ---
  if (isFrontendAgent || isArchitect) {
    // Detection Logic for React
    // Root: package.json + (App.js | App.tsx | src/) present
    // Module: package.json inside a subdir that contains "react" — read the file to confirm
    const hasReactMention = taskArgsLower.includes('react');
    let reactModule = null;
    if (!hasReactMention) {
      // Root check
      if (files.includes('package.json') && (files.includes('App.js') || files.includes('App.tsx') || files.includes('src'))) {
        const pkgContent = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8').catch(() => "");
        if (pkgContent.includes('"react"')) reactModule = "";
      }
      // Depth-1 check: find any module with a package.json containing "react"
      if (reactModule === null) {
        for (const { file, module } of moduleFiles) {
          if (file === 'package.json') {
            const pkgContent = await fs.readFile(path.join(process.cwd(), module, 'package.json'), 'utf8').catch(() => "");
            if (pkgContent.includes('"react"')) { reactModule = module; break; }
          }
        }
      }
    }
    if (hasReactMention || reactModule !== null) {
      const reactPath = path.join(AGENTS_ROOT, "common", "stacks", "react.md");
      if (await fs.pathExists(reactPath)) {
        detectedStacks.push({ name: "React", file: "react.md", path: reactPath, module: reactModule ?? "" });
      }
    }

    // Detection Logic for Angular
    const angularModule = findMarker(f => f === 'angular.json' || f === 'nx.json');
    const hasAngularMention = taskArgsLower.includes('angular');
    if (angularModule !== null || hasAngularMention) {
      const angularPath = path.join(AGENTS_ROOT, "common", "stacks", "angular.md");
      if (await fs.pathExists(angularPath)) {
        detectedStacks.push({ name: "Angular", file: "angular.md", path: angularPath, module: angularModule ?? "" });
      }
    }

    // Detection Logic for Vue
    const vueModule = findMarker(f => f.endsWith('.vue') || f === 'vue.config.js');
    const hasVueMention = taskArgsLower.includes('vue');
    if (vueModule !== null || hasVueMention) {
      const vuePath = path.join(AGENTS_ROOT, "common", "stacks", "vue.md");
      if (await fs.pathExists(vuePath)) {
        detectedStacks.push({ name: "Vue", file: "vue.md", path: vuePath, module: vueModule ?? "" });
      }
    }

    // Detection Logic for TypeScript
    const tsModule = findMarker(f => f === 'tsconfig.json' || f.endsWith('.ts') || f.endsWith('.tsx'));
    const hasTsMention = taskArgsLower.includes('typescript') || taskArgsLower.includes(' ts ');
    if (tsModule !== null || hasTsMention) {
      const tsPath = path.join(AGENTS_ROOT, "common", "stacks", "typescript.md");
      if (await fs.pathExists(tsPath)) {
        detectedStacks.push({ name: "TypeScript", file: "typescript.md", path: tsPath, module: tsModule ?? "" });
      }
    }

    // Detection Logic for JavaScript
    const jsModule = findMarker(f => f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs'));
    const hasJsMention = taskArgsLower.includes('javascript') || taskArgsLower.includes(' js ');
    if (jsModule !== null || hasJsMention) {
      const jsPath = path.join(AGENTS_ROOT, "common", "stacks", "javascript.md");
      if (await fs.pathExists(jsPath)) {
        detectedStacks.push({ name: "JavaScript", file: "javascript.md", path: jsPath, module: jsModule ?? "" });
      }
    }
  }

  // --- MOBILE STACKS ---
  if (isMobileAgent || isArchitect) {
    // Detection Logic for Flutter/Dart
    const flutterModule = findMarker(f => f === 'pubspec.yaml' || f.endsWith('.dart'));
    const hasFlutterMention = taskArgsLower.includes('flutter') || taskArgsLower.includes('dart');
    if (flutterModule !== null || hasFlutterMention) {
      const flutterPath = path.join(AGENTS_ROOT, "common", "stacks", "flutter.md");
      if (await fs.pathExists(flutterPath)) {
        detectedStacks.push({ name: "Flutter / Dart", file: "flutter.md", path: flutterPath, module: flutterModule ?? "" });
      }
    }
  }

  // Primary Stacks are key framework/languages (excluding TS/JS helpers to allow e.g. React + TS single-stack auto-load)
  const primaryStacks = ["dotnet.md", "java.md", "go.md", "react.md", "angular.md", "vue.md", "flutter.md"];
  const primaryDetected = detectedStacks.filter(s => primaryStacks.includes(s.file));

  // If multiple primary stacks are detected, use On-Demand Manifest mode.
  // Enriched with module attribution when stacks were found in subdirectories.
  if (primaryDetected.length > 1) {
    const isMonorepo = detectedStacks.some(s => s.module);
    let manifest = `\n### MULTIPLE STACKS DETECTED (On-Demand Mode Active)\n`;
    manifest += isMonorepo
      ? `The workspace root is a multi-module project. Each module uses a different technology stack.\n`
      : `The workspace contains multiple active technology stacks.\n`;
    manifest += `To prevent prompt collision and token bloat, stack reference guidelines have NOT been pre-injected.\n`;
    manifest += `You MUST read the relevant reference file before working in each module or stack area:\n\n`;
    for (const stack of detectedStacks) {
      const location = stack.module ? ` → module: \`${stack.module}/\`` : ` → workspace root`;
      manifest += `- **Stack:** ${stack.name}${location}\n  **Reference:** \`common/stacks/${stack.file}\`\n`;
    }
    manifest += `\nBefore editing any file, call view_file on the matching reference to align with project standards.\n`;
    return manifest;
  }

  // Otherwise, fallback to pre-loading all detected stacks (single-stack optimization)
  let content = "";
  for (const stack of detectedStacks) {
    const fileContent = await fs.readFile(stack.path, "utf-8");
    content += `\n### File: ${stack.file} (Dynamic Stack: ${stack.name} Detected)\n${fileContent}\n`;
  }

  return content;
}


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_agents",
        description: [
          "List all available specialized agents and their supported commands.",
          "Agents available: architect (systems design, security), backend (APIs, databases),",
          "frontend (UI, React/Angular/Vue), mobile (Flutter/iOS/Android), squad (full-stack orchestration),",
          "po (product discovery, PRDs), compliance (GDPR/HIPAA/SOC2 audits), council (multi-perspective debate & synthesis),",
          "researcher (deep investigation, reports), forge (meta-agent design), automata (workflow automation),",
          "decoder (tech-to-business translation), quicky (quick fixes), manager (workflow metrics, productivity audits).",
          "Call this first to discover exact agent names and their commands before calling call_agent_command.",
        ].join(" "),
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "call_agent_command",
        description: [
          "Activate a specialized agent and run one of its commands with a task description.",
          "Use this whenever the user asks to: 'call the council', 'have the architect design X',",
          "'run the backend agent', 'ask the squad to build X', 'get compliance to audit Y',",
          "'let the researcher investigate Z', 'use the PO for discovery', 'have forge create an agent',",
          "'get quicky to fix this', 'have the decoder translate this spec', 'have the manager audit productivity', or any similar delegation to a named agent.",
          "The assembled prompt returned by this tool IS the agent — adopt its persona and execute its instructions directly.",
          "Call list_agents first if you are unsure of the exact agent name or available commands.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend, squad, council, po, compliance, researcher, forge, automata, decoder, quicky, frontend, mobile, manager)." },
            command: { type: "string", description: "The command name. Common defaults: 'run' (squad), 'create' (architect/backend/frontend/mobile), 'debate' (council), 'discovery' (po), 'master' (compliance), 'report' (researcher), 'fix' (quicky), 'export' (decoder), 'productivity' (manager). Call list_agents to see all available commands." },
            args: { type: "string", description: "The full task description, goal, or user request to pass to the agent. Be specific — this becomes the agent's primary objective." },
          },
          required: ["agent", "command", "args"],
        },
      },
      {
        name: "get_agent_prompt",
        description: "Retrieve the full identity, persona, and knowledge base for a specific agent without executing a command. Use this to understand an agent's capabilities before calling call_agent_command, or to load an agent's persona into the current context.",
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend, council, manager)." },
          },
          required: ["agent"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_agents") {
      const dirs = await fs.readdir(AGENTS_ROOT, { withFileTypes: true });
      const agents = dirs
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "bin", "docs", "common", "test"].includes(d.name))
        .map((d) => d.name);

      const agentDetails = [];
      for (const agent of agents) {
        const cmdDir = path.join(AGENTS_ROOT, agent, "commands", agent);
        let commands = [];
        if (await fs.pathExists(cmdDir)) {
          const files = await fs.readdir(cmdDir);
          commands = files
            .filter((f) => f.endsWith(".toml"))
            .map((f) => path.basename(f, ".toml"));
        }
        agentDetails.push(`${agent} (${commands.join(", ") || "no commands"})`);
      }
      return { content: [{ type: "text", text: `Available agents and their commands:\n` + agentDetails.map(ad => `- ${ad}`).join("\n") }] };
    }

    if (name === "call_agent_command") {
      const { agent, command, args: taskArgs } = args;

      // Resolve aliases for command names that commonly map to standard agent entrypoints
      const aliases = {
        squad: { create: "run", discovery: "run", plan: "run" },
        architect: { discovery: "create", plan: "create", run: "create" },
        backend: { discovery: "create", plan: "create", run: "create" },
        frontend: { discovery: "create", plan: "create", run: "create" },
        mobile: { discovery: "create", plan: "create", run: "create" },
        po: { create: "discovery", run: "discovery" },
        automata: { discovery: "plan", run: "plan" },
        forge: { run: "create" },
        quicky: { run: "fix", create: "fix" },
        researcher: { run: "report", create: "report", discovery: "investigate" },
        compliance: { run: "master", create: "master" },
        council: { run: "debate", create: "debate" },
        decoder: { run: "export", create: "export", synthesize: "export" },
        manager: { run: "productivity", create: "productivity", audit: "productivity" }
      };

      let commandName = command;
      if (aliases[agent] && aliases[agent][command]) {
        commandName = aliases[agent][command];
      }

      const tomlPath = path.join(AGENTS_ROOT, agent, "commands", agent, `${commandName}.toml`);

      if (!(await fs.pathExists(tomlPath))) {
        const cmdDir = path.join(AGENTS_ROOT, agent, "commands", agent);
        let available = [];
        if (await fs.pathExists(cmdDir)) {
          const files = await fs.readdir(cmdDir);
          available = files.filter(f => f.endsWith(".toml")).map(f => path.basename(f, ".toml"));
        }
        throw new Error(
          `Command '${command}' for agent '${agent}' not found. ` +
          `Available commands for '${agent}': ${available.join(", ") || "none"}`
        );
      }

      const tomlData = toml.parse(await fs.readFile(tomlPath, "utf-8"));
      let prompt = tomlData.prompt || "";
      
      // Extract all catted basenames in the prompt to prevent double injection
      const cattedBasenames = new Set();
      const catMatches = prompt.matchAll(/!\{cat\s+([^\}]+)\}/g);
      for (const match of catMatches) {
        cattedBasenames.add(path.basename(match[1].trim()));
      }

      const searchTarget = `${commandName} ${tomlData.description || ""} ${taskArgs || ""}`.toLowerCase();

      // Inject Common Knowledge & Skills (Deduplicated and filtered by relevance)
      const commonKnowledge = await compileCommonSection(path.join(AGENTS_ROOT, "common", "knowledge"), searchTarget, cattedBasenames, "knowledge").catch(() => "");
      const commonSkills = await compileCommonSection(path.join(AGENTS_ROOT, "common", "skills"), searchTarget, cattedBasenames, "skills").catch(() => "");
      
      // Inject Dynamic Knowledge for Architect/Backend/Frontend/Mobile (language stack files, on-demand)
      let dynamicKnowledge = "";
      if (["architect", "backend", "frontend", "mobile"].includes(agent)) {
        dynamicKnowledge = await getDynamicKnowledge(taskArgs, agent);
      }

      // Auto-inject agent-level skills/ and knowledge/ dirs.
      // These are the agent's own identity files (protocols, reviewer skills, domain knowledge).
      // Dedup guard: skip any file whose basename was already explicitly !{cat}'d in the TOML prompt.
      const readAgentDirDeduped = async (dirPath) => {
        if (!(await fs.pathExists(dirPath))) return "";
        const globPattern = path.join(dirPath, "*.md").replace(/\\/g, "/");
        const files = await glob(globPattern);
        let content = "";
        for (const file of files) {
          const basename = path.basename(file);
          if (cattedBasenames.has(basename)) continue; // already injected via !{cat}
          const fileContent = await fs.readFile(file, "utf-8");
          content += `\n### File: ${basename}\n${fileContent}\n`;
        }
        return content;
      };
      const agentSkills = await readAgentDirDeduped(path.join(AGENTS_ROOT, agent, "skills")).catch(() => "");
      const agentKnowledge = await readAgentDirDeduped(path.join(AGENTS_ROOT, agent, "knowledge")).catch(() => "");

      const identityMeta = `### ACTIVE PERSONA CONTEXT
You are currently executing the command '${commandName}' as the **${agent.toUpperCase()}** agent.
To maintain transparency and multi-agent coordination, you MUST prefix your very first response line with a clean, prominent identity tag in the format:
\`[Agent: ${agent.toUpperCase()} | Command: ${commandName.toUpperCase()}]\`

--------------------------------------------------------------------------------\n\n`;

      prompt = `${identityMeta}# Common Standards\n${commonKnowledge}\n\n# Common Skills\n${commonSkills}\n\n# Dynamic Knowledge\n${dynamicKnowledge}\n\n# Agent Skills\n${agentSkills}\n\n# Agent Knowledge\n${agentKnowledge}\n\n${prompt}`;
      
      // Resolve {{args}}
      prompt = prompt.replace(/\{\{args\}\}/g, taskArgs);
      
      // Resolve internal !{cat ...} probes for universal use
      const finalPrompt = await resolveProbes(prompt);

      return { content: [{ type: "text", text: finalPrompt }] };
    }

    if (name === "get_agent_prompt") {
      const agent = args.agent;
      const agentPath = path.join(AGENTS_ROOT, agent);
      const persona = await fs.readFile(path.join(agentPath, "brain", "persona.md"), "utf-8").catch(() => "");
      const skills = await readMarkdownDir(path.join(agentPath, "skills")).catch(() => "");
      const knowledge = await readMarkdownDir(path.join(agentPath, "knowledge")).catch(() => "");
      const cattedBasenames = new Set();
      const searchTarget = `${agent} ${persona}`.toLowerCase();
      const commonKnowledge = await compileCommonSection(path.join(AGENTS_ROOT, "common", "knowledge"), searchTarget, cattedBasenames, "knowledge").catch(() => "");
      const commonSkills = await compileCommonSection(path.join(AGENTS_ROOT, "common", "skills"), searchTarget, cattedBasenames, "skills").catch(() => "");

      // Inject Dynamic Knowledge for Architect/Backend/Frontend/Mobile
      let dynamicKnowledge = "";
      if (["architect", "backend", "frontend", "mobile"].includes(agent)) {
        dynamicKnowledge = await getDynamicKnowledge("", agent);
      }

      const fullPrompt = `
# Persona: ${agent}
${persona}

# Common Standards
${commonKnowledge}

# Common Skills
${commonSkills}

# Skills
${skills}

# Dynamic Knowledge Base
${dynamicKnowledge}

# Knowledge Base
${knowledge}
      `;
      return { content: [{ type: "text", text: fullPrompt.trim() }] };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[agent-hub] MCP Server v${pkg.version} running on stdio\n`);
} catch (e) {
  process.stderr.write(`[agent-hub] FATAL: ${e.message}\n${e.stack}\n`);
  process.exit(1);
}
