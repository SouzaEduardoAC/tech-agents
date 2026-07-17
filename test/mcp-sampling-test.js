#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 10000;

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const ok = (s) => `${C.green}✅ PASS${C.reset} ${s}`;
const fail = (s) => `${C.red}❌ FAIL${C.reset} ${s}`;
const hdr = (s) => `\n${C.bold}${C.cyan}${s}${C.reset}`;

let msgId = 1;
const nextId = () => msgId++;

function spawnServer() {
  return spawn("node", [path.join(ROOT, "index.js")], {
    cwd: ROOT,
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "test" },
  });
}

function sendRequest(proc, msg) {
  proc.stdin.write(JSON.stringify(msg) + "\n");
}

async function runTests() {
  console.log(hdr("🧪 Starting MCP Sampling & Managed Loop Tests..."));
  
  // Clean up any stale files
  const testFilePath = path.join(ROOT, "scratch", "test-sample.txt");
  await fs.remove(testFilePath);

  // -------------------------------------------------------------
  // Test Case 1: Client without sampling support
  // -------------------------------------------------------------
  console.log(hdr("--- Scenario 1: Client lacks sampling capability ---"));
  const proc1 = spawnServer();
  let gotError = false;

  await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      proc1.kill();
      reject(new Error("Timeout waiting for fallback response"));
    }, TIMEOUT_MS);

    proc1.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.method === "initialize") {
            // Server doesn't send initialize, it receives it. Wait, the client sends initialize:
          } else if (parsed.id === 1) {
            // Handshake response
            // Now call the tool
            sendRequest(proc1, {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: {
                name: "run_agent_loop",
                arguments: {
                  agent: "quicky",
                  command: "fix",
                  args: "test loop fallback"
                }
              }
            });
          } else if (parsed.id === 2) {
            clearTimeout(timer);
            if (parsed.error || (parsed.result && parsed.result.isError)) {
              gotError = true;
            }
            resolve();
          }
        } catch (e) {
          // partial line
        }
      }
      buffer = lines[lines.length - 1];
    });

    // Start handshake
    sendRequest(proc1, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {}, // No sampling
        clientInfo: { name: "test-client-no-sampling", version: "1.0" }
      }
    });
  });

  proc1.kill();
  if (gotError) {
    console.log(ok("run_agent_loop correctly blocks and fails when client lacks sampling support"));
  } else {
    console.log(fail("run_agent_loop did not fail when client lacked sampling support"));
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test Case 2: Client with sampling support (full loop run)
  // -------------------------------------------------------------
  console.log(hdr("--- Scenario 2: Client with sampling capability ---"));
  const proc2 = spawnServer();
  let loopSucceeded = false;

  await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      proc2.kill();
      reject(new Error("Timeout waiting for loop execution"));
    }, TIMEOUT_MS);

    proc2.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          
          if (parsed.id === 1) {
            // Handshake response. Send initialized notification.
            sendRequest(proc2, {
              jsonrpc: "2.0",
              method: "notifications/initialized"
            });
            // Call the tool
            sendRequest(proc2, {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: {
                name: "run_agent_loop",
                arguments: {
                  agent: "quicky",
                  command: "fix",
                  args: "test loop run write text file"
                }
              }
            });
          } else if (parsed.method === "sampling/createMessage") {
            const prompt = parsed.params.systemPrompt || "";
            const messages = parsed.params.messages || [];
            
            // Check systemPrompt context
            if (!prompt.includes("QUICKY") || !prompt.includes("Common Standards")) {
              reject(new Error("systemPrompt does not contain pinned agent prompt"));
              return;
            }

            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === "user" && lastMsg.content.text.includes("written successfully")) {
              // Loop turn 3: Send complete
              sendRequest(proc2, {
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  role: "assistant",
                  content: {
                    type: "text",
                    text: "Task is fully resolved. <task_complete summary=\"File written and verified.\" />"
                  },
                  model: "mock-model"
                }
              });
            } else if (lastMsg && lastMsg.role === "user" && lastMsg.content.text.includes("Please continue")) {
              // Loop turn 2: Emulate file write
              sendRequest(proc2, {
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  role: "assistant",
                  content: {
                    type: "text",
                    text: "I will write the test file. <write_file path=\"scratch/test-sample.txt\">Hello Sampling Loop</write_file>"
                  },
                  model: "mock-model"
                }
              });
            } else {
              // Loop turn 1: Conversational response containing 'complete' and 'done' without tool execution.
              // This tests that the server-side loop parser does NOT exit prematurely on these keywords.
              sendRequest(proc2, {
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  role: "assistant",
                  content: {
                    type: "text",
                    text: "I have completed analyzing the task and I am done planning. I am now ready to write the file."
                  },
                  model: "mock-model"
                }
              });
            }
          } else if (parsed.id === 2) {
            // Final tool call response
            clearTimeout(timer);
            if (parsed.result && !parsed.result.isError) {
              loopSucceeded = true;
            }
            resolve();
          }
        } catch (e) {
          // partial line
        }
      }
      buffer = lines[lines.length - 1];
    });

    // Start handshake WITH sampling
    sendRequest(proc2, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          sampling: {} // Has sampling capability!
        },
        clientInfo: { name: "test-client-sampling", version: "1.0" }
      }
    });
  });

  proc2.kill();

  if (loopSucceeded) {
    console.log(ok("run_agent_loop executed successfully with client sampling"));
  } else {
    console.log(fail("run_agent_loop failed during execution"));
    process.exit(1);
  }

  // Verify file write took place
  const exists = await fs.pathExists(testFilePath);
  if (exists) {
    const content = await fs.readFile(testFilePath, "utf8");
    if (content === "Hello Sampling Loop") {
      console.log(ok("Local file-write tool execution validated inside loop"));
    } else {
      console.log(fail(`Incorrect file content: "${content}"`));
      process.exit(1);
    }
  } else {
    console.log(fail("Local file-write was not executed"));
    process.exit(1);
  }

  // Cleanup
  await fs.remove(testFilePath);

  console.log(hdr("🎉 ALL SAMPLING TESTS PASSED SUCCESSFULLY!\n"));
}

runTests().catch(err => {
  console.error(fail(err.stack || err.message));
  process.exit(1);
});
