import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";

const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Executes a shell command locally with timeout protection and captures exit code, stdout, and stderr.
 */
export function executeCommand(cmd, options = {}) {
  const {
    cwd = process.cwd(),
    timeout = 60000,
    env = process.env,
    maxBuffer = 10 * 1024 * 1024,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve) => {
    exec(
      cmd,
      {
        cwd,
        timeout,
        env,
        maxBuffer,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const exitCode = error ? (error.code ?? (error.killed ? 124 : 1)) : 0;
        const pass = exitCode === 0;

        resolve({
          pass,
          exitCode,
          cmd,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          durationMs,
          timedOut: !!error?.killed,
          error: error ? error.message : null,
        });
      }
    );
  });
}

/**
 * Automatically inspects the project root to detect standard test and lint check commands.
 */
export async function detectProjectChecks(projectRoot) {
  const checks = [];
  const root = projectRoot || process.cwd();

  // 1. Node.js (package.json)
  const pkgPath = path.join(root, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const scripts = pkg.scripts || {};
      if (scripts.test && scripts.test !== "echo \"Error: no test specified\" && exit 1") {
        checks.push({ type: "test", cmd: "npm test" });
      }
      if (scripts.lint) {
        checks.push({ type: "lint", cmd: "npm run lint" });
      }
      if (scripts.typecheck || scripts["type-check"]) {
        checks.push({ type: "typecheck", cmd: scripts.typecheck ? "npm run typecheck" : "npm run type-check" });
      }
    } catch (e) {
      // Ignore package read errors
    }
  }

  // 2. Rust (Cargo.toml)
  if (await fs.pathExists(path.join(root, "Cargo.toml"))) {
    checks.push({ type: "test", cmd: "cargo test" });
  }

  // 3. Go (go.mod)
  if (await fs.pathExists(path.join(root, "go.mod"))) {
    checks.push({ type: "test", cmd: "go test ./..." });
  }

  // 4. Python (pyproject.toml, pytest.ini, requirements.txt)
  if (
    (await fs.pathExists(path.join(root, "pyproject.toml"))) ||
    (await fs.pathExists(path.join(root, "pytest.ini"))) ||
    (await fs.pathExists(path.join(root, "setup.py")))
  ) {
    checks.push({ type: "test", cmd: "pytest" });
  }

  // 5. Flutter / Dart (pubspec.yaml)
  if (await fs.pathExists(path.join(root, "pubspec.yaml"))) {
    checks.push({ type: "test", cmd: "flutter test" });
  }

  // 6. Java (pom.xml, build.gradle)
  if (await fs.pathExists(path.join(root, "pom.xml"))) {
    checks.push({ type: "test", cmd: "mvn test" });
  } else if (await fs.pathExists(path.join(root, "build.gradle")) || await fs.pathExists(path.join(root, "build.gradle.kts"))) {
    checks.push({ type: "test", cmd: "./gradlew test" });
  }

  return checks;
}

/**
 * Runs a list of hard checks defined in a playbook step.
 */
export async function runHardChecks(stepHardChecks = [], options = {}) {
  const { cwd = process.cwd(), projectRoot = process.cwd(), timeout = 60000 } = options;
  const results = [];

  for (const checkDef of stepHardChecks) {
    let cmdToRun = null;

    if (checkDef.cmd) {
      cmdToRun = checkDef.cmd;
    } else if (checkDef.auto_detect) {
      const detected = await detectProjectChecks(projectRoot);
      const testCheck = detected.find((d) => d.type === "test");
      if (testCheck) {
        cmdToRun = testCheck.cmd;
      } else if (checkDef.fallback) {
        cmdToRun = checkDef.fallback;
      }
    }

    if (!cmdToRun) continue;

    const res = await executeCommand(cmdToRun, { cwd, timeout });
    results.push(res);

    if (!res.pass) {
      return {
        pass: false,
        failedCommand: cmdToRun,
        failingResult: res,
        allResults: results,
        errorMessage: formatCheckFailure(res),
      };
    }
  }

  return {
    pass: true,
    allResults: results,
  };
}

/**
 * Formats a failing check result into an actionable error message for the LLM.
 */
export function formatCheckFailure(res) {
  return [
    `❌ HARD CHECK FAILED: \`${res.cmd}\` exited with code ${res.exitCode} (${res.durationMs}ms)`,
    res.timedOut ? `⚠️ Execution timed out.` : ``,
    res.stderr ? `### STDERR:\n\`\`\`\n${res.stderr.trim()}\n\`\`\`` : ``,
    res.stdout ? `### STDOUT:\n\`\`\`\n${res.stdout.trim().slice(-2000)}\n\`\`\`` : ``,
    `Directive: Fix the errors above before proceeding. The step transition is blocked.`,
  ].filter(Boolean).join("\n");
}

/**
 * Lightweight JSON schema validator for soft checks.
 * Validates required properties, types, and enums.
 */
