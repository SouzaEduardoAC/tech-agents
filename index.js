import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import toml from "toml";

const AGENTS_ROOT = process.cwd();

const server = new Server(
  {
    name: "agent-hub",
    version: "1.1.0",
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
      if (basename === "logseq_knowledge.md" || basename === "doc_maintainer.md") {
        isRelevant = /docs|document|logseq|prd|adr|registry|create|discovery|plan|report|investigate/.test(searchTarget);
      } else if (basename === "base_reviewer.md" || basename === "base_security_auditor.md") {
        isRelevant = /audit|review|create|implement|security|test|bottleneck|perf|fix|refactor/.test(searchTarget);
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
  let dynamicKnowledge = "";
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
        const content = await fs.readFile(dotnetPath, "utf-8");
        dynamicKnowledge += `\n### File: dotnet.md (Dynamic Stack: .NET Detected)\n${content}\n`;
      }
    }

    // Detection Logic for Java
    const hasJavaFiles = files.some(f => f === 'pom.xml' || f === 'build.gradle' || f === 'build.gradle.kts' || f.endsWith('.java'));
    const hasJavaMention = taskArgsLower.includes('java') || taskArgsLower.includes('spring boot');
    if (hasJavaFiles || hasJavaMention) {
      const javaPath = path.join(AGENTS_ROOT, "common", "stacks", "java.md");
      if (await fs.pathExists(javaPath)) {
        const content = await fs.readFile(javaPath, "utf-8");
        dynamicKnowledge += `\n### File: java.md (Dynamic Stack: Java Detected)\n${content}\n`;
      }
    }

    // Detection Logic for Go
    const hasGoFiles = files.some(f => f === 'go.mod' || f === 'go.sum' || f.endsWith('.go'));
    const hasGoMention = taskArgsLower.includes('golang') || (taskArgsLower.includes('go ') && !taskArgsLower.includes('google')) || taskArgsLower === 'go';
    if (hasGoFiles || hasGoMention) {
      const goPath = path.join(AGENTS_ROOT, "common", "stacks", "go.md");
      if (await fs.pathExists(goPath)) {
        const content = await fs.readFile(goPath, "utf-8");
        dynamicKnowledge += `\n### File: go.md (Dynamic Stack: Go Detected)\n${content}\n`;
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
        const content = await fs.readFile(reactPath, "utf-8");
        dynamicKnowledge += `\n### File: react.md (Dynamic Stack: React Detected)\n${content}\n`;
      }
    }

    // Detection Logic for Angular
    const hasAngularFiles = files.some(f => f === 'angular.json' || f === 'nx.json');
    const hasAngularMention = taskArgsLower.includes('angular');
    if (hasAngularFiles || hasAngularMention) {
      const angularPath = path.join(AGENTS_ROOT, "common", "stacks", "angular.md");
      if (await fs.pathExists(angularPath)) {
        const content = await fs.readFile(angularPath, "utf-8");
        dynamicKnowledge += `\n### File: angular.md (Dynamic Stack: Angular Detected)\n${content}\n`;
      }
    }

    // Detection Logic for Vue
    const hasVueFiles = files.some(f => f.endsWith('.vue') || f === 'vue.config.js');
    const hasVueMention = taskArgsLower.includes('vue');
    if (hasVueFiles || hasVueMention) {
      const vuePath = path.join(AGENTS_ROOT, "common", "stacks", "vue.md");
      if (await fs.pathExists(vuePath)) {
        const content = await fs.readFile(vuePath, "utf-8");
        dynamicKnowledge += `\n### File: vue.md (Dynamic Stack: Vue Detected)\n${content}\n`;
      }
    }

    // Detection Logic for TypeScript
    const hasTsFiles = files.some(f => f === 'tsconfig.json' || f.endsWith('.ts') || f.endsWith('.tsx'));
    const hasTsMention = taskArgsLower.includes('typescript') || taskArgsLower.includes(' ts ');
    if (hasTsFiles || hasTsMention) {
      const tsPath = path.join(AGENTS_ROOT, "common", "stacks", "typescript.md");
      if (await fs.pathExists(tsPath)) {
        const content = await fs.readFile(tsPath, "utf-8");
        dynamicKnowledge += `\n### File: typescript.md (Dynamic Stack: TypeScript Detected)\n${content}\n`;
      }
    }

    // Detection Logic for JavaScript
    const hasJsFiles = files.some(f => f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs'));
    const hasJsMention = taskArgsLower.includes('javascript') || taskArgsLower.includes(' js ');
    if (hasJsFiles || hasJsMention) {
      const jsPath = path.join(AGENTS_ROOT, "common", "stacks", "javascript.md");
      if (await fs.pathExists(jsPath)) {
        const content = await fs.readFile(jsPath, "utf-8");
        dynamicKnowledge += `\n### File: javascript.md (Dynamic Stack: JavaScript Detected)\n${content}\n`;
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
        const content = await fs.readFile(flutterPath, "utf-8");
        dynamicKnowledge += `\n### File: flutter.md (Dynamic Stack: Flutter/Dart Detected)\n${content}\n`;
      }
    }
  }
  
  return dynamicKnowledge;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_agents",
        description: "List all available specialized agents.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "call_agent_command",
        description: "Run a specific command (e.g., 'create', 'auditor') from an agent's library.",
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend)." },
            command: { type: "string", description: "The command name (e.g., create, docs, discovery)." },
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
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "bin", "docs"].includes(d.name))
        .map((d) => d.name);
      return { content: [{ type: "text", text: agents.join(", ") }] };
    }

    if (name === "call_agent_command") {
      const { agent, command, args: taskArgs } = args;
      const tomlPath = path.join(AGENTS_ROOT, agent, "commands", agent, `${command}.toml`);

      if (!(await fs.pathExists(tomlPath))) {
        throw new Error(`Command '${command}' for agent '${agent}' not found at ${tomlPath}`);
      }

      const tomlData = toml.parse(await fs.readFile(tomlPath, "utf-8"));
      let prompt = tomlData.prompt || "";
      
      // Extract all catted basenames in the prompt to prevent double injection
      const cattedBasenames = new Set();
      const catMatches = prompt.matchAll(/!\{cat\s+([^\}]+)\}/g);
      for (const match of catMatches) {
        cattedBasenames.add(path.basename(match[1].trim()));
      }

      const searchTarget = `${command} ${tomlData.description || ""} ${taskArgs || ""}`.toLowerCase();

      // Inject Common Knowledge & Skills (Deduplicated and filtered by relevance)
      const commonKnowledge = await compileCommonSection(path.join(AGENTS_ROOT, "common", "knowledge"), searchTarget, cattedBasenames, "knowledge").catch(() => "");
      const commonSkills = await compileCommonSection(path.join(AGENTS_ROOT, "common", "skills"), searchTarget, cattedBasenames, "skills").catch(() => "");
      
      // Inject Dynamic Knowledge for Architect/Backend/Frontend/Mobile
      let dynamicKnowledge = "";
      if (["architect", "backend", "frontend", "mobile"].includes(agent)) {
        dynamicKnowledge = await getDynamicKnowledge(taskArgs, agent);
      }

      prompt = `# Common Standards\n${commonKnowledge}\n\n# Common Skills\n${commonSkills}\n\n# Dynamic Knowledge\n${dynamicKnowledge}\n\n${prompt}`;
      
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
console.error("Agent Hub MCP Server (v1.1.0) running on stdio");
