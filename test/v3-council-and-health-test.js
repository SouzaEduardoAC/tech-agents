import assert from "assert";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import {
  startPlaybook,
  getActiveStep,
  runActiveStepChecks,
  advanceStep,
  getPlaybookStatus,
} from "../engine/playbook_runner.js";
import { approveGate, requestGateApproval } from "../engine/state_manager.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runTests() {
  console.log("Starting V3 Council Debate & Codebase Health Audit Integration Tests...\n");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "v3-council-health-test-"));

  try {
    // Setup mock git repo and project
    const { execSync } = await import("child_process");
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    await fs.writeJson(path.join(tempDir, "package.json"), {
      name: "mock-council-health-project",
      scripts: {
        test: "node -e 'process.exit(0)'",
        lint: "node -e 'process.exit(0)'",
      },
    });

    // ─────────────────────────────────────────────────────────────
    // 1. Council Debate Playbook (thesis -> antithesis -> synthesis)
    // ─────────────────────────────────────────────────────────────
    console.log("Testing council_debate playbook...");
    const councilSession = await startPlaybook({
      playbookId: "council_debate",
      goal: "Event-driven architecture vs monolithic service for order processing",
      cwd: tempDir,
    });

    assert.strictEqual(councilSession.active_step.id, "thesis");
    let step = await getActiveStep(tempDir);
    assert.strictEqual(step.step.id, "thesis");
    assert.ok(step.compiledPrompt.includes("Architectural Thesis"));

    // Advance thesis -> antithesis
    let advRes = await advanceStep(tempDir);
    assert.strictEqual(advRes.active_step.id, "antithesis");

    // Advance antithesis -> synthesis
    advRes = await advanceStep(tempDir);
    assert.strictEqual(advRes.active_step.id, "synthesis");

    // Step 3 (synthesis) is gated by 'council_synthesis'
    const step3 = await getActiveStep(tempDir);
    assert.strictEqual(step3.step.id, "synthesis");

    // Advance should fail because gate is locked
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ council_debate synthesis step correctly blocked by locked approval gate");

    // Request & approve gate
    await requestGateApproval({
      gate: "council_synthesis",
      summary: "Synthesis complete and ADR documented",
      cwd: tempDir,
    });
    await approveGate({ gate: "council_synthesis", cwd: tempDir });

    // Mock ADR artifact
    await fs.ensureDir(path.join(tempDir, "docs", "pages"));
    await fs.writeFile(
      path.join(tempDir, "docs", "pages", "order-processing-adr.md"),
      "# ADR: Event-driven architecture"
    );

    // Advance to complete
    const finalAdv = await advanceStep(tempDir);
    assert.strictEqual(finalAdv.completed, true);
    console.log("✅ council_debate completed successfully through all 3 steps");

    // ─────────────────────────────────────────────────────────────
    // 2. Codebase Health Audit Playbook (static_analysis -> security -> remediation)
    // ─────────────────────────────────────────────────────────────
    console.log("\nTesting codebase_health_audit playbook...");
    const healthSession = await startPlaybook({
      playbookId: "codebase_health_audit",
      goal: "Audit codebase health, linting, and security posture",
      cwd: tempDir,
    });

    assert.strictEqual(healthSession.active_step.id, "static_analysis");
    const hStep1 = await getActiveStep(tempDir);
    assert.strictEqual(hStep1.step.id, "static_analysis");

    // Run hard checks
    const checkRes = await runActiveStepChecks(tempDir);
    assert.strictEqual(checkRes.pass, true);
    console.log("✅ codebase_health_audit hard checks passed (test & lint auto-detected)");

    // Advance static_analysis -> security_compliance
    const hAdv1 = await advanceStep(tempDir);
    assert.strictEqual(hAdv1.active_step.id, "security_compliance");

    // Advance security_compliance -> remediation_plan
    const hAdv2 = await advanceStep(tempDir);
    assert.strictEqual(hAdv2.active_step.id, "remediation_plan");

    // Step 3 (remediation_plan) is gated by 'health_report'
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ codebase_health_audit remediation step correctly blocked by approval gate");

    // Request & approve gate
    await requestGateApproval({
      gate: "health_report",
      summary: "Codebase health report finalized",
      cwd: tempDir,
    });
    await approveGate({ gate: "health_report", cwd: tempDir });

    const hFinal = await advanceStep(tempDir);
    assert.strictEqual(hFinal.completed, true);
    console.log("✅ codebase_health_audit completed successfully through all 3 steps");

    console.log("\n───────────────────────────────────────────────────────");
    console.log("ALL COUNCIL & HEALTH AUDIT INTEGRATION TESTS PASSED!");
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
