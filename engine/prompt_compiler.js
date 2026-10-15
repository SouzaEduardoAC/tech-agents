import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";
import { resolveStateFilePath, isInsideHub, getComplianceMandate } from "./state_manager.js";

const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Directories that are never user modules — skip them during depth-1 scan.
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".cache", ".idea", ".vscode",
  "dist", "build", "out", "target", ".next", ".nuxt", "coverage",
  "__pycache__", ".gradle", ".m2",
]);

/**
 * Resolves probes like !{cat path} and !{gemini mcp list} inside a string.
 */
export async function resolveProbes(content) {
  const catRegex = /!\{cat\s+([^\}]+)\}/g;
  let resolvedContent = content;
  let match;

  while ((match = catRegex.exec(content)) !== null) {
    const rawPath = match[1].trim();
    const normalizedRaw = rawPath.replace(/\\/g, "/");
    const clientPrefixRegex = /^~\/\.(gemini|antigravity|antigravitycli|antigravity-cli|antigravity-ide|codex|codexcli|codex-cli|codex-ide)\/agents\//;
    const absolutePath = clientPrefixRegex.test(normalizedRaw)
      ? path.join(AGENTS_ROOT, normalizedRaw.replace(clientPrefixRegex, ""))
      : path.resolve(AGENTS_ROOT, rawPath);

    try {
      const fileData = await fs.readFile(absolutePath, "utf-8");
      resolvedContent = resolvedContent.replace(match[0], fileData);
    } catch (e) {
      resolvedContent = resolvedContent.replace(match[0], `[Error reading file: ${rawPath}]`);
    }
  }

  resolvedContent = resolvedContent.replace(
    /!\{gemini mcp list\}/g,
    "[Context: Check your connected MCP tools for specialized capabilities.]"
  );

  return resolvedContent;
}

