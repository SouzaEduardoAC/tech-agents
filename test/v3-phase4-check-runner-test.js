import assert from "assert";
import fs from "fs-extra";
import path from "path";
import os from "os";
import {
  executeCommand,
  detectProjectChecks,
  runHardChecks,
  validateSchema,
} from "../engine/check_runner.js";

async function runTests() {
  console.log("Starting V3 Phase 4 Deterministic Hard Check Tests...\n");

  // 1. Test executeCommand passing
  const passRes = await executeCommand("node -e 'console.log(\"PASS_OK\"); process.exit(0);'");
  assert.strictEqual(passRes.pass, true);
  assert.strictEqual(passRes.exitCode, 0);
  assert.ok(passRes.stdout.includes("PASS_OK"));
  console.log("✅ PASS executeCommand successfully runs and captures passing command");

  // 2. Test executeCommand failing
  const failRes = await executeCommand("node -e 'console.error(\"FATAL_ERROR\"); process.exit(42);'");
  assert.strictEqual(failRes.pass, false);
  assert.strictEqual(failRes.exitCode, 42);
  assert.ok(failRes.stderr.includes("FATAL_ERROR"));
  console.log("✅ PASS executeCommand captures failing exit code and stderr");

  // 3. Test executeCommand timeout
  const timeoutRes = await executeCommand("node -e 'setTimeout(() => {}, 5000)'", { timeout: 400 });
  assert.strictEqual(timeoutRes.pass, false);
  assert.strictEqual(timeoutRes.timedOut, true);
  console.log("✅ PASS executeCommand terminates on timeout");

  // 4. Test detectProjectChecks
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "check-runner-test-"));
  try {
    await fs.writeJson(path.join(tempDir, "package.json"), {
      name: "mock-pkg",
      scripts: {
        test: "jest",
        lint: "eslint .",
      },
    });

    const detected = await detectProjectChecks(tempDir);
    const hasTest = detected.some((d) => d.type === "test" && d.cmd === "npm test");
    const hasLint = detected.some((d) => d.type === "lint" && d.cmd === "npm run lint");
    assert.ok(hasTest, "Did not detect npm test script");
    assert.ok(hasLint, "Did not detect npm run lint script");
    console.log("✅ PASS detectProjectChecks accurately detects project test and lint runners");

    // 5. Test runHardChecks
    const runRes = await runHardChecks(
      [
        { cmd: "node -e 'process.exit(0)'" },
        { cmd: "node -e 'console.error(\"Linter error on line 12\"); process.exit(1)'" },
      ],
      { cwd: tempDir, projectRoot: tempDir }
    );
    assert.strictEqual(runRes.pass, false);
    assert.ok(runRes.errorMessage.includes("Linter error on line 12"));
    assert.ok(runRes.errorMessage.includes("HARD CHECK FAILED"));
    console.log("✅ PASS runHardChecks halts on first failure and formats error diagnostics for LLM context");
  } finally {
    await fs.remove(tempDir);
  }

  // 6. Test validateSchema
  const sampleSchema = {
    type: "object",
    required: ["title", "status", "count"],
    properties: {
      title: { type: "string", minLength: 3 },
      status: { type: "string", enum: ["OPEN", "CLOSED"] },
      count: { type: "number" },
    },
  };

  const validData = { title: "Valid Title", status: "OPEN", count: 5 };
  const validRes = validateSchema(validData, sampleSchema);
  assert.strictEqual(validRes.valid, true);
  console.log("✅ PASS validateSchema validates compliant data");

  const invalidData = { title: "ab", status: "INVALID", count: "not a number" };
  const invalidRes = validateSchema(invalidData, sampleSchema);
  assert.strictEqual(invalidRes.valid, false);
  assert.strictEqual(invalidRes.errors.length, 3);
  console.log("✅ PASS validateSchema catches schema violations (length, enum, type)");

  console.log("\n───────────────────────────────────────────────────────");
  console.log("ALL V3 PHASE 4 TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
