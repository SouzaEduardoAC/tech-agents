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
  .description("[Deprecated] Legacy setup command — registration is now handled via MCP serve")
  .action(() => {
    console.warn("⚠️  [Deprecated] 'tech-agents bootstrap' is deprecated and no longer needed.");
    console.warn("   The MCP server is fully self-contained and serves personas dynamically.");
    console.warn("   Register the server directly in your AI client using:");
    console.warn("     mcp add tech-agents -- npx github:SouzaEduardoAC/tech-agents serve\n");
  });


program.parse();