export async function readMarkdownDir(dirPath) {
  if (!(await fs.pathExists(dirPath))) return "";
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
export async function compileCommonSection(dirPath, searchTarget, cattedBasenames, category) {
  if (!(await fs.pathExists(dirPath))) return "";
  const files = await fs.readdir(dirPath);
  let content = "";

  for (const file of files) {
    if (!file.endsWith(".md") && !file.endsWith(".toml")) continue;
    const basename = path.basename(file);

    // 1. Deduplication
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
        isRelevant = true;
      }
    } else if (category === "skills") {
      const hasLogseq = cattedBasenames.has("logseq_knowledge.md");
      const hasAgentReviewer = [...cattedBasenames].some((n) => n.endsWith("reviewer.md"));
      const hasAgentSecurityAuditor = [...cattedBasenames].some((n) => n.endsWith("security_auditor.md"));

      if (basename === "logseq_knowledge.md") {
        isRelevant = false;
      } else if (basename === "doc_maintainer.md") {
        isRelevant = !hasLogseq && /docs|document/.test(searchTarget) && !/logseq/.test(searchTarget);
      } else if (basename === "base_reviewer.md") {
        isRelevant =
          !hasAgentReviewer &&
          /audit|review|create|implement|security|test|bottleneck|perf|fix|refactor/.test(searchTarget);
      } else if (basename === "base_security_auditor.md") {
        isRelevant =
          !hasAgentSecurityAuditor &&
          /audit|review|create|implement|security|test|bottleneck|perf|fix|refactor/.test(searchTarget);
      } else if (basename === "business_synthesis.md") {
        isRelevant = /synthesize|translate|export|stakeholder|business|report|decoder/.test(searchTarget);
      } else if (basename === "investigation.md") {
        isRelevant =
          /analyze|analyse|investigation|investigate|simulate|hypothetical|what if|how would|behavior|behaviour|trace|csv|json|parse|data file/.test(
            searchTarget
          );
      } else if (basename === "pr_review.md") {
        isRelevant =
          /review|pull.?request|pull request|merge.?request|merge request|\bpr\b|\bmr\b|github\.com.*pull|gitlab\.com.*merge|dev\.azure\.com.*pullrequest|visualstudio\.com.*pullrequest/.test(
            searchTarget
          );
      } else if (basename === "mcp_usage_guide.md") {
        isRelevant = true;
      } else {
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
 * Scans the workspace for technology stack marker files.
 */
export async function scanWorkspace(customCwd) {
  const targetDir = customCwd || process.cwd();
  const rootEntries = await fs.readdir(targetDir, { withFileTypes: true }).catch(() => []);
  const rootFiles = rootEntries.filter((e) => e.isFile()).map((e) => e.name);

  const moduleFiles = [];
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const subFiles = await fs.readdir(path.join(targetDir, entry.name)).catch(() => []);
    for (const f of subFiles) {
      moduleFiles.push({ file: f, module: entry.name });
    }
  }

  return { rootFiles, moduleFiles };
}

/**
 * Detects if a specific stack knowledge should be loaded based on the environment or task arguments.
 */
export async function getDynamicKnowledge(taskArgs = "", agent = "", customCwd) {
  const targetDir = customCwd || process.cwd();
  const detectedStacks = [];
  const { rootFiles, moduleFiles } = await scanWorkspace(targetDir);
  const files = rootFiles;
  const taskArgsLower = taskArgs.toLowerCase();

  const findMarker = (predicate) => {
    if (files.some(predicate)) return "";
    const hit = moduleFiles.find(({ file }) => predicate(file));
    return hit ? hit.module : null;
  };

  const isBackendAgent = agent === "backend";
  const isFrontendAgent = agent === "frontend";
  const isMobileAgent = agent === "mobile";
  const isArchitect = agent === "architect";

  // --- BACKEND STACKS ---
  if (isBackendAgent || isArchitect) {
    const dotnetModule = findMarker((f) => f.endsWith(".csproj") || f.endsWith(".sln") || f === "global.json");
    const hasDotnetMention = taskArgsLower.includes("dotnet") || taskArgsLower.includes("c#");
    if (dotnetModule !== null || hasDotnetMention) {
      const dotnetPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "dotnet.md");
      if (await fs.pathExists(dotnetPath)) {
        detectedStacks.push({ name: ".NET", file: "dotnet.md", path: dotnetPath, module: dotnetModule ?? "" });
      }
    }

    const javaModule = findMarker((f) => f === "pom.xml" || f === "build.gradle" || f === "build.gradle.kts" || f.endsWith(".java"));
    const hasJavaMention = taskArgsLower.includes("java") || taskArgsLower.includes("spring boot");
    if (javaModule !== null || hasJavaMention) {
      const javaPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "java.md");
      if (await fs.pathExists(javaPath)) {
        detectedStacks.push({ name: "Java / Spring Boot", file: "java.md", path: javaPath, module: javaModule ?? "" });
      }
    }

    const goModule = findMarker((f) => f === "go.mod" || f === "go.sum" || f.endsWith(".go"));
    const hasGoMention = taskArgsLower.includes("golang") || (taskArgsLower.includes("go ") && !taskArgsLower.includes("google")) || taskArgsLower === "go";
    if (goModule !== null || hasGoMention) {
      const goPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "go.md");
      if (await fs.pathExists(goPath)) {
        detectedStacks.push({ name: "Go (Golang)", file: "go.md", path: goPath, module: goModule ?? "" });
      }
    }
  }

  // --- FRONTEND STACKS ---
  if (isFrontendAgent || isArchitect) {
    const hasReactMention = taskArgsLower.includes("react");
    let reactModule = null;
    if (!hasReactMention) {
      if (files.includes("package.json") && (files.includes("App.js") || files.includes("App.tsx") || files.includes("src"))) {
        const pkgContent = await fs.readFile(path.join(targetDir, "package.json"), "utf8").catch(() => "");
        if (pkgContent.includes('"react"')) reactModule = "";
      }
      if (reactModule === null) {
        for (const { file, module } of moduleFiles) {
          if (file === "package.json") {
            const pkgContent = await fs.readFile(path.join(targetDir, module, "package.json"), "utf8").catch(() => "");
            if (pkgContent.includes('"react"')) {
              reactModule = module;
              break;
            }
          }
        }
      }
    }
    if (hasReactMention || reactModule !== null) {
      const reactPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "react.md");
      if (await fs.pathExists(reactPath)) {
        detectedStacks.push({ name: "React", file: "react.md", path: reactPath, module: reactModule ?? "" });
      }
    }

    const angularModule = findMarker((f) => f === "angular.json" || f === "nx.json");
    const hasAngularMention = taskArgsLower.includes("angular");
    if (angularModule !== null || hasAngularMention) {
      const angularPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "angular.md");
      if (await fs.pathExists(angularPath)) {
        detectedStacks.push({ name: "Angular", file: "angular.md", path: angularPath, module: angularModule ?? "" });
      }
    }

    const vueModule = findMarker((f) => f.endsWith(".vue") || f === "vue.config.js");
    const hasVueMention = taskArgsLower.includes("vue");
    if (vueModule !== null || hasVueMention) {
      const vuePath = path.join(AGENTS_ROOT, "knowledge", "stacks", "vue.md");
      if (await fs.pathExists(vuePath)) {
        detectedStacks.push({ name: "Vue", file: "vue.md", path: vuePath, module: vueModule ?? "" });
      }
    }

    const tsModule = findMarker((f) => f === "tsconfig.json" || f.endsWith(".ts") || f.endsWith(".tsx"));
    const hasTsMention = taskArgsLower.includes("typescript") || taskArgsLower.includes(" ts ");
    if (tsModule !== null || hasTsMention) {
      const tsPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "typescript.md");
      if (await fs.pathExists(tsPath)) {
        detectedStacks.push({ name: "TypeScript", file: "typescript.md", path: tsPath, module: tsModule ?? "" });
      }
    }

    const jsModule = findMarker((f) => f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".cjs"));
    const hasJsMention = taskArgsLower.includes("javascript") || taskArgsLower.includes(" js ");
    if (jsModule !== null || hasJsMention) {
      const jsPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "javascript.md");
      if (await fs.pathExists(jsPath)) {
        detectedStacks.push({ name: "JavaScript", file: "javascript.md", path: jsPath, module: jsModule ?? "" });
      }
    }
  }

  // --- MOBILE STACKS ---
  if (isMobileAgent || isArchitect) {
    const flutterModule = findMarker((f) => f === "pubspec.yaml" || f.endsWith(".dart"));
    const hasFlutterMention = taskArgsLower.includes("flutter") || taskArgsLower.includes("dart");
    if (flutterModule !== null || hasFlutterMention) {
      const flutterPath = path.join(AGENTS_ROOT, "knowledge", "stacks", "flutter.md");
      if (await fs.pathExists(flutterPath)) {
        detectedStacks.push({ name: "Flutter / Dart", file: "flutter.md", path: flutterPath, module: flutterModule ?? "" });
      }
    }
  }

  const primaryStacks = ["dotnet.md", "java.md", "go.md", "react.md", "angular.md", "vue.md", "flutter.md"];
  const primaryDetected = detectedStacks.filter((s) => primaryStacks.includes(s.file));

  if (primaryDetected.length > 1) {
    const isMonorepo = detectedStacks.some((s) => s.module);
    let manifest = `\n### MULTIPLE STACKS DETECTED (On-Demand Mode Active)\n`;
    manifest += isMonorepo
      ? `The workspace root is a multi-module project. Each module uses a different technology stack.\n`
      : `The workspace contains multiple active technology stacks.\n`;
    manifest += `To prevent prompt collision and token bloat, stack reference guidelines have NOT been pre-injected.\n`;
    manifest += `You MUST read the relevant reference file before working in each module or stack area:\n\n`;
    for (const stack of detectedStacks) {
      const location = stack.module ? ` → module: \`${stack.module}/\`` : ` → workspace root`;
      manifest += `- **Stack:** ${stack.name}${location}\n  **Reference:** \`knowledge/stacks/${stack.file}\`\n`;
    }
    manifest += `\nBefore editing any file, call view_file on the matching reference to align with project standards.\n`;
    return manifest;
  }

  let content = "";
  for (const stack of detectedStacks) {
    const fileContent = await fs.readFile(stack.path, "utf-8");
    content += `\n### File: ${stack.file} (Dynamic Stack: ${stack.name} Detected)\n${fileContent}\n`;
  }

  return content;
}

