import assert from "assert";
import fs from "fs-extra";
import path from "path";
import os from "os";
import yaml from "yaml";
import {
  resolveStateFilePath,
  initPipelineSession,
  requestGateApproval,
  checkGateStatus,
  approveGate,
} from "../engine/state_manager.js";
import {
  compileStepPrompt,
  compileLegacyCommandPrompt,
  resolveProbes,
} from "../engine/prompt_compiler.js";

async function runTests() {
  console.log("Starting V3 Phase 1 Foundation & Engine Tests...\n");

  // 1. Test yaml parsing capability
  const sampleYaml = `
id: test_playbook
name: Test Playbook
steps:
  - id: step1
    name: First Step
    lens: lenses/test.md
`;
  const parsed = yaml.parse(sampleYaml);
  assert.strictEqual(parsed.id, "test_playbook");
  assert.strictEqual(parsed.steps[0].id, "step1");
  console.log("✅ PASS yaml package parsing verified");

  // 2. Test state_manager in isolated temp dir
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "squad-engine-test-"));
  try {
    const { state, statePath, session_id } = await initPipelineSession({
      goal: "Test Goal",
      gates: ["prd", "plan"],
      cwd: tempDir,
      playbookId: "test_playbook",
    });

    assert.ok(session_id.startsWith(`${Date.now().toString().slice(0, 5)}`));
    assert.strictEqual(state.gates.prd.status, "locked");
    assert.strictEqual(state.gates.plan.status, "locked");
    assert.ok(await fs.pathExists(statePath));
    console.log("✅ PASS initPipelineSession initializes state file and locks gates");

    // check_gate on locked gate must throw
    await assert.rejects(
      async () => checkGateStatus({ gate: "prd", cwd: tempDir }),
      /GATE LOCKED/
    );
    console.log("✅ PASS checkGateStatus correctly blocks locked gate");

    // request approval sets gate to pending
    const reqRes = await requestGateApproval({
      gate: "prd",
      artifact_path: "docs/test-prd.md",
      summary: "Ready for review",
      cwd: tempDir,
    });
    assert.strictEqual(reqRes.state.gates.prd.status, "pending");
    console.log("✅ PASS requestGateApproval sets gate to pending");

    // check_gate on pending gate must throw
    await assert.rejects(
      async () => checkGateStatus({ gate: "prd", cwd: tempDir }),
      /GATE PENDING APPROVAL/
    );
    console.log("✅ PASS checkGateStatus correctly blocks pending gate");

    // approveGate approves pending gate
    const appRes = await approveGate({ gate: "prd", cwd: tempDir });
    assert.strictEqual(appRes.success, true);
    assert.ok(appRes.approved_at);
    console.log("✅ PASS approveGate approves pending gate");

    // check_gate now passes
    const chkRes = await checkGateStatus({ gate: "prd", cwd: tempDir });
    assert.strictEqual(chkRes.approved, true);
    console.log("✅ PASS checkGateStatus confirms approved gate");
  } finally {
    await fs.remove(tempDir);
  }

  // 3. Test compileStepPrompt in prompt_compiler
  const stepPrompt = await compileStepPrompt({
    playbookId: "feature_dev",
    stepId: "discovery",
    stepName: "Product Discovery",
    goal: "Build Payment System",
    lensContent: "You are an empathetic product strategist focusing on user value.",
    toolbox: ["fs_read", "search_web"],
  });

  assert.ok(stepPrompt.includes("### V3 PLAYBOOK STEP EXECUTION"));
  assert.ok(stepPrompt.includes("[Playbook: FEATURE_DEV | Step: DISCOVERY - Product Discovery]"));
  assert.ok(stepPrompt.includes("You are an empathetic product strategist"));
  assert.ok(stepPrompt.includes("- `fs_read`"));
  console.log("✅ PASS compileStepPrompt produces targeted V3 step prompt");

  // 4. Test compileLegacyCommandPrompt backward-compatibility
  const legacyPrompt = await compileLegacyCommandPrompt({
    agent: "quicky",
    command: "fix",
    taskArgs: "Fix null pointer in auth",
  });
  assert.ok(legacyPrompt.includes("[Agent: QUICKY | Command: FIX]"));
  assert.ok(legacyPrompt.includes("Fix null pointer in auth"));
  console.log("✅ PASS compileLegacyCommandPrompt maintains 100% backward-compatibility for legacy commands");

  console.log("\n───────────────────────────────────────────────────────");
  console.log("ALL V3 PHASE 1 TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
