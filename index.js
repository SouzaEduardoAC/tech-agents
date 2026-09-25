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
import { execSync } from "child_process";

const AGENTS_ROOT = path.dirname(fileURLToPath(import.meta.url));
import {
  resolveStateFilePath,
  isInsideHub,
  getComplianceMandate,
} from "./engine/state_manager.js";
import {
  resolveProbes,
  readMarkdownDir,
  compileCommonSection,
  scanWorkspace,
  getDynamicKnowledge,
  compileLegacyCommandPrompt,
  compileStepPrompt,
} from "./engine/prompt_compiler.js";
import {
  listPlaybooks,
  loadPlaybook,
  startPlaybook,
  getActiveStep,
  runActiveStepChecks,
  advanceStep,
  getPlaybookStatus,
} from "./engine/playbook_runner.js";

const pkg = fs.readJsonSync(path.join(AGENTS_ROOT, "package.json"));

const server = new Server(
  {
    name: "tech-agents",
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_agents",
        description: "List all available specialized agents, their registered commands, and retrieve the complete MCP Usage Guide & Decision Flowchart. Call this first to understand how to interact with the Agent Hub MCP server, select the correct agent, and avoid common orchestration mistakes.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "call_agent_command",
        description: [
          "Activate a specialized agent and run one of its commands with a task description.",
          "Use this whenever the user asks to: 'call the council', 'have the architect design X',",
          "'run the backend agent', 'ask the squad to build X', 'get compliance to audit Y',",
          "'let the researcher investigate Z', 'use the PO for discovery', 'have automata automate a workflow',",
          "'get quicky to fix this', 'have the decoder translate this spec', or any similar delegation to a named agent.",
          "The assembled prompt returned by this tool IS the agent — adopt its persona and execute its instructions directly.",
          "Call list_agents first if you are unsure of the exact agent name or available commands.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend, squad, council, po, compliance, researcher, automata, decoder, quicky, frontend, mobile)." },
            command: { type: "string", description: "The command name. Common defaults: 'run' (squad), 'create' (architect/backend/frontend/mobile), 'debate' (council), 'discovery' (po), 'master' (compliance), 'report' (researcher), 'fix' (quicky), 'export' (decoder). Call list_agents to see all available commands." },
            args: { type: "string", description: "The full task description, goal, or user request to pass to the agent. Be specific — this becomes the agent's primary objective." },
          },
          required: ["agent", "command", "args"],
        },
      },
      {
        name: "run_agent_loop",
        description: [
          "Run a multi-turn agent execution loop on the server side using client LLM sampling.",
          "Use this to execute agents in SSO or token-based environments where local API keys are unavailable.",
          "The server manages prompt pinning and context loops directly to prevent persona drift.",
          "If the client does not support sampling, it will return an error or advice to fall back.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            agent: { type: "string", description: "The agent name (e.g., architect, backend, squad, council, po, compliance, researcher, automata, decoder, quicky, frontend, mobile)." },
            command: { type: "string", description: "The command name. Common defaults: 'run' (squad), 'create' (architect/backend/frontend/mobile), 'debate' (council), 'discovery' (po), 'master' (compliance), 'report' (researcher), 'fix' (quicky), 'export' (decoder). Call list_agents to see all available commands." },
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
            agent: { type: "string", description: "The agent name (e.g., architect, backend, council)." },
          },
          required: ["agent"],
        },
      },
      {
        name: "pipeline_start",
        description: [
          "Initialize a new pipeline session with a structured approval gate system.",
          "Call this at the very beginning of any Squad pipeline run to set up the state file.",
          "Creates .squad-state.json with all specified gates set to 'locked'.",
          "Returns the new session_id and a confirmation. Must be called before request_approval or check_gate.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            goal: { type: "string", description: "The pipeline goal string (the high-level task being orchestrated)." },
            gates: {
              type: "array",
              items: { type: "string" },
              description: "List of gate_key strings expected for this pipeline run (e.g., ['prd', 'plan', 'compliance', 'execution']).",
            },
            cwd: { type: "string", description: "Optional. The current working directory of the active project. Enforces project-level isolation when running under a global MCP daemon." },
          },
          required: ["goal", "gates"],
        },
      },
      {
        name: "request_approval",
        description: [
          "Signal that the current pipeline phase is complete and requires human approval before proceeding.",
          "Sets the specified gate to 'pending' and returns a hard STOP message.",
          "The pipeline MUST halt after this tool returns. Do NOT call any further agent tools until the human runs /squad:approve <gate_key>.",
          "Use check_gate at the start of the next phase to verify approval before continuing.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            gate: { type: "string", description: "The gate_key that requires approval (e.g., 'prd', 'plan', 'discovery', 'audit')." },
            artifact_path: { type: "string", description: "Optional path to the artifact file produced in this phase (e.g., 'docs/pages/feature-prd.md')." },
            summary: { type: "string", description: "A brief summary of what was completed in this phase and what the human should review." },
            cwd: { type: "string", description: "Optional. The current working directory of the active project. Enforces project-level isolation when running under a global MCP daemon." },
          },
          required: ["gate", "summary"],
        },
      },
      {
        name: "check_gate",
        description: [
          "Check whether a specific pipeline gate has been approved by a human before starting the next phase.",
          "Returns approved:true if the gate is approved. Returns an error if the gate is pending or locked.",
          "If no active pipeline session exists (no .squad-state.json), returns a soft advisory and allows the agent to proceed with prompt-level guardrails (standalone mode).",
          "ALWAYS call this at the start of each new pipeline phase to enforce the approval chain.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            gate: { type: "string", description: "The gate_key to check (e.g., 'prd', 'plan', 'discovery', 'audit')." },
            cwd: { type: "string", description: "Optional. The current working directory of the active project. Enforces project-level isolation when running under a global MCP daemon." },
          },
          required: ["gate"],
        },
      },
      {
        name: "pipeline_approve",
        description: [
          "Approve a specific pipeline gate to unblock the next phase.",
          "Updates the gate status in .squad-state.json to 'approved' and records the approved_at timestamp.",
          "Must be called after request_approval has set the gate to pending.",
        ].join(" "),
        inputSchema: {
          type: "object",
          properties: {
            gate: { type: "string", description: "The gate_key to approve (e.g., 'prd', 'plan', 'discovery', 'audit')." },
            cwd: { type: "string", description: "Optional. The current working directory of the active project. Enforces project-level isolation when running under a global MCP daemon." },
          },
          required: ["gate"],
        },
      },
      {
        name: "playbook_list",
        description: "List all available SDLC playbooks (e.g. feature_dev, bug_fix, security_audit, pr_review, consultation, full_sync).",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "playbook_start",
        description: "Start a structured, state-machine driven SDLC playbook. Initializes session, locks approval gates, and sets active step.",
        inputSchema: {
          type: "object",
          properties: {
            playbook: { type: "string", description: "The playbook identifier (e.g. feature_dev, bug_fix, security_audit, pr_review, consultation, full_sync)." },
            goal: { type: "string", description: "The high-level goal or task to execute." },
            cwd: { type: "string", description: "Optional workspace root directory." },
          },
          required: ["playbook", "goal"],
        },
      },
      {
        name: "playbook_step",
        description: "Get the active step context, compiled prompt, cognitive lens, and scoped toolbox permissions for the current playbook session.",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string", description: "Optional workspace root directory." },
          },
        },
      },
      {
        name: "playbook_run_checks",
        description: "Execute the configured hard checks (test suites, linters, static scanners) locally for the active playbook step.",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string", description: "Optional workspace root directory." },
          },
        },
      },
      {
        name: "playbook_advance",
        description: "Advance to the next playbook step. Strictly enforces that configured hard checks have passed and human gates are approved.",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string", description: "Optional workspace root directory." },
          },
        },
      },
      {
        name: "playbook_status",
        description: "Get the current status, active step, completed history, and gate states for the active playbook session.",
        inputSchema: {
          type: "object",
          properties: {
            cwd: { type: "string", description: "Optional workspace root directory." },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_agents") {
      const guidePath = path.join(AGENTS_ROOT, "common", "skills", "mcp_usage_guide.md");
      if (await fs.pathExists(guidePath)) {
        const guideContent = await fs.readFile(guidePath, "utf-8");
        return { content: [{ type: "text", text: guideContent }] };
      }

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
      const finalPrompt = await compileLegacyCommandPrompt({
        agent,
        command,
        taskArgs,
      });
      return { content: [{ type: "text", text: finalPrompt }] };
    }

    if (name === "run_agent_loop") {
      const capabilities = server.getClientCapabilities();
      const supportsSampling = !!capabilities?.sampling;
      if (!supportsSampling) {
        throw new Error(
          "The connected client does not support the MCP sampling capability. " +
          "Please fall back to standard prompt injection by calling call_agent_command instead, " +
          "or use a client that supports sampling (like AntiGravity or Codex)."
        );
      }

      const { agent, command, args: taskArgs } = args;
      const { projectRoot } = await resolveStateFilePath();
      const finalPrompt = await compileLegacyCommandPrompt({
        agent,
        command,
        taskArgs,
      });

      const parserInstructions = `
================================================================================
### IMPORTANT SYSTEM DIRECTIVE FOR LOCAL TOOL USE (SSO SAMPLING LOOP)
Because you are executing inside a managed SSO sampling loop on the server, you do NOT have direct access to client tools.
To execute file or command actions, you MUST output specific XML-like tags in your text output. The server will intercept these tags, execute the requested action locally within the workspace root, and feed the results back into your context as user messages.

Available actions:
1. **Read File**:
   <read_file path="relative/path/to/file" />
2. **Write/Overwrite File**:
   <write_file path="relative/path/to/file">
   [Your file content here]
   </write_file>
3. **Execute Command**:
   <run_command cmd="npm test" />
4. **Complete Task**:
   When you are completely finished with your task and have verified it, output:
   <task_complete summary="Detailed summary of what was accomplished" />

RULES:
- All paths MUST be relative to the active project workspace root.
- You can request multiple actions in a single turn. The server will execute all of them in order and return all outputs in a single user message.
- DO NOT use markdown code blocks around your XML tags. Output the raw tags directly.
================================================================================
`;

      const messages = [
        {
          role: "user",
          content: {
            type: "text",
            text: `Execute the following task: ${taskArgs}`
          }
        }
      ];

      let turn = 0;
      const maxTurns = 15;
      let loopResult = "";

      while (turn < maxTurns) {
        turn++;

        const samplingResponse = await server.createMessage({
          messages: messages,
          systemPrompt: `${finalPrompt}\n\n${parserInstructions}`,
          maxTokens: 4000,
        });

        const assistantText = samplingResponse.content.text || "";
        messages.push({
          role: "assistant",
          content: samplingResponse.content
        });

        const readRegex = /<read_file\s+path=["']([^"']+)["']\s*\/?>/gi;
        const writeRegex = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/write_file>/gi;
        const commandRegex = /<run_command\s+cmd=["']([^"']+)["']\s*\/?>/gi;
        const completeRegex = /<task_complete(?:\s+summary=["']([^"']+)["'])?\s*\/?>/i;

        let toolExecuted = false;
        let turnOutput = "";

        const completeMatch = completeRegex.exec(assistantText);
        if (completeMatch) {
          loopResult = completeMatch[1] || "Task completed successfully.";
          break;
        }

        let match;
        readRegex.lastIndex = 0;
        while ((match = readRegex.exec(assistantText)) !== null) {
          const relativePath = match[1];
          const absolutePath = path.resolve(projectRoot, relativePath);
          if (!absolutePath.startsWith(projectRoot)) {
            turnOutput += `\nError: Path "${relativePath}" is outside the project workspace.\n`;
          } else {
            try {
              const fileContent = await fs.readFile(absolutePath, "utf8");
              turnOutput += `\nFile [${relativePath}] read successfully:\n\`\`\`\n${fileContent}\n\`\`\`\n`;
            } catch (e) {
              turnOutput += `\nError reading file "${relativePath}": ${e.message}\n`;
            }
          }
          toolExecuted = true;
        }

        writeRegex.lastIndex = 0;
        while ((match = writeRegex.exec(assistantText)) !== null) {
          const relativePath = match[1];
          const content = match[2];
          const absolutePath = path.resolve(projectRoot, relativePath);
          if (!absolutePath.startsWith(projectRoot)) {
            turnOutput += `\nError: Path "${relativePath}" is outside the project workspace.\n`;
          } else {
            try {
              await fs.ensureDir(path.dirname(absolutePath));
              await fs.writeFile(absolutePath, content, "utf8");
              turnOutput += `\nFile [${relativePath}] written successfully.\n`;
            } catch (e) {
              turnOutput += `\nError writing file "${relativePath}": ${e.message}\n`;
            }
          }
          toolExecuted = true;
        }

        commandRegex.lastIndex = 0;
        while ((match = commandRegex.exec(assistantText)) !== null) {
          const command = match[1];
          try {
            const output = execSync(command, { cwd: projectRoot, encoding: "utf8", timeout: 30000 });
            turnOutput += `\nCommand "${command}" executed successfully. Output:\n\`\`\`\n${output}\n\`\`\`\n`;
          } catch (e) {
            turnOutput += `\nError executing command "${command}": ${e.message}\n${e.stdout || ""}\n${e.stderr || ""}\n`;
          }
          toolExecuted = true;
        }

        if (!toolExecuted) {
          turnOutput = "Please continue and execute the task or output <task_complete summary=\"...\" /> when finished.";
        }

        messages.push({
          role: "user",
          content: {
            type: "text",
            text: turnOutput.trim()
          }
        });
      }

      if (!loopResult) {
        loopResult = "Loop execution reached max turns limit without explicit task completion.";
      }

      return {
        content: [{
          type: "text",
          text: `Agent execution loop completed.\nSummary: ${loopResult}`
        }]
      };
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

    if (name === "pipeline_start") {
      const { goal, gates, cwd } = args;
      if (!goal || !Array.isArray(gates) || gates.length === 0) {
        throw new Error("pipeline_start requires 'goal' (string) and 'gates' (non-empty array of strings).");
      }
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256").update(goal).digest("hex").slice(0, 8);
      const session_id = `${Date.now()}-${hash}`;
      const initiated_at = new Date().toISOString();
      const gatesObj = {};
      for (const key of gates) {
        gatesObj[key] = { status: "locked" };
      }
      const state = { session_id, initiated_at, goal, gates: gatesObj };
      const { statePath, projectRoot } = await resolveStateFilePath(cwd);
      await fs.writeJson(statePath, state, { spaces: 2 });

      // Automatically append .squad-state-*.json to the target project's .gitignore if it exists
      const gitignorePath = path.join(projectRoot, ".gitignore");
      if (await fs.pathExists(gitignorePath)) {
        const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
        const lines = gitignoreContent.split(/\r?\n/);
        const hasStateFile = lines.some(line => line.trim() === ".squad-state-*.json");
        if (!hasStateFile) {
          const endsWithNewline = gitignoreContent.endsWith("\n") || gitignoreContent.endsWith("\r");
          const appendStr = (endsWithNewline ? "" : "\n") + ".squad-state-*.json\n";
          await fs.appendFile(gitignorePath, appendStr);
        }
      }

      return {
        content: [{
          type: "text",
          text: [
            `✅ Pipeline session initialized.`,
            `Session ID: ${session_id}`,
            `Goal: ${goal}`,
            `Gates registered (all locked): ${gates.join(", ")}`,
            `State file: ${statePath}`,
            ``,
            `Proceed with Phase 1. After each phase, call request_approval to pause for human sign-off.`,
            `Call check_gate at the START of each subsequent phase before doing any work.`,
          ].join("\n"),
        }],
      };
    }

    if (name === "request_approval") {
      const { gate, artifact_path, summary, cwd } = args;
      const { statePath } = await resolveStateFilePath(cwd);
      if (!(await fs.pathExists(statePath))) {
        // Standalone mode — no active session, just emit a prompt-level STOP message
        return {
          content: [{
            type: "text",
            text: [
              `⏸️ PIPELINE PAUSED — GATE: ${gate}`,
              `Phase complete. Human approval required before the next phase can begin.`,
              artifact_path ? `Artifact: ${artifact_path}` : ``,
              `Summary: ${summary}`,
              ``,
              `No active Squad session detected. Running in standalone mode.`,
              `Please review the artifact above and explicitly tell the agent to proceed when ready.`,
              `DO NOT continue autonomously. PIPELINE STATUS: BLOCKED`,
            ].filter(Boolean).join("\n"),
          }],
        };
      }
      const state = await fs.readJson(statePath);
      if (!state.gates[gate]) {
        state.gates[gate] = {};
      }
      state.gates[gate].status = "pending";
      state.gates[gate].requested_at = new Date().toISOString();
      if (artifact_path) state.gates[gate].artifact = artifact_path;
      await fs.writeJson(statePath, state, { spaces: 2 });
      return {
        content: [{
          type: "text",
          text: [
            `⏸️ PIPELINE PAUSED — GATE: ${gate}`,
            `Phase complete. Human approval required before the next phase can begin.`,
            artifact_path ? `Artifact: ${artifact_path}` : ``,
            `Summary: ${summary}`,
            ``,
            `To proceed, the human must approve this gate. They can do this in chat (by running /squad:approve ${gate}) or by using the pipeline_approve tool.`,
            `DO NOT call any further agent tools until approval is registered.`,
            `PIPELINE STATUS: BLOCKED`,
          ].filter(Boolean).join("\n"),
        }],
      };
    }

    if (name === "check_gate") {
      const { gate, cwd } = args;
      const { statePath } = await resolveStateFilePath(cwd);
      if (!(await fs.pathExists(statePath))) {
        // Soft advisory for standalone agent runs — do not block
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              approved: true,
              message: `No active Squad session — proceeding with prompt-level guardrails only. (Standalone mode: ${gate})`,
            }),
          }],
        };
      }
      const state = await fs.readJson(statePath);
      const gateData = state.gates && state.gates[gate];
      if (!gateData) {
        return {
          isError: true,
          content: [{ type: "text", text: `🚫 GATE BLOCKED: '${gate}' is not registered in the active pipeline session (session: ${state.session_id}). Run phases in order.` }],
        };
      }
      if (gateData.status === "approved") {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              approved: true,
              message: `Gate '${gate}' approved at ${gateData.approved_at}. Proceed.`,
            }),
          }],
        };
      }
      if (gateData.status === "pending") {
        return {
          isError: true,
          content: [{ type: "text", text: `🚫 GATE BLOCKED: '${gate}' is awaiting human approval. The human must approve this gate via chat (by running /squad:approve ${gate}) or by using the pipeline_approve tool. DO NOT PROCEED.` }],
        };
      }
      // status === "locked"
      return {
        isError: true,
        content: [{ type: "text", text: `🚫 GATE BLOCKED: '${gate}' has not been reached yet in the pipeline. Run phases in order and use request_approval to advance gates.` }],
      };
    }

    if (name === "pipeline_approve") {
      const { gate, cwd } = args;
      const { statePath } = await resolveStateFilePath(cwd);
      if (!(await fs.pathExists(statePath))) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: "No active pipeline session found. Start a pipeline first with pipeline_start.",
          }],
        };
      }
      const state = await fs.readJson(statePath);
      if (!state.gates || !state.gates[gate]) {
        const available = Object.keys(state.gates || {});
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Gate '${gate}' does not exist in the active pipeline session. Available gates: ${available.join(", ") || "none"}`,
          }],
        };
      }
      const gateData = state.gates[gate];
      if (gateData.status === "approved") {
        return {
          content: [{
            type: "text",
            text: `Gate '${gate}' is already approved (approved at ${gateData.approved_at}).`,
          }],
        };
      }
      if (gateData.status === "locked") {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `🚫 Gate '${gate}' is currently locked. The pipeline has not reached this gate yet. Phases must run in order and use request_approval to advance gates.`,
          }],
        };
      }
      // status is pending
      state.gates[gate].status = "approved";
      state.gates[gate].approved_at = new Date().toISOString();
      await fs.writeJson(statePath, state, { spaces: 2 });
      return {
        content: [{
          type: "text",
          text: `✅ Gate '${gate}' approved at ${state.gates[gate].approved_at}. The pipeline is now unblocked. The agent may proceed to the next phase.`,
        }],
      };
    }

    if (name === "playbook_list") {
      const playbooks = await listPlaybooks();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(playbooks, null, 2),
        }],
      };
    }

    if (name === "playbook_start") {
      const { playbook, goal, cwd } = args;
      if (!playbook || !goal) {
        throw new Error("playbook_start requires 'playbook' and 'goal'.");
      }
      const result = await startPlaybook({ playbookId: playbook, goal, cwd });
      return {
        content: [{
          type: "text",
          text: [
            `✅ Playbook '${result.playbook_name || result.playbook_id}' started.`,
            `Session ID: ${result.session_id}`,
            `Goal: ${goal}`,
            `Total steps: ${result.total_steps}`,
            `Active step: 1/${result.total_steps} (${result.active_step?.id || "none"}) - ${result.active_step?.name || ""}`,
            `State file: ${result.statePath}`,
            ``,
            `Call 'playbook_step' to inspect active instructions, lens, and tools.`,
          ].join("\n"),
        }],
      };
    }

    if (name === "playbook_step") {
      const { cwd } = args || {};
      const stepInfo = await getActiveStep(cwd);
      if (stepInfo.completed) {
        return {
          content: [{
            type: "text",
            text: `🎉 Playbook completed all steps. Session ID: ${stepInfo.session_id}`,
          }],
        };
      }
      return {
        content: [{
          type: "text",
          text: stepInfo.compiledPrompt,
        }],
      };
    }

    if (name === "playbook_run_checks") {
      const { cwd } = args || {};
      const checkResults = await runActiveStepChecks(cwd);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(checkResults, null, 2),
        }],
      };
    }

    if (name === "playbook_advance") {
      const { cwd } = args || {};
      const advanceResult = await advanceStep(cwd);
      return {
        content: [{
          type: "text",
          text: advanceResult.completed
            ? `🎉 Playbook completed successfully!`
            : [
                `✅ Advanced to step ${advanceResult.step_index + 1}/${advanceResult.total_steps}: ${advanceResult.active_step?.id} (${advanceResult.active_step?.name})`,
                `Call 'playbook_step' to retrieve active instructions.`,
              ].join("\n"),
        }],
      };
    }

    if (name === "playbook_status") {
      const { cwd } = args || {};
      const status = await getPlaybookStatus(cwd);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(status, null, 2),
        }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[tech-agents] MCP Server v${pkg.version} running on stdio\n`);
} catch (e) {
  process.stderr.write(`[tech-agents] FATAL: ${e.message}\n${e.stack}\n`);
  process.exit(1);
}
