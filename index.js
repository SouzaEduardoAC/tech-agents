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

/**
 * Detects if a specific stack knowledge should be loaded based on the environment or task arguments.
 */
async function getDynamicKnowledge(taskArgs = "", agent = "") {
  const detectedStacks = [];
  const files = await fs.readdir(process.cwd()).catch(() => []);
  const taskArgsLower = taskArgs.toLowerCase();

  const isBackendAgent = agent === "backend";
  const isFrontendAgent = agent === "frontend";
  const isMobileAgent = agent === "mobile";
  const isArchitect = agent === "architect";

  // --- BACKEND STACKS ---
  if (isBackendAgent || isArchitect) {
    // Detection Logic for .NET
    const hasDotnetFiles = files.some(f => f.endsWith('.csproj') || f.endsWith('.sln') || f === 'global.json');
    const hasDotnetMention = taskArgsLower.includes('dotnet') || taskArgsLower.includes('c#');
    if (hasDotnetFiles || hasDotnetMention) {
      const dotnetPath = path.join(AGENTS_ROOT, "common", "stacks", "dotnet.md");
      if (await fs.pathExists(dotnetPath)) {
        detectedStacks.push({
          name: ".NET",
          file: "dotnet.md",
          path: dotnetPath
        });
      }
    }

    // Detection Logic for Java
    const hasJavaFiles = files.some(f => f === 'pom.xml' || f === 'build.gradle' || f === 'build.gradle.kts' || f.endsWith('.java'));
    const hasJavaMention = taskArgsLower.includes('java') || taskArgsLower.includes('spring boot');
    if (hasJavaFiles || hasJavaMention) {
      const javaPath = path.join(AGENTS_ROOT, "common", "stacks", "java.md");
      if (await fs.pathExists(javaPath)) {
        detectedStacks.push({
          name: "Java / Spring Boot",
          file: "java.md",
          path: javaPath
        });
      }
    }

    // Detection Logic for Go
    const hasGoFiles = files.some(f => f === 'go.mod' || f === 'go.sum' || f.endsWith('.go'));
    const hasGoMention = taskArgsLower.includes('golang') || (taskArgsLower.includes('go ') && !taskArgsLower.includes('google')) || taskArgsLower === 'go';
    if (hasGoFiles || hasGoMention) {
      const goPath = path.join(AGENTS_ROOT, "common", "stacks", "go.md");
      if (await fs.pathExists(goPath)) {
        detectedStacks.push({
          name: "Go (Golang)",
          file: "go.md",
          path: goPath
        });
      }
    }
  }

  // --- FRONTEND STACKS ---
  if (isFrontendAgent || isArchitect) {
    // Detection Logic for React
    const hasReactFiles = files.some(f => f === 'package.json') && (files.includes('App.js') || files.includes('App.tsx') || files.includes('src')); 
    const hasReactMention = taskArgsLower.includes('react');
    if (hasReactMention || (hasReactFiles && (await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8').catch(() => "")).includes('"react"'))) {
      const reactPath = path.join(AGENTS_ROOT, "common", "stacks", "react.md");
      if (await fs.pathExists(reactPath)) {
        detectedStacks.push({
          name: "React",
          file: "react.md",
          path: reactPath
        });
      }
    }

    // Detection Logic for Angular
    const hasAngularFiles = files.some(f => f === 'angular.json' || f === 'nx.json');
    const hasAngularMention = taskArgsLower.includes('angular');
    if (hasAngularFiles || hasAngularMention) {
      const angularPath = path.join(AGENTS_ROOT, "common", "stacks", "angular.md");
      if (await fs.pathExists(angularPath)) {
        detectedStacks.push({
          name: "Angular",
          file: "angular.md",
          path: angularPath
        });
      }
    }

    // Detection Logic for Vue
    const hasVueFiles = files.some(f => f.endsWith('.vue') || f === 'vue.config.js');
    const hasVueMention = taskArgsLower.includes('vue');
    if (hasVueFiles || hasVueMention) {
      const vuePath = path.join(AGENTS_ROOT, "common", "stacks", "vue.md");
      if (await fs.pathExists(vuePath)) {
        detectedStacks.push({
          name: "Vue",
          file: "vue.md",
          path: vuePath
        });
      }
    }

    // Detection Logic for TypeScript
    const hasTsFiles = files.some(f => f === 'tsconfig.json' || f.endsWith('.ts') || f.endsWith('.tsx'));
    const hasTsMention = taskArgsLower.includes('typescript') || taskArgsLower.includes(' ts ');
    if (hasTsFiles || hasTsMention) {
      const tsPath = path.join(AGENTS_ROOT, "common", "stacks", "typescript.md");
      if (await fs.pathExists(tsPath)) {
        detectedStacks.push({
          name: "TypeScript",
          file: "typescript.md",
          path: tsPath
        });
      }
    }

    // Detection Logic for JavaScript
    const hasJsFiles = files.some(f => f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs'));
    const hasJsMention = taskArgsLower.includes('javascript') || taskArgsLower.includes(' js ');
    if (hasJsFiles || hasJsMention) {
      const jsPath = path.join(AGENTS_ROOT, "common", "stacks", "javascript.md");
      if (await fs.pathExists(jsPath)) {
        detectedStacks.push({
          name: "JavaScript",
          file: "javascript.md",
          path: jsPath
        });
      }
    }
  }

  // --- MOBILE STACKS ---
  if (isMobileAgent || isArchitect) {
    // Detection Logic for Flutter/Dart
    const hasFlutterFiles = files.some(f => f === 'pubspec.yaml' || f.endsWith('.dart'));
    const hasFlutterMention = taskArgsLower.includes('flutter') || taskArgsLower.includes('dart');
    if (hasFlutterFiles || hasFlutterMention) {
      const flutterPath = path.join(AGENTS_ROOT, "common", "stacks", "flutter.md");
      if (await fs.pathExists(flutterPath)) {
        detectedStacks.push({
          name: "Flutter / Dart",
          file: "flutter.md",
          path: flutterPath
        });
      }
    }
  }

  // Primary Stacks are key framework/languages (excluding TS/JS helpers to allow e.g. React + TS single-stack auto-load)
  const primaryStacks = ["dotnet.md", "java.md", "go.md", "react.md", "angular.md", "vue.md", "flutter.md"];
  const primaryDetected = detectedStacks.filter(s => primaryStacks.includes(s.file));

  // If multiple primary stacks are detected, use Option B (On-Demand Manifest)
  if (primaryDetected.length > 1) {
    let manifest = `\n### MULTIPLE STACKS DETECTED (On-Demand Mode Active)\n`;
    manifest += `The workspace contains multiple active technology stacks. To prevent prompt collision and token bloat, the reference guidelines have NOT been pre-injected.\n`;
    manifest += `You MUST dynamically inspect and read the relevant reference files using your 'view_file' tool before planning or executing tasks in those subdirectories:\n\n`;
    for (const stack of detectedStacks) {
      manifest += `- **Stack:** ${stack.name}\n  **Reference Path:** common/stacks/${stack.file}\n`;
    }
    manifest += `\nExample: If you are editing a Java file, call view_file on 'common/stacks/java.md' first to align with the project standard.\n`;
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
        description: "List all available specialized agents and their supported commands.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "call_agent_command",
        description: "Run a specific command from an agent's library. Call 'list_agents' first to discover available commands.",
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend, squad, po)." },
            command: { type: "string", description: "The command name (e.g., 'run' for squad, 'create' for architect, 'discovery' for po)." },
            args: { type: "string", description: "The goal or arguments for the task." },
          },
          required: ["agent", "command", "args"],
        },
      },
      {
        name: "get_agent_prompt",
        description: "Get the full persona and knowledge for a specific agent.",
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string" },
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
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "bin", "docs", "common"].includes(d.name))
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
        decoder: { run: "export", create: "export", synthesize: "export" }
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
      
      // Inject Dynamic Knowledge for Architect/Backend/Frontend/Mobile
      let dynamicKnowledge = "";
      if (["architect", "backend", "frontend", "mobile"].includes(agent)) {
        dynamicKnowledge = await getDynamicKnowledge(taskArgs, agent);
      }

      const identityMeta = `### ACTIVE PERSONA CONTEXT
You are currently executing the command '${commandName}' as the **${agent.toUpperCase()}** agent.
To maintain transparency and multi-agent coordination, you MUST prefix your very first response line with a clean, prominent identity tag in the format:
\`[Agent: ${agent.toUpperCase()} | Command: ${commandName.toUpperCase()}]\`

--------------------------------------------------------------------------------\n\n`;

      prompt = `${identityMeta}# Common Standards\n${commonKnowledge}\n\n# Common Skills\n${commonSkills}\n\n# Dynamic Knowledge\n${dynamicKnowledge}\n\n${prompt}`;
      
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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Agent Hub MCP Server (v${pkg.version}) running on stdio`);
