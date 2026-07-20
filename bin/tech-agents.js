#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const pkg = fs.readJsonSync(path.join(ROOT, "package.json"));

const program = new Command();

program
  .name("tech-agents")
  .description("Universal bridge for AI Agents")
  .version(pkg.version);

program
  .command("serve")
  .description("Start the MCP server")
  .action(async () => {
    const serverPath = path.join(ROOT, "index.js");
    try {
      await import(pathToFileURL(serverPath).href);
    } catch (err) {
      process.stderr.write(`[tech-agents] Failed to start MCP server: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command("link")
  .description("Link an agent persona or MCP usage guide to a local file (e.g., .cursorrules)")
  .argument("<agent>", "Name of the agent or 'mcp' for MCP Usage Guide")
  .argument("<target>", "Target file path")
  .action(async (agent, target) => {
    const isMcp = agent.toLowerCase() === "mcp";
    const targetName = isMcp ? "MCP usage guide" : `${agent} persona`;
    const personaPath = isMcp
      ? path.join(ROOT, "common", "skills", "mcp_usage_guide.md")
      : path.join(ROOT, agent, "brain", "persona.md");

    if (!(await fs.pathExists(personaPath))) {
      console.error(`Error: ${isMcp ? "MCP usage guide" : `Agent '${agent}'`} not found.`);
      process.exit(1);
    }
    const absoluteTarget = path.resolve(process.cwd(), target);
    await fs.ensureDir(path.dirname(absoluteTarget));
    try {
      if (await fs.pathExists(absoluteTarget)) await fs.remove(absoluteTarget);
      
      try {
        await fs.symlink(personaPath, absoluteTarget);
        console.log(`Success: Symlinked ${targetName} to ${target}`);
      } catch (symlinkErr) {
        // Fall back to physical copy if symlink fails (e.g. on Windows without Developer Mode)
        await fs.copy(personaPath, absoluteTarget);
        console.log(`Success: Copied ${targetName} to ${target} (fallback due to symlink restrictions)`);
      }
    } catch (err) {
      console.error(`Error linking file: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("bootstrap")
  .description("Install all agent personas and slash commands into local LLM environments")
  .action(async () => {
    const CLIENT_SUBDIRS = [
      ".gemini",
      ".antigravity",
      ".antigravitycli",
      ".antigravity-cli",
      ".antigravity-ide",
      ".codex",
      ".codexcli",
      ".codex-cli",
      ".codex-ide",
      path.join(".gemini", "antigravity"),
      path.join(".gemini", "antigravity-cli"),
      path.join(".gemini", "antigravity-ide"),
      path.join(".gemini", "codex"),
      path.join(".gemini", "codexcli"),
      path.join(".gemini", "codex-cli"),
      path.join(".gemini", "codex-ide")
    ];

    const ANTIGRAVITY_COMMANDS_ROOTS = CLIENT_SUBDIRS.map(d => path.join(os.homedir(), d, "commands"));
    const ANTIGRAVITY_AGENTS_ROOTS = CLIENT_SUBDIRS.map(d => path.join(os.homedir(), d, "agents"));
    const ANTIGRAVITY_BRAIN_ROOTS = CLIENT_SUBDIRS.map(d => path.join(os.homedir(), d, "brain"));

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

    console.log("\n🚀 Bootstrapping Universal Tech Agents...");

    // 0. Configure MCP Settings
    const SETTINGS_PATH = path.join(os.homedir(), ".gemini", "settings.json");
    const ANTIGRAVITY_MCP_CONFIG_PATHS = [];
    for (const subDir of CLIENT_SUBDIRS) {
      const dirPath = path.join(os.homedir(), subDir);
      if (subDir !== ".gemini") {
        ANTIGRAVITY_MCP_CONFIG_PATHS.push(path.join(dirPath, "mcp_config.json"));
        ANTIGRAVITY_MCP_CONFIG_PATHS.push(path.join(dirPath, "settings.json"));
      } else {
        ANTIGRAVITY_MCP_CONFIG_PATHS.push(path.join(dirPath, "mcp_config.json"));
      }
    }

    // Scan all config files to extract the best environment variables and settings.
    const allConfigPaths = [SETTINGS_PATH, ...ANTIGRAVITY_MCP_CONFIG_PATHS];
    const extractedEnv = {
      stitch: {},
      context7: {},
      sonarqube: {}
    };

    for (const p of allConfigPaths) {
      try {
        if (await fs.pathExists(p)) {
          const cfg = await fs.readJson(p);
          const servers = cfg.mcpServers || {};

          // Extract Stitch API key
          const stitchEnv = servers.stitch?.env || {};
          if (stitchEnv.STITCH_API_KEY && !extractedEnv.stitch.STITCH_API_KEY) {
            extractedEnv.stitch.STITCH_API_KEY = stitchEnv.STITCH_API_KEY;
          }
          // Also try legacy StitchMCP
          const stitchMcpArgs = servers.StitchMCP?.args;
          if (Array.isArray(stitchMcpArgs) && !extractedEnv.stitch.STITCH_API_KEY) {
            const headerArg = stitchMcpArgs.find(arg => typeof arg === 'string' && arg.startsWith('X-Goog-Api-Key:'));
            if (headerArg) {
              extractedEnv.stitch.STITCH_API_KEY = headerArg.split('X-Goog-Api-Key:')[1].trim();
            }
          }

          // Extract Context7 API key
          const c7Env = servers.context7?.env || {};
          if (c7Env.CONTEXT7_API_KEY && !extractedEnv.context7.CONTEXT7_API_KEY) {
            extractedEnv.context7.CONTEXT7_API_KEY = c7Env.CONTEXT7_API_KEY;
          }

          // Extract SonarQube config
          const sqEnv = servers.sonarqube?.env || {};
          if (sqEnv.SONARQUBE_TOKEN && !extractedEnv.sonarqube.SONARQUBE_TOKEN) {
            extractedEnv.sonarqube.SONARQUBE_TOKEN = sqEnv.SONARQUBE_TOKEN;
          }
          if (sqEnv.SONARQUBE_URL && sqEnv.SONARQUBE_URL !== "http://localhost:9000" && !extractedEnv.sonarqube.SONARQUBE_URL) {
            extractedEnv.sonarqube.SONARQUBE_URL = sqEnv.SONARQUBE_URL;
          }
          if (sqEnv.SONARQUBE_ORGANIZATION && !extractedEnv.sonarqube.SONARQUBE_ORGANIZATION) {
            extractedEnv.sonarqube.SONARQUBE_ORGANIZATION = sqEnv.SONARQUBE_ORGANIZATION;
          }
        }
      } catch (e) {
        // ignore read errors
      }
    }

    const isLocalClone = await fs.pathExists(path.join(ROOT, ".git"));

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

      // Add Context7 MCP if missing or update empty API Key
      const context7Key = process.env.CONTEXT7_API_KEY || extractedEnv.context7.CONTEXT7_API_KEY || "";
      if (!mcpServers.context7) {
        mcpServers.context7 = {
          command: "npx",
          args: ["-y", "@upstash/context7-mcp"],
          env: {
            CONTEXT7_API_KEY: context7Key
          }
        };
        updated = true;
      } else {
        if (!mcpServers.context7.env) {
          mcpServers.context7.env = {};
        }
        if (context7Key && mcpServers.context7.env.CONTEXT7_API_KEY !== context7Key) {
          mcpServers.context7.env.CONTEXT7_API_KEY = context7Key;
          updated = true;
        }
      }

      // Add/fix Agent Hub MCP.
      // If we are running from a local git clone, point directly to index.js
      // for instant, offline execution that immediately reflects local edits.
      // Otherwise, fall back to the remote unversioned GitHub repository via npx.
      if (mcpServers["agent-hub"]) {
        delete mcpServers["agent-hub"];
        updated = true;
      }
      const correctTechAgentsEntry = {
        command: "npx",
        args: [
          "-y",
          "@souzaeduardoac/tech-agents",
          "serve"
        ]
      };
      const existingHub = mcpServers["tech-agents"];
      const needsUpdate = !existingHub ||
        existingHub.command !== "npx" ||
        !Array.isArray(existingHub.args) ||
        existingHub.args.join(" ") !== "-y @souzaeduardoac/tech-agents serve";
      if (needsUpdate) {
        mcpServers["tech-agents"] = correctTechAgentsEntry;
        updated = true;
      }

      // Add Stitch MCP if missing or update empty API Key
      const stitchKey = process.env.STITCH_API_KEY || extractedEnv.stitch.STITCH_API_KEY || "";
      if (!mcpServers.stitch) {
        mcpServers.stitch = {
          command: "npx",
          args: ["-y", "@_davideast/stitch-mcp", "proxy"],
          env: {
            STITCH_API_KEY: stitchKey
          }
        };
        updated = true;
      } else {
        if (!mcpServers.stitch.env) {
          mcpServers.stitch.env = {};
        }
        if (stitchKey && mcpServers.stitch.env.STITCH_API_KEY !== stitchKey) {
          mcpServers.stitch.env.STITCH_API_KEY = stitchKey;
          updated = true;
        }
      }

      // Add SonarQube MCP if missing or update config
      const sqUrl = process.env.SONARQUBE_URL || extractedEnv.sonarqube.SONARQUBE_URL || "http://localhost:9000";
      const sqToken = process.env.SONARQUBE_TOKEN || extractedEnv.sonarqube.SONARQUBE_TOKEN || "";
      const sqOrg = process.env.SONARQUBE_ORGANIZATION || extractedEnv.sonarqube.SONARQUBE_ORGANIZATION || "";

      if (!mcpServers.sonarqube) {
        mcpServers.sonarqube = {
          command: "npx",
          args: ["-y", "sonarqube-mcp-server"],
          env: {
            SONARQUBE_URL: sqUrl,
            SONARQUBE_TOKEN: sqToken
          }
        };
        if (sqOrg) {
          mcpServers.sonarqube.env.SONARQUBE_ORGANIZATION = sqOrg;
        }
        updated = true;
      } else {
        if (!mcpServers.sonarqube.env) {
          mcpServers.sonarqube.env = {};
        }
        let envUpdated = false;
        if (sqUrl && mcpServers.sonarqube.env.SONARQUBE_URL !== sqUrl) {
          mcpServers.sonarqube.env.SONARQUBE_URL = sqUrl;
          envUpdated = true;
        }
        if (sqToken && mcpServers.sonarqube.env.SONARQUBE_TOKEN !== sqToken) {
          mcpServers.sonarqube.env.SONARQUBE_TOKEN = sqToken;
          envUpdated = true;
        }
        if (sqOrg && mcpServers.sonarqube.env.SONARQUBE_ORGANIZATION !== sqOrg) {
          mcpServers.sonarqube.env.SONARQUBE_ORGANIZATION = sqOrg;
          envUpdated = true;
        }
        if (envUpdated) {
          updated = true;
        }
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
      args: [
        "-y",
        "@souzaeduardoac/tech-agents",
        "serve"
      ]
    };

    let claudeConfigured = false;
    for (const claudePath of CLAUDE_CONFIG_PATHS) {
      if (await fs.pathExists(claudePath)) {
        try {
          const claudeConfig = await fs.readJson(claudePath);
          if (!claudeConfig.mcpServers) claudeConfig.mcpServers = {};
          let configChanged = false;
          if (claudeConfig.mcpServers["agent-hub"]) {
            delete claudeConfig.mcpServers["agent-hub"];
            configChanged = true;
          }
          const existingTechAgents = claudeConfig.mcpServers["tech-agents"];
          const needsTechAgentsUpdate = !existingTechAgents || 
            (isLocalClone && (existingTechAgents.command !== "node" || !Array.isArray(existingTechAgents.args) || existingTechAgents.args[0] !== path.join(ROOT, "index.js"))) ||
            (!isLocalClone && (existingTechAgents.command !== "npx" || !Array.isArray(existingTechAgents.args) || existingTechAgents.args.length < 4 || existingTechAgents.args[2] !== "https://github.com/SouzaEduardoAC/tech-agents"));
          
          if (needsTechAgentsUpdate) {
            claudeConfig.mcpServers["tech-agents"] = HUB_MCP_ENTRY;
            configChanged = true;
          }

          if (configChanged) {
            await fs.writeJson(claudePath, claudeConfig, { spaces: 2 });
            console.log(`   ✅ [Claude] Configured tech-agents MCP server in ${claudePath}`);
          } else {
            console.log(`   ✅ [Claude] tech-agents MCP already registered in ${claudePath}`);
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
            const updatedContent = content.replace(/~\/\.(gemini|antigravity|antigravitycli|antigravity-cli|antigravity-ide|codex|codexcli|codex-cli|codex-ide)\/agents/g, ROOT).replace(/\.\.\/\.\.\/\.\./g, ROOT);
            
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
    console.log("       mcp add tech-agents -- npx github:SouzaEduardoAC/tech-agents serve");
    console.log("    → Then use: call_agent_command(agent, command, args)");
    console.log("\n4️⃣  Codex / Cursor");
    console.log("    → Link an agent persona to your project:");
    console.log("       tech-agents link squad .cursorrules");
    console.log("==================================================");
  });


program.parse();
