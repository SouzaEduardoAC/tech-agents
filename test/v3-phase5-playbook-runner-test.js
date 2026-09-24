import assert from "assert";
import fs from "fs-extra";
import path from "path";
import os from "os";
import {
  listPlaybooks,
  loadPlaybook,
  startPlaybook,
  getActiveStep,
  runActiveStepChecks,
  advanceStep,
  getPlaybookStatus,
} from "../engine/playbook_runner.js";
import { approveGate, requestGateApproval } from "../engine/state_manager.js";

async function runTests() {
  console.log("Starting V3 Phase 5 Playbook Runner Tests...\n");

  // 1. Test listPlaybooks
  const playbooks = await listPlaybooks();
  assert.ok(playbooks.length >= 6, `Expected >= 6 playbooks, got ${playbooks.length}`);
  const featureDev = playbooks.find((p) => p.id === "feature_dev");
  assert.ok(featureDev, "feature_dev playbook missing from list");
  assert.strictEqual(featureDev.stepCount, 7);
  console.log(`✅ PASS listPlaybooks returns ${playbooks.length} playbooks including feature_dev`);

  // 2. Test startPlaybook in isolated temp dir
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "playbook-runner-test-"));
  try {
    // Add mock package.json so auto_detect npm test passes
    await fs.writeJson(path.join(tempDir, "package.json"), {
      name: "mock-test-project",
      scripts: { test: "node -e 'process.exit(0)'" },
    });
    const { execSync } = await import("child_process");
    execSync("git init", { cwd: tempDir, stdio: "ignore" });

    const startRes = await startPlaybook({
      playbookId: "bug_fix",
      goal: "Fix authentication timeout bug",
      cwd: tempDir,
    });

    assert.strictEqual(startRes.playbook_id, "bug_fix");
    assert.strictEqual(startRes.step_index, 0);
    assert.strictEqual(startRes.active_step.id, "analyze_and_reproduce");
    console.log("✅ PASS startPlaybook successfully initializes bug_fix playbook session");

    // 3. Test getActiveStep
    const step1 = await getActiveStep(tempDir);
    assert.strictEqual(step1.completed, false);
    assert.strictEqual(step1.step.id, "analyze_and_reproduce");
    assert.ok(step1.compiledPrompt.includes("Adopt the stance of a QA Automation Lead"));
    assert.strictEqual(step1.gate, null);
    console.log("✅ PASS getActiveStep compiles step context and lens");

    // Step 1 has no gate and no hard checks, so advanceStep should succeed!
    const adv1 = await advanceStep(tempDir);
    assert.strictEqual(adv1.step_index, 1);
    assert.strictEqual(adv1.active_step.id, "apply_patch");
    console.log("✅ PASS advanceStep advances un-gated step to Step 2 (apply_patch)");

    // Step 2 has gate: "fix_verification". advanceStep MUST FAIL because gate is locked!
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ PASS advanceStep physically blocks progression while gate is locked");

    // Request approval for gate fix_verification
    await requestGateApproval({
      gate: "fix_verification",
      summary: "Patch applied, unit test passes",
      cwd: tempDir,
    });

    // Still blocked while pending!
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE PENDING APPROVAL|CANNOT ADVANCE STEP/
    );
    console.log("✅ PASS advanceStep physically blocks progression while gate is pending");

    // Approve the gate
    await approveGate({ gate: "fix_verification", cwd: tempDir });

    // Now advanceStep should pass!
    const adv2 = await advanceStep(tempDir);
    assert.strictEqual(adv2.step_index, 2);
    assert.strictEqual(adv2.active_step.id, "commit_and_close");
    console.log("✅ PASS advanceStep progresses after human gate approval");

    // Step 3 advanceStep completes playbook
    const adv3 = await advanceStep(tempDir);
    assert.strictEqual(adv3.completed, true);
    console.log("✅ PASS advanceStep completes playbook at final step");

    // 4. Test getPlaybookStatus
    const status = await getPlaybookStatus(tempDir);
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.completed, true);
    assert.strictEqual(status.history.length, 3);
    console.log("✅ PASS getPlaybookStatus reports complete history across all 3 steps");
  } finally {
    await fs.remove(tempDir);
  }

  console.log("\n───────────────────────────────────────────────────────");
  console.log("ALL V3 PHASE 5 TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
