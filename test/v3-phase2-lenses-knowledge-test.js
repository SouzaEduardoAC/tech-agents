import assert from "assert";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { compileStepPrompt } from "../engine/prompt_compiler.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runTests() {
  console.log("Starting V3 Phase 2 Cognitive Lenses & Knowledge Tests...\n");

  const expectedLenses = [
    "architect.md",
    "backend.md",
    "frontend.md",
    "mobile.md",
    "compliance.md",
    "po.md",
    "qa.md",
    "quicky.md",
    "council.md",
    "automata.md",
    "researcher.md",
  ];

  for (const lensFile of expectedLenses) {
    const lensPath = path.join(ROOT, "lenses", lensFile);
    assert.ok(await fs.pathExists(lensPath), `Missing lens file: ${lensFile}`);
    const content = (await fs.readFile(lensPath, "utf-8")).trim();

    // Check conciseness: sentences count <= 4
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    assert.ok(
      sentences.length <= 4,
      `Lens ${lensFile} has ${sentences.length} sentences, expected <= 4`
    );

    // Words count <= 80 words
    const words = content.split(/\s+/).filter(Boolean);
    assert.ok(
      words.length <= 80,
      `Lens ${lensFile} has ${words.length} words, expected <= 80`
    );

    // Zero theatrical persona fluff
    assert.ok(!content.includes("BIOS"), `Lens ${lensFile} contains prohibited BIOS anchor`);
    assert.ok(!content.includes("UNIVERSAL COGNITIVE ANCHOR"), `Lens ${lensFile} contains anchor bloat`);
    assert.ok(!content.includes("[Agent:"), `Lens ${lensFile} contains legacy agent tag`);

    // Benchmark prompt compilation size
    const compiled = await compileStepPrompt({
      playbookId: "test",
      stepId: "step1",
      stepName: "Step 1",
      goal: "Test Task",
      lensContent: content,
      toolbox: ["fs_read"],
    });

    // In v2, persona payloads were 30,000 to 130,000 characters.
    // In v3, a clean step prompt with lens should be under 1,500 characters (< 350 tokens)!
    assert.ok(
      compiled.length < 1500,
      `Compiled step prompt with ${lensFile} is ${compiled.length} chars, expected < 1500`
    );

    console.log(`✅ PASS Lens [${lensFile}] verified: ${sentences.length} sentences, ${words.length} words, compiled length ${compiled.length} chars`);
  }

  // Verify centralized knowledge files
  const expectedKnowledge = [
    "auth_standard.md",
    "git_standard.md",
    "testing_standard.md",
    "product_interview.md",
    "gatekeeping.md",
    "licensing.md",
    "gdpr.md",
    "hipaa.md",
    "lgpd.md",
    "stacks/java.md",
    "stacks/react.md",
    "stacks/flutter.md",
    "stacks/dotnet.md",
    "stacks/go.md",
  ];

  for (const kFile of expectedKnowledge) {
    const kPath = path.join(ROOT, "knowledge", kFile);
    assert.ok(await fs.pathExists(kPath), `Missing centralized knowledge file: ${kFile}`);
    const stat = await fs.stat(kPath);
    assert.ok(stat.size > 100, `Knowledge file ${kFile} is too small (${stat.size} bytes)`);
    console.log(`✅ PASS Knowledge [${kFile}] verified (${stat.size} bytes)`);
  }

  console.log("\n───────────────────────────────────────────────────────");
  console.log("ALL V3 PHASE 2 TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
