import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import os from "os";
import assert from "assert";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sendRequest(proc, msg, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      proc.stdout.off("data", onData);
      reject(new Error(`Timeout waiting for response to ${msg.method || "call"}`));
    }, timeoutMs);

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === msg.id) {
            clearTimeout(timer);
            proc.stdout.off("data", onData);
            return resolve(parsed);
          }
        } catch (e) {
          // partial line
        }
      }
      buffer = lines[lines.length - 1];
    };

    proc.stdout.on("data", onData);
    proc.stdin.write(JSON.stringify(msg) + "\n");
  });
}

let msgId = 1;
const nextId = () => msgId++;

async function run() {
  console.log("Testing Phase 6: Native v3 Playbook MCP Tools Integration...");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tech-agents-v3-p6-"));

  const proc = spawn("node", [path.join(ROOT, "bin", "tech-agents.js"), "serve"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, NODE_ENV: "test" },
  });

  try {
    // 1. Initialize
    const initRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "v3-test", version: "1.0.0" },
      },
    });
    assert.strictEqual(initRes.result.serverInfo.name, "tech-agents");
    console.log("✅ MCP server initialized successfully");

    // 2. tools/list
    const toolsRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/list",
      params: {},
    });
    const toolNames = toolsRes.result.tools.map((t) => t.name);
    const expectedV3Tools = [
      "playbook_list",
      "playbook_start",
      "playbook_step",
      "playbook_run_checks",
      "playbook_advance",
      "playbook_status",
    ];
    for (const expected of expectedV3Tools) {
      assert(toolNames.includes(expected), `Missing expected v3 tool: ${expected}`);
    }
    console.log("✅ All 6 native v3 playbook tools registered in tools/list");

    // 3. playbook_list tool
    const listRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_list",
        arguments: {},
      },
    });
    assert(!listRes.error && !listRes.result.isError);
    const playbooks = JSON.parse(listRes.result.content[0].text);
    assert(Array.isArray(playbooks) && playbooks.length >= 6);
    assert(playbooks.some((p) => p.id === "feature_dev"));
    assert(playbooks.some((p) => p.id === "consultation"));
    console.log(`✅ playbook_list returned ${playbooks.length} playbooks`);

    // 4. playbook_start tool
    const startRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_start",
        arguments: {
          playbook: "consultation",
          goal: "Consult on high throughput distributed queue design",
          cwd: tempDir,
        },
      },
    });
    assert(!startRes.error && !startRes.result.isError);
    assert(startRes.result.content[0].text.includes("Playbook 'Strategic Consultation & Debate Pipeline' started."));
    console.log("✅ playbook_start successfully initialized consultation playbook");

    // 5. playbook_step tool
    const stepRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_step",
        arguments: { cwd: tempDir },
      },
    });
    assert(!stepRes.error && !stepRes.result.isError);
    const stepText = stepRes.result.content[0].text;
    assert(stepText.includes("Goal: Consult on high throughput distributed queue design"));
    assert(stepText.includes("## Cognitive Lens"));
    assert(stepText.includes("## Active Toolbox Permissions"));
    assert(stepText.includes("- `fs_read`"));
    assert(stepText.includes("- `search_web`"));
    console.log("✅ playbook_step returned compiled step context with lens and scoped toolbox");

    // 6. playbook_run_checks tool
    const checksRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_run_checks",
        arguments: { cwd: tempDir },
      },
    });
    assert(!checksRes.error && !checksRes.result.isError);
    const checksData = JSON.parse(checksRes.result.content[0].text);
    assert.strictEqual(checksData.pass, true);
    console.log("✅ playbook_run_checks executed active step checks successfully");

    // 7. playbook_advance tool
    const advanceRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_advance",
        arguments: { cwd: tempDir },
      },
    });
    assert(!advanceRes.error && !advanceRes.result.isError);
    assert(advanceRes.result.content[0].text.includes("completed successfully"));
    console.log("✅ playbook_advance successfully completed single-step consultation playbook");

    // 8. playbook_status tool
    const statusRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_status",
        arguments: { cwd: tempDir },
      },
    });
    assert(!statusRes.error && !statusRes.result.isError);
    const statusData = JSON.parse(statusRes.result.content[0].text);
    assert.strictEqual(statusData.completed, true);
    assert.strictEqual(statusData.history.length, 1);
    console.log("✅ playbook_status returned accurate completed session metadata");

    console.log("\n🎉 ALL PHASE 6 MCP INTEGRATION TESTS PASSED!\n");
  } finally {
    proc.kill();
    await fs.remove(tempDir).catch(() => {});
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
