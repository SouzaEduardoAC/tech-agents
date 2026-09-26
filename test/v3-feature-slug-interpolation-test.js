import assert from "assert";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { fileURLToPath } from "url";
import { initPipelineSession, slugify, approveGate, requestGateApproval } from "../engine/state_manager.js";
import { startPlaybook, getActiveStep, advanceStep } from "../engine/playbook_runner.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function run() {
  console.log("Starting Step 1 Test: Feature Slug & Variable Interpolation...");

  // 1. Verify slugify logic
  assert.strictEqual(slugify("Build OAuth2 Google and GitHub SSO"), "build-oauth2-google-and-github-sso");
  assert.strictEqual(slugify("Feature: /Stripe Checkout 2026!"), "feature-stripe-checkout-2026");
  assert.strictEqual(slugify(""), "feature");
  assert.strictEqual(slugify(null), "feature");
  console.log("✅ PASS slugify transforms goals and feature names reliably");

  // 2. Setup temp directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "v3-slug-test-"));
  await fs.ensureDir(path.join(tempDir, "docs", "pages"));

  try {
    // 3. Test startPlaybook with explicit feature slug
    const startExplicit = await startPlaybook({
      playbookId: "feature_dev",
      goal: "Implement OAuth2 Multi-Tenant Authentication",
      feature: "oauth-sso",
      cwd: tempDir,
    });

    assert.strictEqual(startExplicit.feature, "oauth-sso");
    console.log("✅ PASS startPlaybook preserves explicit feature slug ('oauth-sso')");

    // 4. Inspect Step 1 (discovery)
    const step1 = await getActiveStep(tempDir);
    assert.strictEqual(step1.feature, "oauth-sso");
    assert.strictEqual(step1.output_artifact, "docs/pages/oauth-sso-prd.md");
    assert(step1.compiledPrompt.includes("Feature: oauth-sso"));
    assert(step1.compiledPrompt.includes("## Required Output Artifact"));
    assert(step1.compiledPrompt.includes("docs/pages/oauth-sso-prd.md"));
    assert(step1.compiledPrompt.includes("## Mandatory Human Approval Checkpoint"));
    assert(step1.compiledPrompt.includes('request_approval(gate="prd"'));
    console.log("✅ PASS Step 1 injects Required Output Artifact and Gate Checkpoint directives");

    // 5. Write the mock PRD artifact to disk
    const prdPath = path.join(tempDir, "docs", "pages", "oauth-sso-prd.md");
    const prdData = {
      feature_name: "OAuth SSO",
      problem_statement: "Users need secure single sign-on across enterprise identity providers.",
      user_stories: ["As a user I want to login with Google."],
      acceptance_criteria: [{ scenario: "Login", given: "on login page", when: "clicks login", then: "logged in" }],
      moscow_prioritization: { must_have: ["Google SSO"], should_have: ["GitHub SSO"] },
      edge_cases: ["Session timeout"],
    };
    await fs.writeFile(prdPath, `---\n${JSON.stringify(prdData, null, 2)}\n---\n# PRD for OAuth SSO\n\nMust have Google and GitHub login.`, "utf-8");

    // Advance to Step 2 (analysis), which expects input_artifacts: [docs/pages/{{args}}-prd.md]
    // First, approve gate 'prd'
    await requestGateApproval({ gate: "prd", summary: "PRD done", cwd: tempDir });
    await approveGate({ gate: "prd", cwd: tempDir });

    const advRes = await advanceStep(tempDir);
    assert.strictEqual(advRes.step_index, 1); // step 2: analysis

    // 6. Inspect Step 2 (analysis)
    const step2 = await getActiveStep(tempDir);
    assert.strictEqual(step2.step.id, "analysis");
    assert.strictEqual(step2.output_artifact, "docs/pages/oauth-sso-analysis.md");
    assert.deepStrictEqual(step2.step.input_artifacts, ["docs/pages/oauth-sso-prd.md"]);

    // Verify compiled prompt embedded the content of oauth-sso-prd.md
    assert(step2.compiledPrompt.includes("### Artifact: oauth-sso-prd.md"));
    assert(step2.compiledPrompt.includes("Must have Google and GitHub login."));
    assert(!step2.compiledPrompt.includes("Not yet created / Pending"));
    console.log("✅ PASS Step 2 successfully reads interpolated input artifact 'oauth-sso-prd.md' with full content");

    // 7. Test startPlaybook with auto-derived feature slug
    const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), "v3-slug-auto-"));
    const startAuto = await startPlaybook({
      playbookId: "component_scaffold",
      goal: "User Billing Dashboard Component",
      cwd: tempDir2,
    });
    assert.strictEqual(startAuto.feature, "user-billing-dashboard-component");
    console.log("✅ PASS startPlaybook auto-derives clean kebab-case feature slug from goal");

    console.log("\n───────────────────────────────────────────────────────");
    console.log("ALL STEP 1 TESTS PASSED SUCCESSFULLY!");
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
