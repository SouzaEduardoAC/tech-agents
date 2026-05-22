#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const program = new Command();

program
  .name("agent-hub")
  .description("Universal bridge for AI Agents")
  .version("1.1.0");

program
  .command("serve")
  .description("Start the MCP server")
  .action(() => {
    const serverPath = path.join(ROOT, "index.js");
    const child = spawn("node", [serverPath], {
      stdio: "inherit",
    });
    child.on("exit", (code) => process.exit(code));
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
    const GEMINI_COMMANDS_ROOT = path.join(os.homedir(), ".gemini", "commands");
    const ANTIGRAVITY_BRAIN_ROOT = path.join(os.homedir(), ".gemini", "antigravity", "brain");

    await fs.ensureDir(GEMINI_COMMANDS_ROOT);
    await fs.ensureDir(ANTIGRAVITY_BRAIN_ROOT);

    const agents = (await fs.readdir(ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "bin", "docs"].includes(d.name))
      .map((d) => d.name);

    console.log("\n🚀 Bootstrapping Universal Agent Hub...");

    // 0. Configure MCP Settings
    const SETTINGS_PATH = path.join(os.homedir(), ".gemini", "settings.json");
    if (await fs.pathExists(SETTINGS_PATH)) {
      try {
        const settings = await fs.readJson(SETTINGS_PATH);
        if (!settings.mcpServers) settings.mcpServers = {};
        
        // Add Filesystem MCP if missing
        if (!settings.mcpServers.filesystem) {
          settings.mcpServers.filesystem = {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", os.homedir()]
          };
          console.log("   ✅ [MCP] Configured filesystem server for home directory");
        }

        // Add Playwright MCP if missing
        if (!settings.mcpServers.playwright) {
          settings.mcpServers.playwright = {
            command: "npx",
            args: ["-y", "@playwright/mcp@latest", "--browser", "chrome"]
          };
          console.log("   ✅ [MCP] Configured playwright-mcp server");
        }

        // Add Agent Hub MCP if missing
        if (!settings.mcpServers["agent-hub"]) {
          settings.mcpServers["agent-hub"] = {
            command: "node",
            args: [path.join(ROOT, "bin", "agent-hub.js"), "serve"]
          };
          console.log("   ✅ [MCP] Configured agent-hub server");
        }

        // Add Stitch MCP if missing
        if (!settings.mcpServers.stitch) {
          settings.mcpServers.stitch = {
            command: "npx",
            args: ["-y", "@_davideast/stitch-mcp", "proxy"],
            env: {
              STITCH_API_KEY: ""
            }
          };
          console.log("   ✅ [MCP] Configured Google Stitch MCP server (STITCH_API_KEY placeholder added)");
        }

        // Add SonarQube MCP if missing
        if (!settings.mcpServers.sonarqube) {
          settings.mcpServers.sonarqube = {
            command: "npx",
            args: ["-y", "sonarqube-mcp-server"],
            env: {
              SONARQUBE_URL: "http://localhost:9000",
              SONARQUBE_TOKEN: ""
            }
          };
          console.log("   ✅ [MCP] Configured SonarQube MCP server (SONARQUBE_URL/TOKEN placeholders added)");
        }

        await fs.writeJson(SETTINGS_PATH, settings, { spaces: 2 });
      } catch (e) {
        console.warn(`   ⚠️ [MCP] Could not update settings.json: ${e.message}`);
      }
    }

    for (const agent of agents) {
      console.log(`\n📦 Processing Agent: [${agent.toUpperCase()}]`);

      // 1. Install Gemini Slash Commands
      const cmdSource = path.join(ROOT, agent, "commands", agent);
      if (await fs.pathExists(cmdSource)) {
        const cmdTarget = path.join(GEMINI_COMMANDS_ROOT, agent);
        await fs.ensureDir(cmdTarget);
        const tomlFiles = await fs.readdir(cmdSource);
        for (const file of tomlFiles) {
          if (file.endsWith(".toml")) {
            const content = await fs.readFile(path.join(cmdSource, file), "utf-8");
            const updatedContent = content.replace(/~\/\.gemini\/agents/g, ROOT).replace(/\.\.\/\.\.\/\.\./g, ROOT);
            await fs.writeFile(path.join(cmdTarget, file), updatedContent);
            console.log(`   ✅ [Gemini] Installed /${agent}:${path.basename(file, ".toml")}`);
          }
        }
      }

      // 2. Install AntiGravity Personas
      const personaSource = path.join(ROOT, agent, "brain", "persona.md");
      if (await fs.pathExists(personaSource)) {
        const personaTarget = path.join(ANTIGRAVITY_BRAIN_ROOT, `${agent}.md`);
        await fs.copy(personaSource, personaTarget);
        console.log(`   ✅ [AntiGravity] Installed persona: ${agent}.md`);
      }
    }

    console.log("\n✨ Bootstrap Complete!");
    console.log("--------------------------------------------------");
    console.log("1. Gemini CLI: Restart terminal to use slash commands.");
    console.log("2. AntiGravity: Personas are now in your Manager View.");
    console.log("3. Claude Code: Use 'call_agent_command' via the MCP server.");
    console.log("--------------------------------------------------");
  });

program.parse();