/**
 * Interpolates variables like {{args}}, {{feature}}, {{goal}} into strings or arrays of strings.
 */
export function interpolateVariables(target, vars = {}) {
  if (Array.isArray(target)) {
    return target.map((item) => interpolateVariables(item, vars));
  }
  if (typeof target !== "string") return target;
  let res = target;
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined && v !== null) {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      res = res.replace(regex, v);
    }
  }
  return res;
}

/**
 * Compiles a V3 Playbook step prompt.
 * Assembles Task + Lens + Input Artifacts + Standards + Toolbox constraints.
 */
export async function compileStepPrompt({
  playbookId,
  stepId,
  stepName,
  stepDescription = "",
  lensName = "",
  goal,
  feature = "feature",
  lensContent,
  inputArtifacts = [],
  outputArtifact = null,
  gate = null,
  standards = [],
  toolbox = [],
  customCwd,
}) {
  const { projectRoot } = await resolveStateFilePath(customCwd);
  const insideHub = await isInsideHub(projectRoot);
  const vars = { args: feature, feature, goal };

  const header = `### V3 PLAYBOOK STEP EXECUTION
[Playbook: ${playbookId.toUpperCase()} | Step: ${stepId.toUpperCase()} - ${stepName}]
Goal: ${goal}
Feature: ${feature}

--------------------------------------------------------------------------------
`;

  // Step Objectives
  let descriptionSection = "";
  if (stepDescription && stepDescription.trim()) {
    descriptionSection = `## Step Objectives & Instructions
${stepDescription.trim()}

`;
  }

  // 1. Cognitive Lens (The Mindset)
  const lensSection = `## Cognitive Lens (Professional Mindset & Directives)
${lensContent.trim()}

`;

  // 2. Required Output Artifact
  let outputArtifactSection = "";
  if (outputArtifact) {
    const resolvedOutput = interpolateVariables(outputArtifact, vars);
    outputArtifactSection = `## Required Output Artifact
You MUST produce and write the completed step output to:
\`${resolvedOutput}\`
Ensure the file is created with comprehensive, high-fidelity content before concluding this step.

`;
  }

  // 3. Human Approval Gate Directive
  let gateSection = "";
  if (gate) {
    const resolvedOutput = outputArtifact ? interpolateVariables(outputArtifact, vars) : "";
    gateSection = `## Mandatory Human Approval Checkpoint
⚠️ **GATE REQUIRED:** Advancing past this step is physically blocked by human approval gate: \`${gate}\`.
Upon creating the required artifact, you MUST:
1. Stop further autonomous actions.
2. Call \`request_approval(gate="${gate}"${resolvedOutput ? `, artifact_path="${resolvedOutput}"` : ""}, summary="<brief summary of changes>")\`.
3. Await human approval (\`/squad:approve ${gate}\` or \`pipeline_approve\`) before attempting to advance the step.

`;
  }

  // 4. Input Artifacts
  let artifactsContent = "";
  const resolvedInputArtifacts = interpolateVariables(inputArtifacts, vars);
  if (resolvedInputArtifacts.length > 0) {
    artifactsContent = `## Prior Step Artifacts & Context\n`;
    for (const artPath of resolvedInputArtifacts) {
      const fullArtPath = path.isAbsolute(artPath) ? artPath : path.join(projectRoot, artPath);
      if (await fs.pathExists(fullArtPath)) {
        const text = await fs.readFile(fullArtPath, "utf-8");
        artifactsContent += `### Artifact: ${path.basename(artPath)}\nPath: ${artPath}\n\`\`\`markdown\n${text}\n\`\`\`\n\n`;
      } else {
        artifactsContent += `### Artifact: ${path.basename(artPath)} (Not yet created / Pending)\n\n`;
      }
    }
  }

  // 5. Standards & Knowledge
  let standardsContent = "";
  if (standards.length > 0) {
    standardsContent = `## Reference Standards\n`;
    for (const std of standards) {
      let stdPath = path.isAbsolute(std) ? std : path.join(AGENTS_ROOT, std);
      if (await fs.pathExists(stdPath)) {
        const text = await fs.readFile(stdPath, "utf-8");
        standardsContent += `### Standard: ${path.basename(std)}\n${text}\n\n`;
      }
    }
  }

  // 6. Dynamic Stack Standards (Architect, Backend, Frontend, Mobile)
  let dynamicKnowledgeContent = "";
  if (["architect", "backend", "frontend", "mobile"].includes(lensName)) {
    const dynamicStack = await getDynamicKnowledge(goal, lensName, customCwd);
    if (dynamicStack && dynamicStack.trim()) {
      dynamicKnowledgeContent = `## Dynamic Project Stack Guidance\n${dynamicStack.trim()}\n\n`;
    }
  }

  // 7. Toolbox Permissions
  const toolboxSection = `## Active Toolbox Permissions
You are authorized to use tools in the following categories for this step:
${toolbox.map((t) => `- \`${t}\``).join("\n")}
Ensure you adhere strictly to the principle of least privilege.

