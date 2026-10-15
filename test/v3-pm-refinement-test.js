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
  console.log("Starting V3 PM & Technical Refinement Playbook Integration Tests...\n");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "v3-pm-refinement-test-"));

  try {
    // Setup mock git repo and project
    const { execSync } = await import("child_process");
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    await fs.writeJson(path.join(tempDir, "package.json"), {
      name: "mock-pm-refinement-project",
      scripts: {
        test: "node -e 'process.exit(0)'",
        lint: "node -e 'process.exit(0)'",
      },
    });

    // ─────────────────────────────────────────────────────────────
    // 1. Product Discovery Playbook (PM: elicitation -> prd_formulation)
    // ─────────────────────────────────────────────────────────────
    console.log("Testing product_discovery playbook (PM flow)...");
    const pmSession = await startPlaybook({
      playbookId: "product_discovery",
      goal: "Single Sign-On (SSO) with Okta and Google Workspace for Enterprise customers",
      feature: "enterprise-sso",
      cwd: tempDir,
    });

    assert.strictEqual(pmSession.active_step.id, "elicitation_interview");
    const pmStep1 = await getActiveStep(tempDir);
    assert.strictEqual(pmStep1.step.id, "elicitation_interview");
    assert.ok(pmStep1.compiledPrompt.includes("Standard: product_interview.md"));
    assert.ok(pmStep1.compiledPrompt.includes("stitch"));
    console.log("✅ product_discovery compiled prompt includes stitch peer MCP toolbox");

    // Advance elicitation -> prd_formulation
    const pmAdv1 = await advanceStep(tempDir);
    assert.strictEqual(pmAdv1.active_step.id, "prd_formulation");

    // Step 2 is gated by 'prd'
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ product_discovery prd_formulation step correctly blocked by locked 'prd' approval gate");

    // Request & approve gate
    await requestGateApproval({
      gate: "prd",
      summary: "PRD completed with 5-phase inputs, Given-When-Then criteria, and MoSCoW scoping",
      cwd: tempDir,
    });
    await approveGate({ gate: "prd", cwd: tempDir });

    // Mock compliant PRD artifact for soft check
    await fs.ensureDir(path.join(tempDir, "docs", "pages"));
    const prdData = {
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
    await fs.writeFile(
      path.join(tempDir, "docs", "pages", "enterprise-sso-prd.md"),
      `---\n${JSON.stringify(prdData, null, 2)}\n---\n# Enterprise SSO PRD`
    );

    const pmFinal = await advanceStep(tempDir);
    assert.strictEqual(pmFinal.completed, true);
    console.log("✅ product_discovery completed successfully across all steps");

    // ─────────────────────────────────────────────────────────────
    // 2. Technical Refinement Playbook (Tech Lead: feasibility -> implementation_plan)
    // ─────────────────────────────────────────────────────────────
    console.log("\nTesting technical_refinement playbook (Tech Lead flow)...");
    const techSession = await startPlaybook({
      playbookId: "technical_refinement",
      goal: "Refine SSO feature card from Azure Boards against current auth architecture",
      feature: "auth-sso",
      cwd: tempDir,
    });

    assert.strictEqual(techSession.active_step.id, "codebase_feasibility");
    const tStep1 = await getActiveStep(tempDir);
    assert.strictEqual(tStep1.step.id, "codebase_feasibility");
    assert.ok(tStep1.compiledPrompt.includes("Standard: anti_hallucination.md"));
    assert.ok(tStep1.compiledPrompt.includes("context7"));
    assert.ok(tStep1.compiledPrompt.includes("Context7 Documentation Directive"));
    console.log("✅ technical_refinement compiled prompt includes context7 toolbox & anti_hallucination standard");

    // Advance feasibility -> implementation_plan
    const tAdv1 = await advanceStep(tempDir);
    assert.strictEqual(tAdv1.active_step.id, "implementation_plan");

    // Step 2 is gated by 'plan'
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ technical_refinement implementation_plan step correctly blocked by locked 'plan' approval gate");

    // Request & approve gate
    await requestGateApproval({
      gate: "plan",
      summary: "Technical implementation plan and work packages refined for sprint backlog",
      cwd: tempDir,
    });
    await approveGate({ gate: "plan", cwd: tempDir });

    // Mock compliant ADR artifact for soft check
    const adrData = {
      title: "ADR: Refinement Implementation Plan for Auth SSO",
      status: "ACCEPTED",
      context: "Refinement meeting analyzed Okta SSO requirements against the existing auth module and database.",
      decision: "Implement Okta middleware with stateless JWT validation and store provider metadata in DB.",
      consequences: {
        positive: ["Stateless auth", "Clean interface boundary"],
        negative: ["Additional token verification latency"],
      },
      rollback_strategy: "Revert to local username/password authentication middleware flag.",
    };
    await fs.writeFile(
      path.join(tempDir, "docs", "pages", "auth-sso-implementation-plan.md"),
      `---\n${JSON.stringify(adrData, null, 2)}\n---\n# Implementation Plan`
    );

    const tFinal = await advanceStep(tempDir);
    assert.strictEqual(tFinal.completed, true);
    console.log("✅ technical_refinement completed successfully across all steps");

    // ─────────────────────────────────────────────────────────────
    // 3. Component Scaffold Playbook (Developer: spec -> implement_and_test)
    // ─────────────────────────────────────────────────────────────
    console.log("\nTesting component_scaffold playbook (Developer flow)...");
    const devSession = await startPlaybook({
      playbookId: "component_scaffold",
      goal: "Scaffold isolated Okta JWT validator middleware",
      cwd: tempDir,
    });

    assert.strictEqual(devSession.active_step.id, "spec");
    const dStep1 = await getActiveStep(tempDir);
    assert.strictEqual(dStep1.step.id, "spec");

    // Advance spec -> implement_and_test
    const dAdv1 = await advanceStep(tempDir);
    assert.strictEqual(dAdv1.active_step.id, "implement_and_test");

    // Run hard checks
    const dCheckRes = await runActiveStepChecks(tempDir);
    assert.strictEqual(dCheckRes.pass, true);
    console.log("✅ component_scaffold hard checks passed (test & lint auto-detected)");

    // Step 2 is gated by 'execution'
    await assert.rejects(
      async () => advanceStep(tempDir),
      /GATE LOCKED|CANNOT ADVANCE STEP/
    );
    console.log("✅ component_scaffold implement_and_test correctly blocked by locked 'execution' approval gate");

    // Request & approve gate
    await requestGateApproval({
      gate: "execution",
      summary: "Middleware scaffolded and local tests passing",
      cwd: tempDir,
    });
    await approveGate({ gate: "execution", cwd: tempDir });

    const dFinal = await advanceStep(tempDir);
    assert.strictEqual(dFinal.completed, true);
    console.log("✅ component_scaffold completed successfully across all steps");

    console.log("\n───────────────────────────────────────────────────────");
    console.log("ALL PM & REFINEMENT PLAYBOOK INTEGRATION TESTS PASSED!");
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
