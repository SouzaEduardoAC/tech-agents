import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs-extra";
import os from "os";
import assert from "assert";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sendRequest(proc, msg, timeoutMs = 20000) {
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
  console.log("Starting Phase 7: End-to-End Feature Dev Lifecycle Verification...");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tech-agents-v3-e2e-"));

  // Initialize git repo and mock package.json
  execSync("git init", { cwd: tempDir, stdio: "ignore" });
  execSync("git config user.name 'Test Runner'", { cwd: tempDir, stdio: "ignore" });
  execSync("git config user.email 'test@example.com'", { cwd: tempDir, stdio: "ignore" });

  await fs.writeJson(path.join(tempDir, "package.json"), {
    name: "mock-v3-project",
    version: "1.0.0",
    scripts: {
      test: "node -e 'process.exit(1)'", // initially failing
    },
  }, { spaces: 2 });

  execSync("git add package.json && git commit -m 'chore: initial commit'", { cwd: tempDir, stdio: "ignore" });

  const proc = spawn("node", [path.join(ROOT, "bin", "tech-agents.js"), "serve"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, NODE_ENV: "test" },
  });

  try {
    // Handshake
    const initRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "e2e-test", version: "1.0.0" },
      },
    });
    assert.strictEqual(initRes.result.serverInfo.name, "tech-agents");

    // 1. Start Feature Dev Playbook
    const startRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "playbook_start",
        arguments: {
          playbook: "feature_dev",
          goal: "Build OAuth2 Multi-Tenant SSO",
          cwd: tempDir,
        },
      },
    });
    assert(!startRes.error && !startRes.result.isError);
    assert(startRes.result.content[0].text.includes("Full Cycle Feature Development Pipeline"));
    console.log("✅ Playbook feature_dev started (7 steps registered)");

    // Step 1: discovery (gate: prd)
    const step1Res = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_step", arguments: { cwd: tempDir } },
    });
    assert(step1Res.result.content[0].text.includes("Product Elicitation"));

    // Verify advancing is blocked while gate 'prd' is locked
    const adv1Blocked = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(adv1Blocked.result.isError);
    assert(adv1Blocked.result.content[0].text.includes("GATE LOCKED: Gate 'prd'"));
    console.log("✅ Step 1 correctly blocked by locked 'prd' gate");

    // Request approval for 'prd'
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "request_approval",
        arguments: { gate: "prd", summary: "PRD completed", cwd: tempDir },
      },
    });

    // Verify advancing is blocked while gate 'prd' is pending
    const adv1Pending = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(adv1Pending.result.isError);
    assert(adv1Pending.result.content[0].text.includes("GATE PENDING APPROVAL: Gate 'prd'"));
    console.log("✅ Step 1 correctly blocked by pending 'prd' gate");

    // Approve 'prd'
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "prd", cwd: tempDir } },
    });

    // Advance to Step 2
    const adv1Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv1Success.result.isError);
    assert(adv1Success.result.content[0].text.includes("Advanced to step 2/7: analysis"));
    console.log("✅ Step 1 advanced to Step 2 (analysis)");

    // Step 2: analysis (gate: discovery)
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "request_approval", arguments: { gate: "discovery", summary: "Analysis complete", cwd: tempDir } },
    });
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "discovery", cwd: tempDir } },
    });
    const adv2Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv2Success.result.isError);
    assert(adv2Success.result.content[0].text.includes("Advanced to step 3/7: architecture"));
    console.log("✅ Step 2 advanced to Step 3 (architecture)");

    // Step 3: architecture (gate: plan)
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "request_approval", arguments: { gate: "plan", summary: "ADR complete", cwd: tempDir } },
    });
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "plan", cwd: tempDir } },
    });
    const adv3Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv3Success.result.isError);
    assert(adv3Success.result.content[0].text.includes("Advanced to step 4/7: compliance"));
    console.log("✅ Step 3 advanced to Step 4 (compliance)");

    // Step 4: compliance (gate: compliance)
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "request_approval", arguments: { gate: "compliance", summary: "GDPR compliance approved", cwd: tempDir } },
    });
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "compliance", cwd: tempDir } },
    });
    const adv4Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv4Success.result.isError);
    assert(adv4Success.result.content[0].text.includes("Advanced to step 5/7: implementation"));
    console.log("✅ Step 4 advanced to Step 5 (implementation)");

    // Step 5: implementation (gate: execution, hard_checks: auto_detect)
    // First, approve the gate
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "request_approval", arguments: { gate: "execution", summary: "Implementation ready for checks", cwd: tempDir } },
    });
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "execution", cwd: tempDir } },
    });

    // Test script is failing right now (exit 1). Advance should fail due to hard check!
    const adv5FailingCheck = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(adv5FailingCheck.result.isError);
    assert(adv5FailingCheck.result.content[0].text.includes("Hard check failed for step 'implementation'"));
    console.log("✅ Step 5 correctly blocked by failing hard check (npm test exit 1)");

    // Now fix package.json test script to pass
    await fs.writeJson(path.join(tempDir, "package.json"), {
      name: "mock-v3-project",
      version: "1.0.0",
      scripts: {
        test: "node -e 'process.exit(0)'",
      },
    }, { spaces: 2 });

    // Explicitly run checks via playbook_run_checks
    const check5Res = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_run_checks", arguments: { cwd: tempDir } },
    });
    assert(!check5Res.result.isError);
    const check5Data = JSON.parse(check5Res.result.content[0].text);
    assert.strictEqual(check5Data.pass, true);
    console.log("✅ Step 5 hard check passed after test fix");

    // Advance to Step 6
    const adv5Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv5Success.result.isError);
    assert(adv5Success.result.content[0].text.includes("Advanced to step 6/7: acceptance"));
    console.log("✅ Step 5 advanced to Step 6 (acceptance)");

    // Step 6: acceptance (gate: acceptance)
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "request_approval", arguments: { gate: "acceptance", summary: "PO acceptance validated", cwd: tempDir } },
    });
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "acceptance", cwd: tempDir } },
    });
    const adv6Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv6Success.result.isError);
    assert(adv6Success.result.content[0].text.includes("Advanced to step 7/7: pull_request"));
    console.log("✅ Step 6 advanced to Step 7 (pull_request)");

    // Step 7: pull_request (gate: null, hard_checks: git status --porcelain)
    // Make sure git working directory is clean
    execSync("git add package.json && git commit -m 'test: update test script'", { cwd: tempDir, stdio: "ignore" });

    const adv7Success = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_advance", arguments: { cwd: tempDir } },
    });
    assert(!adv7Success.result.isError);
    assert(adv7Success.result.content[0].text.includes("completed successfully"));
    console.log("✅ Step 7 finalized: Full feature_dev lifecycle completed!");

    // Check playbook_status
    const statusRes = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "playbook_status", arguments: { cwd: tempDir } },
    });
    const statusData = JSON.parse(statusRes.result.content[0].text);
    assert.strictEqual(statusData.completed, true);
    assert.strictEqual(statusData.step_index, 7);
    assert.strictEqual(statusData.history.length, 7);
    console.log("✅ Full state machine verification passed (7 steps recorded in history)");

    console.log("\n🎉 ALL PHASE 7 E2E INTEGRATION TESTS PASSED!\n");
  } finally {
    proc.kill();
    await fs.remove(tempDir).catch(() => {});
  }
}

run().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
