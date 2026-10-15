import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { executeCommand, runHardChecks } from "../engine/check_runner.js";

const REPO_ROOT = path.resolve();
const STANDARD_TEST_SH = path.join(REPO_ROOT, "checks/hard/standard_test.sh");
const STANDARD_LINT_SH = path.join(REPO_ROOT, "checks/hard/standard_lint.sh");
const GIT_CLEAN_SH = path.join(REPO_ROOT, "checks/hard/git_clean.sh");

test("checks/hard: git_clean.sh succeeds on clean or reports status", async () => {
  const res = await executeCommand(GIT_CLEAN_SH, { cwd: REPO_ROOT });
  assert.equal(typeof res.pass, "boolean");
  assert.equal(typeof res.exitCode, "number");
});

test("checks/hard: standard_test.sh detection and execution", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "check-test-"));

  await t.test("skips gracefully when no test suite is configured", async () => {
    const res = await executeCommand(`${STANDARD_TEST_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, true);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /No recognized test suite found/);
  });

  await t.test("executes passing npm test when defined in package.json", async () => {
    const pkg = {
      name: "mock-passing",
      scripts: {
        test: "node -e 'process.exit(0)'",
      },
    };
    await fs.writeJson(path.join(tempDir, "package.json"), pkg);

    const res = await executeCommand(`${STANDARD_TEST_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, true);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /Detected Node.js project/);
  });

  await t.test("executes failing npm test and propagates non-zero exit code", async () => {
    const pkg = {
      name: "mock-failing",
      scripts: {
        test: "node -e 'console.error(\"mock test failed\"); process.exit(1)'",
      },
    };
    await fs.writeJson(path.join(tempDir, "package.json"), pkg);

    const res = await executeCommand(`${STANDARD_TEST_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, false);
    assert.notEqual(res.exitCode, 0);
  });

  // Cleanup
  await fs.remove(tempDir);
});

test("checks/hard: standard_lint.sh detection and execution", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "check-lint-"));

  await t.test("skips gracefully when no linter is configured", async () => {
    const res = await executeCommand(`${STANDARD_LINT_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, true);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /No recognized linter found/);
  });

  await t.test("executes passing npm run lint when defined in package.json", async () => {
    const pkg = {
      name: "mock-passing-lint",
      scripts: {
        lint: "node -e 'process.exit(0)'",
      },
    };
    await fs.writeJson(path.join(tempDir, "package.json"), pkg);

    const res = await executeCommand(`${STANDARD_LINT_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, true);
    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /Detected Node.js lint script/);
  });

  await t.test("executes failing npm run lint and propagates non-zero exit code", async () => {
    const pkg = {
      name: "mock-failing-lint",
      scripts: {
        lint: "node -e 'console.error(\"lint errors found\"); process.exit(2)'",
      },
    };
    await fs.writeJson(path.join(tempDir, "package.json"), pkg);

    const res = await executeCommand(`${STANDARD_LINT_SH} "${tempDir}"`, { cwd: tempDir });
    assert.equal(res.pass, false);
    assert.notEqual(res.exitCode, 0);
  });

  // Cleanup
  await fs.remove(tempDir);
});

test("checks/hard: integration with runHardChecks engine", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "check-engine-"));
  const pkg = {
    name: "mock-engine-check",
    scripts: {
      test: "node -e 'console.log(\"all tests passed\"); process.exit(0)'",
    },
  };
  await fs.writeJson(path.join(tempDir, "package.json"), pkg);

  const stepHardChecks = [
    { cmd: `${STANDARD_TEST_SH} "${tempDir}"` },
  ];

  const checkResult = await runHardChecks(stepHardChecks, { cwd: tempDir, projectRoot: tempDir });
  assert.equal(checkResult.pass, true);
  assert.equal(checkResult.allResults.length, 1);
  assert.equal(checkResult.allResults[0].pass, true);

  await fs.remove(tempDir);
});
