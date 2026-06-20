#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import os from "os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = path.join(ROOT, ".squad-state.json");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const ok   = (s) => `${C.green}✅ PASS${C.reset} ${s}`;
const fail = (s) => `${C.red}❌ FAIL${C.reset} ${s}`;

let msgId = 1;
const nextId = () => msgId++;

function spawnServer(cwd) {
  return spawn("node", [path.join(ROOT, "bin", "agent-hub.js"), "serve"], {
    cwd,
    stdio: "pipe",
    env: process.env,
  });
}

function sendRequest(proc, msg) {
  return new Promise((resolve, reject) => {
    const id = msg.id;
    let buffer = "";
    const timer = setTimeout(() => {
      proc.stdout.off("data", onData);
      reject(new Error(`Timeout waiting for id=${id}`));
    }, 5000);

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.id === id) {
            clearTimeout(timer);
            proc.stdout.off("data", onData);
            resolve(parsed);
          }
        } catch {
          // partial line
        }
      }
      buffer = lines[lines.length - 1];
    };

    proc.stdout.on("data", onData);
    proc.stdin.write(JSON.stringify(msg) + "\n");
  });
}

async function runTests() {
  console.log(`${C.bold}${C.cyan}Starting MCP approval & repo containment tests...${C.reset}\n`);
  let failed = 0;

  // Clean state file before starting
  await fs.remove(STATE_FILE);

  // ────────────────────────────────────────────────────────────────────────
  // Test Scenario 1: Inside the Hub
  // ────────────────────────────────────────────────────────────────────────
  console.log(`${C.bold}--- Scenario 1: Inside the Hub (CWD = ROOT) ---${C.reset}`);
  const hubProc = spawnServer(ROOT);
  
  try {
    // 1. Initialize
    await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    });

    // 2. Start pipeline session
    const startResp = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "pipeline_start",
        arguments: { goal: "Test pipeline approve functionality", gates: ["prd", "plan"] }
      }
    });
    if (startResp.error || startResp.result.isError) {
      console.log(fail("pipeline_start failed"));
      failed++;
    } else {
      console.log(ok("pipeline_start succeeded"));
    }

    // 3. check_gate on locked gate (prd)
    const checkLocked = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "check_gate", arguments: { gate: "prd" } }
    });
    if (checkLocked.result && checkLocked.result.isError && checkLocked.result.content[0].text.includes("has not been reached yet")) {
      console.log(ok("check_gate correctly blocks locked gate"));
    } else {
      console.log(fail(`check_gate did not block locked gate correctly: ${JSON.stringify(checkLocked)}`));
      failed++;
    }

    // 4. request_approval for prd
    const reqApprove = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "request_approval",
        arguments: { gate: "prd", summary: "Completed PRD definition", artifact_path: "docs/pages/prd.md" }
      }
    });
    const reqText = reqApprove.result?.content?.[0]?.text ?? "";
    if (reqText.includes("approve this gate") && reqText.includes("pipeline_approve tool")) {
      console.log(ok("request_approval instructions updated to mention pipeline_approve tool"));
    } else {
      console.log(fail(`request_approval instructions missing tool mention: ${reqText}`));
      failed++;
    }

    // 5. check_gate on pending gate (prd)
    const checkPending = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "check_gate", arguments: { gate: "prd" } }
    });
    const pendingText = checkPending.result?.content?.[0]?.text ?? "";
    if (checkPending.result && checkPending.result.isError && pendingText.includes("pipeline_approve tool")) {
      console.log(ok("check_gate correctly blocks pending gate and mentions pipeline_approve tool"));
    } else {
      console.log(fail(`check_gate did not block pending gate correctly or missed tool mention: ${JSON.stringify(checkPending)}`));
      failed++;
    }

    // 6. pipeline_approve on locked gate (plan)
    const approveLocked = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "plan" } }
    });
    if (approveLocked.result && approveLocked.result.isError && approveLocked.result.content[0].text.includes("currently locked")) {
      console.log(ok("pipeline_approve blocks approval of locked gates"));
    } else {
      console.log(fail(`pipeline_approve allowed/errored incorrectly on locked gate: ${JSON.stringify(approveLocked)}`));
      failed++;
    }

    // 7. pipeline_approve on pending gate (prd)
    const approvePending = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "prd" } }
    });
    if (approvePending.result && !approvePending.result.isError && approvePending.result.content[0].text.includes("Gate 'prd' approved")) {
      console.log(ok("pipeline_approve successfully approves pending gate"));
    } else {
      console.log(fail(`pipeline_approve failed to approve pending gate: ${JSON.stringify(approvePending)}`));
      failed++;
    }

    // 8. check_gate on approved gate (prd)
    const checkApproved = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "check_gate", arguments: { gate: "prd" } }
    });
    if (checkApproved.result && !checkApproved.result.isError && JSON.parse(checkApproved.result.content[0].text).approved === true) {
      console.log(ok("check_gate confirms approved gate"));
    } else {
      console.log(fail(`check_gate failed on approved gate: ${JSON.stringify(checkApproved)}`));
      failed++;
    }

    // 9. pipeline_approve again on approved gate (prd)
    const approveAgain = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "prd" } }
    });
    if (approveAgain.result && !approveAgain.result.isError && approveAgain.result.content[0].text.includes("already approved")) {
      console.log(ok("pipeline_approve handles already-approved gates gracefully"));
    } else {
      console.log(fail(`pipeline_approve failed on already-approved gate: ${JSON.stringify(approveAgain)}`));
      failed++;
    }

    // 10. call_agent_command inside hub (normal command, e.g. po/discovery)
    // Check that compliance mandate is present and warning is absent
    const agentInside = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "call_agent_command",
        arguments: { agent: "po", command: "discovery", args: "Feature request specs" }
      }
    });
    const promptInside = agentInside.result?.content?.[0]?.text ?? "";
    const hasMandate = promptInside.includes("## 📜 Documentation Protocol Integrity");
    const hasWarning = promptInside.includes("WARNING: The 'docs/pages/' folder is missing");
    
    if (hasMandate && !hasWarning) {
      console.log(ok("Inside hub: compliance mandate injected, Logseq warning absent"));
    } else {
      console.log(fail(`Prompt checks failed inside hub. Mandate present: ${hasMandate}, Warning present: ${hasWarning}`));
      failed++;
    }

    // 11. call_agent_command inside hub for full-sync (should NOT be blocked)
    const syncInside = await sendRequest(hubProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "call_agent_command",
        arguments: { agent: "squad", command: "full-sync", args: "" }
      }
    });
    const syncInsidePrompt = syncInside.result?.content?.[0]?.text ?? "";
    const hasExternalNoticeInside = syncInsidePrompt.includes("EXTERNAL WORKSPACE NOTICE");
    if (syncInside.result && !syncInside.result.isError && !hasExternalNoticeInside) {
      console.log(ok("Inside hub: full-sync command is allowed and has no external notice"));
    } else {
      console.log(fail(`Inside hub: full-sync was blocked, failed, or unexpectedly contained external notice: ${JSON.stringify(syncInside)}`));
      failed++;
    }

  } finally {
    hubProc.stdin.end();
    hubProc.kill();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Test Scenario 2: Outside the Hub
  // ────────────────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}--- Scenario 2: Outside the Hub (CWD = Temp Dir) ---${C.reset}`);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-hub-test-"));
  const outsideProc = spawnServer(tmpDir);

  try {
    // 1. Initialize
    await sendRequest(outsideProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    });

    // 2. call_agent_command outside hub for full-sync (should be allowed and contain external workspace notice)
    const syncOutside = await sendRequest(outsideProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "call_agent_command",
        arguments: { agent: "squad", command: "full-sync", args: "" }
      }
    });
    const syncOutsidePrompt = syncOutside.result?.content?.[0]?.text ?? "";
    const hasExternalNotice = syncOutsidePrompt.includes("EXTERNAL WORKSPACE NOTICE");
    if (syncOutside.result && !syncOutside.result.isError && hasExternalNotice) {
      console.log(ok("Outside hub: full-sync command is allowed and has external notice"));
    } else {
      console.log(fail(`Outside hub: full-sync failed, was blocked, or missed external notice: ${JSON.stringify(syncOutside)}`));
      failed++;
    }

    // 3. call_agent_command outside hub for normal command
    // Check that compliance mandate is absent and warning is present
    const agentOutside = await sendRequest(outsideProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: {
        name: "call_agent_command",
        arguments: { agent: "po", command: "discovery", args: "Feature request specs" }
      }
    });
    const promptOutside = agentOutside.result?.content?.[0]?.text ?? "";
    const hasMandateOutside = promptOutside.includes("## 📜 Documentation Protocol Integrity");
    const hasWarningOutside = promptOutside.includes("WARNING: The 'docs/pages/' folder is missing");

    if (!hasMandateOutside && hasWarningOutside) {
      console.log(ok("Outside hub: compliance mandate absent, Logseq warning injected"));
    } else {
      console.log(fail(`Prompt checks failed outside hub. Mandate present: ${hasMandateOutside}, Warning present: ${hasWarningOutside}`));
      failed++;
    }

    // 4. pipeline_approve outside hub without session
    const approveNoSession = await sendRequest(outsideProc, {
      jsonrpc: "2.0",
      id: nextId(),
      method: "tools/call",
      params: { name: "pipeline_approve", arguments: { gate: "prd" } }
    });
    if (approveNoSession.result && approveNoSession.result.isError && approveNoSession.result.content[0].text.includes("No active pipeline session found")) {
      console.log(ok("pipeline_approve fails when no session is active"));
    } else {
      console.log(fail(`pipeline_approve did not fail correctly without session: ${JSON.stringify(approveNoSession)}`));
      failed++;
    }

  } finally {
    outsideProc.stdin.end();
    outsideProc.kill();
    await fs.remove(tmpDir);
  }

  // Clean state file after finishing
  await fs.remove(STATE_FILE);

  console.log(`\n${C.bold}───────────────────────────────────────────────────────${C.reset}`);
  if (failed === 0) {
    console.log(`${C.bold}${C.green}ALL TESTS PASSED SUCCESSFULLY!${C.reset}`);
    process.exit(0);
  } else {
    console.log(`${C.bold}${C.red}SOME TESTS FAILED: ${failed} failure(s)${C.reset}`);
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error("Test execution error:", e);
  process.exit(1);
});
