import assert from "assert";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runTests() {
  console.log("Starting V3 Phase 3 Playbooks & Schemas Tests...\n");

  const expectedPlaybooks = [
    "feature_dev.yaml",
    "bug_fix.yaml",
    "security_audit.yaml",
    "pr_review.yaml",
    "consultation.yaml",
    "full_sync.yaml",
    "workflow_dev.yaml",
    "deep_research.yaml",
    "business_synthesis.yaml",
  ];

  for (const pbFile of expectedPlaybooks) {
    const pbPath = path.join(ROOT, "playbooks", pbFile);
    assert.ok(await fs.pathExists(pbPath), `Missing playbook: ${pbFile}`);

    const raw = await fs.readFile(pbPath, "utf-8");
    const pb = yaml.parse(raw);

    assert.ok(pb.id, `Playbook ${pbFile} missing id`);
    assert.ok(pb.name, `Playbook ${pbFile} missing name`);
    assert.ok(Array.isArray(pb.steps) && pb.steps.length > 0, `Playbook ${pbFile} has no steps`);

    for (const step of pb.steps) {
      assert.ok(step.id, `Step in ${pbFile} missing id`);
      assert.ok(step.name, `Step ${step.id} in ${pbFile} missing name`);
      assert.ok(step.lens, `Step ${step.id} in ${pbFile} missing lens`);

      const lensPath = path.join(ROOT, step.lens);
      assert.ok(await fs.pathExists(lensPath), `Step ${step.id} references non-existent lens: ${step.lens}`);

      if (step.standards) {
        for (const std of step.standards) {
          const stdPath = path.join(ROOT, std);
          assert.ok(await fs.pathExists(stdPath), `Step ${step.id} references non-existent standard: ${std}`);
        }
      }

      if (step.soft_checks) {
        for (const sc of step.soft_checks) {
          const scPath = path.join(ROOT, sc);
          assert.ok(await fs.pathExists(scPath), `Step ${step.id} references non-existent schema: ${sc}`);
        }
      }
    }

    console.log(`✅ PASS Playbook [${pbFile}] verified: ${pb.steps.length} steps, all lenses and schemas resolve`);
  }

  // Verify JSON Schemas
  const expectedSchemas = [
    "prd_schema.json",
    "adr_schema.json",
    "audit_schema.json",
    "acceptance_schema.json",
  ];

  for (const schemaFile of expectedSchemas) {
    const sPath = path.join(ROOT, "checks", "schemas", schemaFile);
    assert.ok(await fs.pathExists(sPath), `Missing schema: ${schemaFile}`);
    const json = await fs.readJson(sPath);
    assert.strictEqual(json.type, "object", `Schema ${schemaFile} root must be object`);
    assert.ok(Array.isArray(json.required) && json.required.length > 0, `Schema ${schemaFile} must have required fields`);
    console.log(`✅ PASS Schema [${schemaFile}] parsed and verified (${json.required.length} required fields)`);
  }

  console.log("\n───────────────────────────────────────────────────────");
  console.log("ALL V3 PHASE 3 TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