`;

  // 8. Hub Compliance Mandate if inside Hub
  let compliance = "";
  if (insideHub) {
    compliance = `\n\n${await getComplianceMandate(projectRoot)}`;
  }

  const prompt = `${header}${descriptionSection}${lensSection}${outputArtifactSection}${gateSection}${artifactsContent}${standardsContent}${dynamicKnowledgeContent}${toolboxSection}${compliance}`;
  return resolveProbes(interpolateVariables(prompt, vars));
}

/**
 * Compiles a stateless V3 Cognitive Lens prompt for ad-hoc / single-turn tasks.
 */
export async function compileLensPrompt({ lens, task, context = "", customCwd }) {
  const { projectRoot } = await resolveStateFilePath(customCwd);
  const lensPath = path.join(AGENTS_ROOT, "lenses", `${lens}.md`);
  if (!(await fs.pathExists(lensPath))) {
    const availableLenses = (await fs.readdir(path.join(AGENTS_ROOT, "lenses")))
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.basename(f, ".md"));
    throw new Error(
      `Cognitive Lens '${lens}' not found. Available lenses: ${availableLenses.join(", ")}`
    );
  }

  const lensContent = await fs.readFile(lensPath, "utf-8");

  let dynamicStack = "";
  if (["architect", "backend", "frontend", "mobile"].includes(lens)) {
    dynamicStack = await getDynamicKnowledge(task, lens, customCwd);
  }

  let prompt = `### V3 COGNITIVE LENS EXECUTION
[Lens: ${lens.toUpperCase()} | Fast-Path Execution]
Task: ${task}

--------------------------------------------------------------------------------
## Cognitive Lens (Professional Mindset & Directives)
${lensContent.trim()}

`;

  if (dynamicStack && dynamicStack.trim()) {
    prompt += `## Dynamic Project Stack Guidance\n${dynamicStack.trim()}\n\n`;
  }

  if (context && context.trim()) {
    prompt += `## Injected Task Context / Code\n\`\`\`\n${context.trim()}\n\`\`\`\n\n`;
  }

  prompt += `## Instructions
Execute the task adhering strictly to the active Cognitive Lens stance and project stack guidelines above.`;

  return prompt;
}
