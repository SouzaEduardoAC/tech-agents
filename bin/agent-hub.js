#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const pkg = fs.readJsonSync(path.join(ROOT, "package.json"));

const program = new Command();

program
  .name("agent-hub")
  .description("Universal bridge for AI Agents")
  .version(pkg.version);

program
  .command("serve")
  .description("Start the MCP server")
  .action(() => {
    const serverPath = path.join(ROOT, "index.js");
    // Use 'pipe' so the MCP JSON-RPC framing is correctly forwarded.
    // 'inherit' would attach the child's stdio to the wrapper's fd directly,
    // but the MCP client is already bound to the wrapper process — messages
    // never reach index.js. Explicit piping fixes this.
    const child = spawn("node", [serverPath], {
      stdio: "pipe",
      env: process.env,
    });
    process.stdin.pipe(child.stdin);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("exit", (code) => process.exit(code ?? 0));
    child.on("error", (err) => {
      process.stderr.write(`[agent-hub] Failed to start MCP server: ${err.message}\n`);
      process.exit(1);
    });
  });

program
  .command("link")
  .description("Link an agent persona to a local file (e.g., .cursorrules)")
  .argument("<agent>", "Name of the agent")
  .argument("<target>", "Target file path")
  .action(async (agent, target) => {
    const personaPath = path.join(ROOT, agent, "brain", "persona.md");
    if (!(await fs.pathExists(personaPath))) {
      console.error(`Error: Agent '${agent}' not found.`);
      process.exit(1);
    }
    const absoluteTarget = path.resolve(process.cwd(), target);
    await fs.ensureDir(path.dirname(absoluteTarget));
    try {
      if (await fs.pathExists(absoluteTarget)) await fs.remove(absoluteTarget);
      
      try {
        await fs.symlink(personaPath, absoluteTarget);
        console.log(`Success: Symlinked ${agent} persona to ${target}`);
      } catch (symlinkErr) {
        // Fall back to physical copy if symlink fails (e.g. on Windows without Developer Mode)
        await fs.copy(personaPath, absoluteTarget);
        console.log(`Success: Copied ${agent} persona to ${target} (fallback due to symlink restrictions)`);
      }
    } catch (err) {
      console.error(`Error linking persona: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("bootstrap")
  .description("Install all agent personas and slash commands into local LLM environments")
  .action(async () => {
    const ANTIGRAVITY_COMMANDS_ROOTS = [
      path.join(os.homedir(), ".gemini", "commands"),
      path.join(os.homedir(), ".gemini", "antigravity", "commands"),
      path.join(os.homedir(), ".gemini", "antigravity-cli", "commands"),
      path.join(os.homedir(), ".gemini", "antigravity-ide", "commands")
    ];

    const ANTIGRAVITY_AGENTS_ROOTS = [
      path.join(os.homedir(), ".gemini", "agents"),
      path.join(os.homedir(), ".gemini", "antigravity", "agents"),
      path.join(os.homedir(), ".gemini", "antigravity-cli", "agents"),
      path.join(os.homedir(), ".gemini", "antigravity-ide", "agents")
    ];

    const ANTIGRAVITY_BRAIN_ROOTS = [
      path.join(os.homedir(), ".gemini", "antigravity", "brain"),
      path.join(os.homedir(), ".gemini", "antigravity-cli", "brain"),
      path.join(os.homedir(), ".gemini", "antigravity-ide", "brain")
    ];

    for (const root of ANTIGRAVITY_COMMANDS_ROOTS) {
      try {
        await fs.ensureDir(root);
      } catch (err) {
        // ignore errors for secure directories if they aren't used
      }
    }
    for (const root of ANTIGRAVITY_AGENTS_ROOTS) {
      try {
        await fs.ensureDir(root);
      } catch (err) {
        // ignore errors
      }
    }
    for (const root of ANTIGRAVITY_BRAIN_ROOTS) {
      try {
        await fs.ensureDir(root);
      } catch (err) {
        // ignore errors
      }
    }

    const agents = (await fs.readdir(ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "bin", "docs", "common", "test"].includes(d.name))
      .map((d) => d.name);

    console.log("\n🚀 Bootstrapping Universal Agent Hub...");

    // 0. Configure MCP Settings
    const SETTINGS_PATH = path.join(os.homedir(), ".gemini", "settings.json");
    const ANTIGRAVITY_MCP_CONFIG_PATHS = [
      path.join(os.homedir(), ".gemini", "antigravity", "mcp_config.json"),
      path.join(os.homedir(), ".gemini", "antigravity-cli", "mcp_config.json"),
      path.join(os.homedir(), ".gemini", "antigravity-ide", "mcp_config.json")
    ];

    const updateMcpServers = (mcpServers) => {
      let updated = false;
      // Add Filesystem MCP if missing
      if (!mcpServers.filesystem) {
        mcpServers.filesystem = {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", os.homedir()]
        };
        updated = true;
      }

      // Add Context7 MCP if missing
      if (!mcpServers.context7) {
        mcpServers.context7 = {
          command: "npx",
          args: ["-y", "@upstash/context7-mcp"],
          env: {
            CONTEXT7_API_KEY: ""
          }
        };
        updated = true;
      }

      // Add/fix Agent Hub MCP.
      // Point to bin/agent-hub.js with the 'serve' command. Stdio piping in
      // the serve command forwards framing correctly to index.js.
      const correctAgentHubEntry = {
        command: "node",
        args: [path.join(ROOT, "bin", "agent-hub.js"), "serve"]
      };
      const existingHub = mcpServers["agent-hub"];
      const isDirectIndexPath = existingHub && Array.isArray(existingHub.args) &&
        existingHub.args.some(a => a.includes("index.js"));
      if (!existingHub || isDirectIndexPath) {
        mcpServers["agent-hub"] = correctAgentHubEntry;
        updated = true;
      }

      // Add Stitch MCP if missing
      if (!mcpServers.stitch) {
        mcpServers.stitch = {
          command: "npx",
          args: ["-y", "@_davideast/stitch-mcp", "proxy"],
          env: {
            STITCH_API_KEY: ""
          }
        };
        updated = true;
      }

      // Add SonarQube MCP if missing
      if (!mcpServers.sonarqube) {
        mcpServers.sonarqube = {
          command: "npx",
          args: ["-y", "sonarqube-mcp-server"],
          env: {
            SONARQUBE_URL: "http://localhost:9000",
            SONARQUBE_TOKEN: ""
          }
        };
        updated = true;
      }
      return updated;
    };

    if (await fs.pathExists(SETTINGS_PATH)) {
      try {
        const settings = await fs.readJson(SETTINGS_PATH);
        if (!settings.mcpServers) settings.mcpServers = {};
        if (updateMcpServers(settings.mcpServers)) {
          await fs.writeJson(SETTINGS_PATH, settings, { spaces: 2 });
          console.log("   ✅ [MCP] Configured MCP servers in global settings.json");
        }
      } catch (e) {
        console.warn(`   ⚠️ [MCP] Could not update settings.json: ${e.message}`);
      }
    }

    for (const mcpPath of ANTIGRAVITY_MCP_CONFIG_PATHS) {
      try {
        let config = { mcpServers: {} };
        if (await fs.pathExists(mcpPath)) {
          config = await fs.readJson(mcpPath);
        } else {
          await fs.ensureDir(path.dirname(mcpPath));
        }
        if (!config.mcpServers) config.mcpServers = {};
        if (updateMcpServers(config.mcpServers)) {
          await fs.writeJson(mcpPath, config, { spaces: 2 });
          console.log(`   ✅ [MCP] Configured MCP servers in ${mcpPath}`);
        }
      } catch (e) {
        console.warn(`   ⚠️ [MCP] Could not update ${mcpPath}: ${e.message}`);
      }
    }

    // 1. Configure Claude Code MCP
    console.log("\n🤖 Configuring Claude Code...");
    const CLAUDE_CONFIG_PATHS = [
      path.join(os.homedir(), ".claude", "claude_desktop_config.json"),       // Claude Desktop (all platforms)
      path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json"), // Claude Desktop (Windows alt)
      path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"), // Claude Desktop (macOS)
    ];

    const HUB_MCP_ENTRY = {
      command: "npx",
      args: ["github:SouzaEduardoAC/ai-agents", "serve"],
    };

    let claudeConfigured = false;
    for (const claudePath of CLAUDE_CONFIG_PATHS) {
      if (await fs.pathExists(claudePath)) {
        try {
          const claudeConfig = await fs.readJson(claudePath);
          if (!claudeConfig.mcpServers) claudeConfig.mcpServers = {};
          if (!claudeConfig.mcpServers["agent-hub"]) {
            claudeConfig.mcpServers["agent-hub"] = HUB_MCP_ENTRY;
            await fs.writeJson(claudePath, claudeConfig, { spaces: 2 });
            console.log(`   ✅ [Claude] Configured agent-hub MCP server in ${claudePath}`);
          } else {
            console.log(`   ✅ [Claude] agent-hub MCP already registered in ${claudePath}`);
          }
          claudeConfigured = true;
          break;
        } catch (e) {
          console.warn(`   ⚠️ [Claude] Could not update ${claudePath}: ${e.message}`);
        }
      }
    }

    if (!claudeConfigured) {
      console.log("   ℹ️ [Claude] No Claude config file detected — register manually (see instructions below).");
    }

    for (const agent of agents) {
      console.log(`\n📦 Processing Agent: [${agent.toUpperCase()}]`);

      // 1. Install Gemini/AntiGravity Slash Commands
      const cmdSource = path.join(ROOT, agent, "commands", agent);
      if (await fs.pathExists(cmdSource)) {
        const tomlFiles = await fs.readdir(cmdSource);
        for (const file of tomlFiles) {
          if (file.endsWith(".toml")) {
            const content = await fs.readFile(path.join(cmdSource, file), "utf-8");
            const updatedContent = content.replace(/~\/\.gemini\/agents/g, ROOT).replace(/\.\.\/\.\.\/\.\./g, ROOT);
            
            for (const root of ANTIGRAVITY_COMMANDS_ROOTS) {
              const cmdTarget = path.join(root, agent);
              try {
                await fs.ensureDir(cmdTarget);
                await fs.writeFile(path.join(cmdTarget, file), updatedContent);
              } catch (err) {
                // ignore permission or path errors for individual clients
              }
            }
            console.log(`   ✅ [AntiGravity] Installed /${agent}:${path.basename(file, ".toml")}`);
          }
        }
      }

      // 2. Install AntiGravity Personas
      const personaSource = path.join(ROOT, agent, "brain", "persona.md");
      if (await fs.pathExists(personaSource)) {
        for (const root of ANTIGRAVITY_BRAIN_ROOTS) {
          const personaTarget = path.join(root, `${agent}.md`);
          try {
            await fs.copy(personaSource, personaTarget);
          } catch (err) {
            // ignore errors
          }
        }
        console.log(`   ✅ [AntiGravity] Installed persona: ${agent}.md`);
      }

      // 3. Link Agent directories to ~/.gemini/agents/
      const agentDirSource = path.join(ROOT, agent);
      const symlinkType = process.platform === "win32" ? "junction" : "dir";
      for (const root of ANTIGRAVITY_AGENTS_ROOTS) {
        const agentDirTarget = path.join(root, agent);
        try {
          if (await fs.pathExists(agentDirTarget)) {
            await fs.remove(agentDirTarget);
          }
          try {
            await fs.symlink(agentDirSource, agentDirTarget, symlinkType);
            console.log(`   ✅ [AntiGravity] Symlinked agent folder to ${root}`);
          } catch (symlinkErr) {
            // Fall back to physical copy if symlink fails
            await fs.copy(agentDirSource, agentDirTarget);
            console.log(`   ✅ [AntiGravity] Copied agent folder to ${root} (fallback)`);
          }
        } catch (err) {
          // ignore folder linking errors (e.g. if a root matches system protection boundary)
        }
      }
    }

    console.log("\n✨ Bootstrap Complete!");
    console.log("==================================================");
    console.log("\n1️⃣  AntiGravity CLI");
    console.log("    → Restart your terminal to activate slash commands.");
    console.log("    → Personas are available in the Manager View.");
    console.log("\n2️⃣  Gemini CLI");
    console.log("    → Slash commands installed in ~/.gemini/commands/");
    console.log("    → MCP servers registered in ~/.gemini/settings.json");
    console.log("\n3️⃣  Claude Code");
    console.log("    → If auto-config succeeded, restart Claude Code.");
    console.log("    → If not detected, run this command manually:");
    console.log("       mcp add agent-hub -- npx github:SouzaEduardoAC/ai-agents serve");
    console.log("    → Then use: call_agent_command(agent, command, args)");
    console.log("\n4️⃣  Codex / Cursor");
    console.log("    → Link an agent persona to your project:");
    console.log("       agent-hub link squad .cursorrules");
    console.log("==================================================");
  });


program.parse();