export function validateSchema(data, schema) {
  const errors = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Data root must be an object"] };
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (data[req] === undefined || data[req] === null) {
        errors.push(`Missing required field: '${req}'`);
      }
    }
  }

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined && data[key] !== null) {
        const val = data[key];

        if (propSchema.type) {
          if (propSchema.type === "array" && !Array.isArray(val)) {
            errors.push(`Field '${key}' must be an array`);
          } else if (propSchema.type === "string" && typeof val !== "string") {
            errors.push(`Field '${key}' must be a string`);
          } else if (propSchema.type === "number" && typeof val !== "number") {
            errors.push(`Field '${key}' must be a number`);
          } else if (propSchema.type === "boolean" && typeof val !== "boolean") {
            errors.push(`Field '${key}' must be a boolean`);
          } else if (propSchema.type === "object" && (typeof val !== "object" || Array.isArray(val))) {
            errors.push(`Field '${key}' must be an object`);
          }
        }

        if (propSchema.enum && !propSchema.enum.includes(val)) {
          errors.push(`Field '${key}' has invalid value '${val}'. Expected one of: ${propSchema.enum.join(", ")}`);
        }

        if (propSchema.minLength && typeof val === "string" && val.length < propSchema.minLength) {
          errors.push(`Field '${key}' length (${val.length}) is less than minLength (${propSchema.minLength})`);
        }

        if (propSchema.minItems && Array.isArray(val) && val.length < propSchema.minItems) {
          errors.push(`Field '${key}' items count (${val.length}) is less than minItems (${propSchema.minItems})`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extracts structured key-value data from an artifact's Markdown, YAML frontmatter, or code blocks.
 */
export function extractStructuredData(rawContent) {
  if (!rawContent || typeof rawContent !== "string") return {};

  // 1. Check for YAML frontmatter
  const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    try {
      const parsed = yaml.parse(fmMatch[1]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
  }

  // 2. Check for JSON code block
  const jsonMatch = rawContent.match(/```json\r?\n([\s\S]*?)\r?\n```/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
  }

  // 3. Check for YAML code block
  const yamlMatch = rawContent.match(/```ya?ml\r?\n([\s\S]*?)\r?\n```/i);
  if (yamlMatch) {
    try {
      const parsed = yaml.parse(yamlMatch[1]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
  }

  // 4. Fallback: Parse Markdown headings into an object
  const headings = {};
  const lines = rawContent.split(/\r?\n/);
  let currentKey = null;
  let currentText = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      if (currentKey) {
        headings[currentKey] = currentText.join("\n").trim();
      }
      currentKey = headingMatch[1].toLowerCase().replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_");
      currentText = [];
    } else if (currentKey) {
      currentText.push(line);
    }
  }
  if (currentKey) {
    headings[currentKey] = currentText.join("\n").trim();
  }

  return headings;
}

/**
 * Runs soft checks (JSON Schema validation) against an output artifact file.
 */
export async function runSoftChecks(stepSoftChecks = [], outputArtifactPath, options = {}) {
  const { projectRoot = process.cwd() } = options;

  if (!stepSoftChecks || stepSoftChecks.length === 0) {
    return { pass: true, message: "No soft checks configured for this step." };
  }

  if (!outputArtifactPath) {
    return { pass: true, message: "No output artifact path specified for soft checks." };
  }

  const fullPath = path.isAbsolute(outputArtifactPath)
    ? outputArtifactPath
    : path.join(projectRoot, outputArtifactPath);

  if (!(await fs.pathExists(fullPath))) {
    return {
      pass: false,
      artifactPath: outputArtifactPath,
      errorMessage: [
        `❌ SOFT CHECK FAILED: Required output artifact does not exist on disk: \`${outputArtifactPath}\``,
        `Directive: You must generate and write the required artifact before advancing this step.`,
      ].join("\n"),
    };
  }

  const rawContent = await fs.readFile(fullPath, "utf-8");
  const data = extractStructuredData(rawContent);

  for (const schemaRef of stepSoftChecks) {
    let fullSchemaPath = path.isAbsolute(schemaRef)
      ? schemaRef
      : path.join(AGENTS_ROOT, schemaRef);

    if (!(await fs.pathExists(fullSchemaPath))) {
      continue;
    }

    const schema = await fs.readJson(fullSchemaPath);
    const res = validateSchema(data, schema);
    if (!res.valid) {
      return {
        pass: false,
        artifactPath: outputArtifactPath,
        schema: path.basename(schemaRef),
        errors: res.errors,
        errorMessage: [
          `❌ SOFT CHECK FAILED: Artifact \`${outputArtifactPath}\` does not satisfy schema \`${path.basename(schemaRef)}\`.`,
          `Violations:`,
          ...res.errors.map((err) => `  - ${err}`),
          `Directive: Update the artifact to provide all required fields matching the schema specification.`,
        ].join("\n"),
      };
    }
  }

  return {
    pass: true,
    artifactPath: outputArtifactPath,
    message: `All soft checks passed for \`${outputArtifactPath}\`.`,
  };
}
