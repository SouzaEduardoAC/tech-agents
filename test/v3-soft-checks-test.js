import assert from "assert";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { fileURLToPath } from "url";
import { extractStructuredData, runSoftChecks } from "../engine/check_runner.js";
import { startPlaybook, advanceStep, runActiveStepChecks } from "../engine/playbook_runner.js";
import { approveGate, requestGateApproval } from "../engine/state_manager.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("Starting Step 3 Test: Soft Checks & JSON Schema Validation...");

  // 1. Test extractStructuredData
  const mdWithFm = `---
feature_name: "OAuth SSO"
problem_statement: "Users need secure single sign-on across enterprise identity providers."
---
# PRD Content
Some markdown here.`;

  const dataFm = extractStructuredData(mdWithFm);
  assert.strictEqual(dataFm.feature_name, "OAuth SSO");
  console.log("✅ PASS extractStructuredData extracts YAML frontmatter");

  const mdWithJson = `# Some Doc
\`\`\`json
{
  "title": "ADR: JWT Auth",
  "status": "ACCEPTED"
}
\`\`\``;
  const dataJson = extractStructuredData(mdWithJson);
  assert.strictEqual(dataJson.title, "ADR: JWT Auth");
  assert.strictEqual(dataJson.status, "ACCEPTED");
  console.log("✅ PASS extractStructuredData extracts JSON code blocks");

  // 2. Test runSoftChecks with missing artifact
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "v3-soft-check-"));
  await fs.ensureDir(path.join(tempDir, "docs", "pages"));

  try {
    const missingRes = await runSoftChecks(
      ["checks/schemas/prd_schema.json"],
      "docs/pages/missing-prd.md",
      { projectRoot: tempDir }
    );
    assert.strictEqual(missingRes.pass, false);
    assert(missingRes.errorMessage.includes("Required output artifact does not exist on disk"));
    console.log("✅ PASS runSoftChecks halts when artifact file does not exist");

    // 3. Test runSoftChecks with invalid/incomplete content
    const invalidPrdPath = path.join(tempDir, "docs", "pages", "invalid-prd.md");
    await fs.writeFile(invalidPrdPath, "# Random Notes\nNo schema fields here.", "utf-8");

    const invalidRes = await runSoftChecks(
      ["checks/schemas/prd_schema.json"],
      "docs/pages/invalid-prd.md",
      { projectRoot: tempDir }
    );
    assert.strictEqual(invalidRes.pass, false);
    assert(invalidRes.errorMessage.includes("does not satisfy schema"));
    assert(invalidRes.errors.length > 0);
    console.log("✅ PASS runSoftChecks catches schema violations on incomplete artifacts");

    // 4. Test runSoftChecks with fully compliant PRD
    const validPrdData = {
      feature_name: "Enterprise Single Sign-On",
      problem_statement: "Enterprise customers require Okta and Google Workspace SSO integration for workforce access.",
      user_stories: ["As an employee, I want to log in using my corporate Okta credentials."],
      acceptance_criteria: [
        {
          scenario: "Successful Okta Login",
          given: "User is on the login page",
          when: "User clicks Okta SSO and authenticates",
          then: "User receives a signed session JWT and enters the dashboard",
        },
      ],
      moscow_prioritization: {
        must_have: ["Okta SAML 2.0 integration", "JWT session issuance"],
        should_have: ["Google Workspace OAuth2"],
      },
      edge_cases: ["SAML assertion expiration handling", "Revoked employee account handling"],
    };

    const validPrdPath = path.join(tempDir, "docs", "pages", "valid-prd.md");
    await fs.writeFile(
      validPrdPath,
      `---\n${JSON.stringify(validPrdData, null, 2)}\n---\n# Enterprise Single Sign-On PRD\n\nFull specifications.`,
      "utf-8"
    );

    const validRes = await runSoftChecks(
      ["checks/schemas/prd_schema.json"],
      "docs/pages/valid-prd.md",
      { projectRoot: tempDir }
    );
    assert.strictEqual(validRes.pass, true);
    console.log("✅ PASS runSoftChecks succeeds on schema-compliant artifact");

    // 5. Integration with Playbook Runner State Machine
    const pbSession = await startPlaybook({
      playbookId: "product_discovery",
      goal: "Enterprise Single Sign-On",
      feature: "enterprise-sso",
      cwd: tempDir,
    });

    // Step 1: elicitation_interview (no soft checks)
    const advStep1 = await advanceStep(tempDir);
    assert.strictEqual(advStep1.active_step.id, "prd_formulation");

    // Step 2: prd_formulation (soft_checks: [checks/schemas/prd_schema.json], gate: prd)
    // Approve gate first
    await requestGateApproval({ gate: "prd", summary: "PRD drafted", cwd: tempDir });
    await approveGate({ gate: "prd", cwd: tempDir });

    // Advancing now should fail because output artifact (enterprise-sso-prd.md) does not exist!
    await assert.rejects(
      async () => advanceStep(tempDir),
      /Required output artifact does not exist on disk/
    );
    console.log("✅ PASS advanceStep blocked when output artifact is missing for soft-checked step");

    // Now copy the valid PRD to the expected path
    const targetPrd = path.join(tempDir, "docs", "pages", "enterprise-sso-prd.md");
    await fs.copy(validPrdPath, targetPrd);

    // Verify runActiveStepChecks reports pass: true
    const checkRes = await runActiveStepChecks(tempDir);
    assert.strictEqual(checkRes.pass, true);
    assert.strictEqual(checkRes.soft_checks.pass, true);
    console.log("✅ PASS runActiveStepChecks passes when compliant artifact exists");

    // Advance to complete
    const advStep2 = await advanceStep(tempDir);
    assert.strictEqual(advStep2.completed, true);
    console.log("✅ PASS advanceStep completed playbook when soft checks and gates are satisfied");

    console.log("\n───────────────────────────────────────────────────────");
    console.log("ALL STEP 3 TESTS PASSED SUCCESSFULLY!");
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
