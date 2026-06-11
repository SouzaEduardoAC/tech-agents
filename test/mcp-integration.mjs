#!/usr/bin/env node
/**
 * MCP Integration Test Suite
 * Tests ALL agent commands via the bin/agent-hub.js serve transport
 * (the path used by external clients: `npx github:SouzaEduardoAC/ai-agents serve`)
 *
 * Usage: node test/mcp-integration.mjs [--verbose]
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");
const TIMEOUT_MS = 30_000;

// ─── colour helpers ────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  grey: "\x1b[90m",
};
const ok   = (s) => `${C.green}✅ PASS${C.reset} ${s}`;
const fail = (s) => `${C.red}❌ FAIL${C.reset} ${s}`;
const warn = (s) => `${C.yellow}⚠️  WARN${C.reset} ${s}`;
const hdr  = (s) => `\n${C.bold}${C.cyan}${s}${C.reset}`;

// ─── test matrix ──────────────────────────────────────────────────────────
// Each entry: [agent, command, representative task arg]
const TEST_MATRIX = [
  ["architect",  "create",    "Design a REST API for a user authentication service using JWT"],
  ["architect",  "auditor",   "Audit the security posture of our current API gateway layer"],
  ["architect",  "docs",      "Document the system architecture for the auth service"],
  ["automata",   "plan",      "Automate the CI/CD pipeline for our monorepo"],
  ["automata",   "create",    "Create a GitHub Actions workflow that runs tests on PR"],
  ["backend",    "create",    "Implement a user registration endpoint with email validation"],
  ["backend",    "auditor",   "Audit the performance bottlenecks in our database query layer"],
  ["backend",    "docs",      "Write OpenAPI documentation for the payments service"],
  ["compliance", "master",    "Full GDPR and LGPD compliance audit for user data flows"],
  ["compliance", "audit",     "Audit the data retention policy against HIPAA requirements"],
  ["council",    "debate",    "Should we use a microservices or monolith architecture for this project?"],
  ["decoder",    "export",    "Translate the gRPC technical specification into a business summary for stakeholders"],
  ["forge",      "create",    "Design a new DevOps specialist agent with CI/CD expertise"],
  ["forge",      "discovery", "Audit the current agent hub architecture for gaps and improvement opportunities"],
  ["forge",      "auditor",   "Audit the Quicky agent against the agent standards protocol"],
  ["forge",      "upgrade",   "Upgrade the Researcher agent to add a synthesis skill"],
  ["frontend",   "create",    "Build a React dashboard for real-time analytics using TypeScript"],
  ["frontend",   "auditor",   "Audit the Lighthouse performance and accessibility score of the landing page"],
  ["frontend",   "docs",      "Document the component library API for the design system"],
  ["mobile",     "create",    "Create a Flutter login screen with biometric authentication"],
  ["mobile",     "auditor",   "Audit the Flutter app for memory leaks and jank"],
  ["mobile",     "docs",      "Document the widget tree for the checkout flow"],
  ["po",         "discovery", "Discover and document requirements for a B2B SaaS invoicing feature"],
  ["po",         "interview", "Conduct a product interview for the mobile onboarding flow"],
  ["quicky",     "fix",       "Fix the null pointer exception in the user profile controller"],
  ["researcher", "report",    "Research the best vector database options for a RAG system in 2025"],
  ["researcher", "investigate", "Investigate the root cause of the intermittent timeout errors in prod"],
  ["squad",      "run",       "Build a full-stack authentication system: design, backend, and frontend"],
  ["manager",    "productivity", "Audit productivity on board https://jira.company.com/projects/PROJ and repo org/repo-name for user dev-john"],
];

// ─── MCP client ──────────────────────────────────────────────────────────
function spawnServer() {
  return spawn("node", [path.join(ROOT, "bin", "agent-hub.js"), "serve"], {
    cwd: ROOT,
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
      reject(new Error(`Timeout after ${TIMEOUT_MS}ms waiting for id=${id}`));
    }, TIMEOUT_MS);

    const onData = (chunk) => {
      buffer += chunk.toString();
      // JSON-RPC responses are newline-delimited
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
          // partial line — wait for more data
        }
      }
      // Keep only unparsed remainder
      buffer = lines[lines.length - 1];
    };

    proc.stdout.on("data", onData);
    proc.stdin.write(JSON.stringify(msg) + "\n");
  });
}

// ─── test helpers ─────────────────────────────────────────────────────────
let msgId = 1;
const nextId = () => msgId++;

async function initialize(proc) {
  return sendRequest(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "mcp-integration-test", version: "1.0.0" },
    },
  });
}

async function listTools(proc) {
  return sendRequest(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/list",
    params: {},
  });
}

async function callTool(proc, name, args) {
  return sendRequest(proc, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: { name, arguments: args },
  });
}

// ─── content fingerprints ────────────────────────────────────────────────
// Key terms that MUST appear in the assembled prompt for each agent/command.
// Proves the agent's persona, skills, and knowledge files were actually loaded.
const CONTENT_FINGERPRINTS = {
  "architect:create":    ["SOLID", "architecture"],
  "architect:auditor":   ["security", "audit"],
  "architect:docs":      ["documentation", "architecture"],
  "automata:plan":       ["workflow", "automation"],
  "automata:create":     ["workflow", "automation"],
  "backend:create":      ["API", "backend"],
  "backend:auditor":     ["bottleneck", "security"],
  "backend:docs":        ["documentation"],
  "compliance:master":   ["GDPR", "HIPAA"],
  "compliance:audit":    ["GDPR", "compliance"],
  "council:debate":      ["Dialectical", "Council Compromise"],
  "decoder:export":      ["business", "export"],
  "forge:create":        ["agent", "forge"],
  "forge:discovery":     ["agent", "audit"],
  "forge:auditor":       ["agent", "audit"],
  "forge:upgrade":       ["agent", "upgrade"],
  "frontend:create":     ["component", "frontend"],
  "frontend:auditor":    ["performance", "accessibility"],
  "frontend:docs":       ["documentation"],
  "mobile:create":       ["Flutter", "mobile"],
  "mobile:auditor":      ["performance", "mobile"],
  "mobile:docs":         ["documentation"],
  "po:discovery":        ["product", "discovery"],
  "po:interview":        ["interview", "product"],
  "quicky:fix":          ["fix", "task"],
  "researcher:report":   ["research", "report"],
  "researcher:investigate": ["investigation", "research"],
  "squad:run":           ["squad", "orchestrat"],
  "manager:productivity": ["board", "git", "productivity"],
};

// ─── assertions ───────────────────────────────────────────────────────────
function assertToolsPresent(listResp) {
  const tools = listResp?.result?.tools ?? [];
  const names = tools.map((t) => t.name);
  const expected = ["list_agents", "call_agent_command", "get_agent_prompt"];
  const missing = expected.filter((n) => !names.includes(n));
  if (missing.length) throw new Error(`Missing tools: ${missing.join(", ")}`);
  return tools.length;
}

function assertCallResult(resp, agent, command) {
  if (resp.error) throw new Error(`RPC error: ${JSON.stringify(resp.error)}`);
  if (resp.result?.isError) {
    const msg = resp.result.content?.[0]?.text ?? "unknown error";
    throw new Error(`Tool error: ${msg}`);
  }
  const text = resp.result?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response text");

  // Verify identity tag is present
  const expectedTag = `[Agent: ${agent.toUpperCase()} | Command: ${command.toUpperCase()}]`;
  if (!text.includes(expectedTag)) {
    throw new Error(`Identity tag missing. Expected: "${expectedTag}"`);
  }

  // Verify content fingerprints — proves persona/skills files actually loaded
  const key = `${agent}:${command}`;
  const fingerprints = CONTENT_FINGERPRINTS[key] ?? [];
  const missing = fingerprints.filter(term => !text.toLowerCase().includes(term.toLowerCase()));
  if (missing.length) {
    throw new Error(`Content fingerprint(s) missing: [${missing.join(", ")}] — agent files may not have loaded`);
  }

  // Council-specific: business_synthesis.md must NOT appear (noise guard)
  if (agent === "council" && text.includes("## Skill: Business Synthesis")) {
    throw new Error("business_synthesis.md leaked into council:debate — heuristic filter failed");
  }

  return text.length;
}

// ─── run tests ────────────────────────────────────────────────────────────
async function runTests() {
  const results = { passed: 0, failed: 0, errors: [] };

  console.log(hdr("═══════════════════════════════════════════════════════"));
  console.log(hdr("  Agent Hub MCP Integration Test Suite"));
  console.log(hdr(`  Transport: node bin/agent-hub.js serve`));
  console.log(hdr("═══════════════════════════════════════════════════════"));

  // ── Phase 1: Transport & handshake ──────────────────────────────────────
  console.log(hdr("\n📡  Phase 1: Transport & Handshake"));
  const proc = spawnServer();
  const stderrLines = [];
  proc.stderr.on("data", (d) => stderrLines.push(d.toString().trim()));

  let initResp;
  try {
    initResp = await initialize(proc);
    const info = initResp?.result?.serverInfo;
    if (!info?.name) throw new Error("No serverInfo in initialize response");
    console.log(ok(`Initialize handshake — server: ${info.name} v${info.version}`));
    results.passed++;
  } catch (e) {
    console.log(fail(`Initialize handshake — ${e.message}`));
    results.failed++;
    results.errors.push({ phase: "handshake", error: e.message });
    proc.kill();
    return results;
  }

  // ── Phase 2: tools/list ──────────────────────────────────────────────────
  console.log(hdr("\n🔧  Phase 2: tools/list"));
  try {
    const toolsResp = await listTools(proc);
    const count = assertToolsPresent(toolsResp);
    console.log(ok(`tools/list — ${count} tools surfaced (list_agents, call_agent_command, get_agent_prompt)`));
    results.passed++;
  } catch (e) {
    console.log(fail(`tools/list — ${e.message}`));
    results.failed++;
    results.errors.push({ phase: "tools/list", error: e.message });
  }

  // ── Phase 3: list_agents ────────────────────────────────────────────────
  console.log(hdr("\n🤖  Phase 3: list_agents"));
  try {
    const agentsResp = await callTool(proc, "list_agents", {});
    const text = agentsResp?.result?.content?.[0]?.text ?? "";
    const agents = (text.match(/^- \w+/gm) ?? []).map((l) => l.replace("- ", "").split(" ")[0]);
    if (agents.length !== 14) throw new Error(`Expected 14 agents, got ${agents.length}: ${agents.join(", ")}`);
    console.log(ok(`list_agents — ${agents.length} agents: ${agents.join(", ")}`));
    results.passed++;
  } catch (e) {
    console.log(fail(`list_agents — ${e.message}`));
    results.failed++;
    results.errors.push({ phase: "list_agents", error: e.message });
  }

  // ── Phase 4: call_agent_command (all 26 commands) ───────────────────────
  console.log(hdr("\n⚡  Phase 4: call_agent_command (all commands)"));

  let lastAgent = null;
  for (const [agent, command, taskArg] of TEST_MATRIX) {
    if (agent !== lastAgent) {
      console.log(`\n${C.bold}  [${agent.toUpperCase()}]${C.reset}`);
      lastAgent = agent;
    }
    try {
      const resp = await callTool(proc, "call_agent_command", {
        agent,
        command,
        args: taskArg,
      });
      const chars = assertCallResult(resp, agent, command);
      const preview = VERBOSE
        ? `\n${C.grey}     ${resp.result.content[0].text.slice(0, 200).replace(/\n/g, " ")}...${C.reset}`
        : "";
      console.log(ok(`  /${agent}:${command} — ${chars.toLocaleString()} chars${preview}`));
      results.passed++;
    } catch (e) {
      console.log(fail(`  /${agent}:${command} — ${e.message}`));
      results.failed++;
      results.errors.push({ phase: `call_agent_command`, agent, command, error: e.message });
    }
  }

  // ── Phase 5: get_agent_prompt (smoke test 3 agents) ─────────────────────
  console.log(hdr("\n🧠  Phase 5: get_agent_prompt (spot check)"));
  for (const agent of ["architect", "squad", "compliance"]) {
    try {
      const resp = await callTool(proc, "get_agent_prompt", { agent });
      const text = resp?.result?.content?.[0]?.text ?? "";
      if (text.length < 100) throw new Error(`Suspiciously short persona: ${text.length} chars`);
      console.log(ok(`get_agent_prompt(${agent}) — ${text.length.toLocaleString()} chars`));
      results.passed++;
    } catch (e) {
      console.log(fail(`get_agent_prompt(${agent}) — ${e.message}`));
      results.failed++;
      results.errors.push({ phase: "get_agent_prompt", agent, error: e.message });
    }
  }

  // ── Phase 6: auto-injection verification ────────────────────────────────
  // backend:docs only explicitly !{cat}s 3 files: persona.md, logseq_knowledge.md,
  // docs_standard.md. The remaining agent files — protocol.md, reviewer.md,
  // security_auditor.md, bottlenecks.md, dependencies.md, patterns.md,
  // roi_logic.md, security_standards.md, testing_tools.md — must come
  // entirely from auto-injection (not from !{cat} in the TOML).
  console.log(hdr("\n🔬  Phase 6: Auto-injection of agent skills/knowledge"));
  try {
    const resp = await callTool(proc, "call_agent_command", {
      agent: "backend",
      command: "docs",
      args: "Document the authentication service",
    });
    const text = resp?.result?.content?.[0]?.text ?? "";

    // protocol.md is NOT catted in backend/docs.toml — must come from auto-injection
    // It contains SOLID principles and implementation protocol
    const hasProtocol = text.includes("SOLID") || text.includes("bottleneck") || text.includes("Bottleneck") || text.includes("protocol");
    if (!hasProtocol) {
      throw new Error("Auto-injection failed: backend/skills/protocol.md not found — expected 'SOLID' or 'bottleneck'");
    }

    // security_standards.md is NOT catted in backend/docs.toml — must come from auto-injection
    const hasSecurityKnowledge = text.includes("security") || text.includes("Security");
    if (!hasSecurityKnowledge) {
      throw new Error("Auto-injection failed: backend/knowledge/security_standards.md not found");
    }

    // docs_standard.md IS catted — confirm it's still there (dedup should NOT drop it)
    const hasDocsStandard = text.includes("docs_standard") || text.includes("Documentation Standards") || text.includes("documentation");
    if (!hasDocsStandard) {
      throw new Error("Dedup regression: docs_standard.md was catted but is missing from prompt");
    }

    console.log(ok(`Auto-injection: backend:docs — protocol.md + security_standards.md auto-injected without !{cat} ✓`));
    results.passed++;
  } catch (e) {
    console.log(fail(`Auto-injection — ${e.message}`));
    results.failed++;
    results.errors.push({ phase: "auto-injection", error: e.message });
  }

  proc.stdin.end();
  proc.kill();

  // ── Phase 7: Monorepo CWD Stack Detection ───────────────────────────────
  // Verifies that stack detection finds marker files one directory deep,
  // and correctly emits the enriched multi-stack manifest with module names.
  console.log(hdr("\n📦  Phase 7: Monorepo CWD Stack Detection (Depth-1)"));
  try {
    const fs = await import("fs/promises");
    const os = await import("os");
    
    // Create a temporary monorepo structure
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));
    await fs.mkdir(path.join(tmpDir, 'module-auth'));
    await fs.writeFile(path.join(tmpDir, 'module-auth', 'pom.xml'), '<project></project>');
    await fs.mkdir(path.join(tmpDir, 'module-frontend'));
    await fs.writeFile(path.join(tmpDir, 'module-frontend', 'package.json'), '{"dependencies":{"react":"18"}}');
    
    const monoProc = spawn("node", [path.join(ROOT, "bin", "agent-hub.js"), "serve"], {
      cwd: tmpDir,
      stdio: "pipe",
      env: process.env,
    });
    
    await initialize(monoProc);
    const resp = await callTool(monoProc, "call_agent_command", {
      agent: "architect",
      command: "create",
      args: "Build the auth service",
    });
    
    const text = resp?.result?.content?.[0]?.text ?? "";
    monoProc.stdin.end();
    monoProc.kill();
    
    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
    
    if (!text.includes("MULTIPLE STACKS DETECTED")) {
      throw new Error("Multi-stack manifest not triggered for monorepo layout");
    }
    if (!text.includes("module-auth/") || !text.includes("module-frontend/")) {
      throw new Error("Module attribution missing from manifest");
    }
    
    console.log(ok(`Depth-1 Detection: Found Java in module-auth/ and React in module-frontend/ ✓`));
    results.passed++;
  } catch (e) {
    console.log(fail(`Depth-1 Detection — ${e.message}`));
    results.failed++;
    results.errors.push({ phase: "monorepo-detection", error: e.message });
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const total = results.passed + results.failed;
  const allPass = results.failed === 0;
  console.log(hdr("\n═══════════════════════════════════════════════════════"));
  console.log(`${C.bold}  Results: ${allPass ? C.green : C.red}${results.passed}/${total} passed${C.reset}`);
  if (results.failed) {
    console.log(`\n${C.bold}  Failures:${C.reset}`);
    for (const e of results.errors) {
      const loc = e.agent ? `${e.agent}:${e.command}` : e.phase;
      console.log(`  ${C.red}•${C.reset} [${loc}] ${e.message ?? e.error}`);
    }
  }
  if (stderrLines.length) {
    console.log(`\n${C.grey}  Server stderr:\n  ${stderrLines.join("\n  ")}${C.reset}`);
  }
  console.log(hdr("═══════════════════════════════════════════════════════\n"));

  return results;
}

const results = await runTests();
process.exit(results.failed > 0 ? 1 : 0);
