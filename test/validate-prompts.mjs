import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import toml from "toml";

const AGENTS_ROOT = path.resolve(import.meta.dirname, "..");
const AGENT_DIRS = [
  "po", "architect", "backend", "frontend", "mobile", 
  "squad", "compliance", "council", "decoder", "forge", 
  "quicky", "researcher", "automata"
];

let failed = false;

async function runValidation() {
  console.log("======================================================");
  console.log("  Agent Hub Command Prompt Consistency Validator");
  console.log("======================================================\n");

  const tomlPattern = path.join(AGENTS_ROOT, "*(po|architect|backend|frontend|mobile|squad|compliance|council|decoder|forge|quicky|researcher|automata)", "commands", "**", "*.toml").replace(/\\/g, "/");
  const tomlFiles = await glob(tomlPattern);

  console.log(`Found ${tomlFiles.length} command TOML files to validate.\n`);

  for (const file of tomlFiles) {
    const relativePath = path.relative(AGENTS_ROOT, file);
    const content = await fs.readFile(file, "utf-8");
    let tomlData;
    
    try {
      tomlData = toml.parse(content);
    } catch (e) {
      console.log(`❌ FAIL [${relativePath}]: TOML Parsing Error - ${e.message}`);
      failed = true;
      continue;
    }

    const prompt = tomlData.prompt || "";
    const errors = [];

    // Rule 1: No obsolete protocol.md imports (specifically check for skills/protocol.md or skills/brainstorming_protocol.md)
    if (prompt.includes("skills/protocol.md") || prompt.includes("skills/brainstorming_protocol.md")) {
      errors.push("Contains reference to obsolete skills/protocol.md or skills/brainstorming_protocol.md");
    }

    // Rule 2: Enforce Logseq outliner path consistency for squad commands
    const basename = path.basename(file);
    if (basename.startsWith("squad-")) {
      if (basename.includes("discovery") && !prompt.includes("docs/pages/{{args}}-prd.md")) {
        errors.push("Squad discovery command should target docs/pages/{{args}}-prd.md");
      }
      if (basename.includes("plan") && !prompt.includes("docs/pages/{{args}}-analysis.md")) {
        errors.push("Squad plan command should target docs/pages/{{args}}-analysis.md");
      }
      if (basename.includes("plan") && !prompt.includes("docs/pages/{{args}}-architecture.md")) {
        errors.push("Squad plan command should target docs/pages/{{args}}-architecture.md");
      }
      if (basename.includes("create") && !prompt.includes("docs/pages/{{args}}-prd.md")) {
        errors.push("Squad create command should read docs/pages/{{args}}-prd.md");
      }
      if (basename.includes("create") && !prompt.includes("docs/pages/{{args}}-architecture.md")) {
        errors.push("Squad create command should read docs/pages/{{args}}-architecture.md");
      }
    }

    // Rule 3: Enforce Logseq properties for output-generating commands
    if (basename.includes("create") || basename.includes("plan") || basename.includes("discovery")) {
      if (basename.startsWith("squad-create")) {
        // Skip properties check for squad-create since it doesn't generate a main document
      } else {
        const mentionsProperties = prompt.includes("type::") || prompt.includes("Logseq properties") || prompt.includes("properties block") || prompt.includes("properties");
        if (!mentionsProperties) {
          errors.push("Missing standard Logseq properties requirement (type::, status::, project::)");
        }
      }
    }

    if (errors.length > 0) {
      console.log(`❌ FAIL [${relativePath}]:`);
      for (const err of errors) {
        console.log(`   - ${err}`);
      }
      failed = true;
    } else {
      console.log(`✅ PASS [${relativePath}]`);
    }
  }

  console.log("\n======================================================");
  if (failed) {
    console.log("  Validation FAILED: Fix the consistency issues above.");
    console.log("======================================================");
    process.exit(1);
  } else {
    console.log("  Validation PASSED: All commands are consistent!");
    console.log("======================================================");
  }
}

runValidation().catch(err => {
  console.error("Validation error:", err);
  process.exit(1);
});
