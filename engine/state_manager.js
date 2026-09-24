import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";
import { fileURLToPath } from "url";

const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Dynamic state file resolver. Traverses upward from customCwd or process.cwd()
 * looking for project root markers (.git, package.json) to locate the active project root,
 * queries the current Git branch name, and scopes the state file to that branch.
 */
export async function resolveStateFilePath(customCwd) {
  let dir = customCwd || process.cwd();
  let projectRoot = null;
  let currentDir = dir;

  while (true) {
    const hasGit = await fs.pathExists(path.join(currentDir, ".git"));
    const hasPkg = await fs.pathExists(path.join(currentDir, "package.json"));
    if (hasGit || hasPkg) {
      projectRoot = currentDir;
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  if (!projectRoot) {
    projectRoot = dir;
  }

  // Determine active branch name for scoping
  let branch = "default";
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (e) {
    // Fallback if git is not initialized or fails
  }

  const branchSlug = branch.replace(/[^a-zA-Z0-9-_]/g, "_");
  const stateFileName = `.squad-state-${branchSlug}.json`;

  return {
    statePath: path.join(projectRoot, stateFileName),
    projectRoot,
    branchSlug,
  };
}

/**
 * Detects if the resolved project root is the Agent Hub repository.
 */
export async function isInsideHub(projectRoot) {
  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  const geminiMdPath = path.join(projectRoot, "GEMINI.md");
  if (!(await fs.pathExists(agentsMdPath)) || !(await fs.pathExists(geminiMdPath))) {
    return false;
  }
  const pkgPath = path.join(projectRoot, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkgJson = await fs.readJson(pkgPath);
      return pkgJson.name === "@souzaeduardoac/tech-agents";
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * Retrieves the compliance mandate from AGENTS.md or fallbacks to the default text.
 */
export async function getComplianceMandate(projectRoot) {
  const defaultMandate = `## 📜 Documentation Protocol Integrity\n**CRITICAL MANDATE:** You MUST always respect and update the entire documentation protocol of all agents (such as journals, registry, and graphs) when modifying the repository, EVEN if you are not currently operating as the specific agent responsible for that domain. Code changes without corresponding protocol updates are strictly prohibited.`;
  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  if (!(await fs.pathExists(agentsMdPath))) {
    return defaultMandate;
  }
  try {
    const content = await fs.readFile(agentsMdPath, "utf-8");
    const match = content.match(/(## 📜 Documentation Protocol Integrity[\s\S]*?)(?=\n+##\s+|$)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // Ignore error, fallback
  }
  return defaultMandate;
}

/**
 * Initialize a new pipeline session with locked gates.
 */
export async function initPipelineSession({ goal, gates = [], cwd, playbookId = null }) {
  if (!goal || !Array.isArray(gates)) {
    throw new Error("initPipelineSession requires 'goal' (string) and 'gates' (array).");
  }

  const hash = crypto.createHash("sha256").update(goal).digest("hex").slice(0, 8);
  const session_id = `${Date.now()}-${hash}`;
  const initiated_at = new Date().toISOString();

  const gatesObj = {};
  for (const key of gates) {
    gatesObj[key] = { status: "locked" };
  }

  const state = {
    session_id,
    initiated_at,
    goal,
    playbook: playbookId,
    active_step: 0,
    gates: gatesObj,
  };

  const { statePath, projectRoot } = await resolveStateFilePath(cwd);
  await fs.writeJson(statePath, state, { spaces: 2 });

  // Automatically append .squad-state-*.json to target project's .gitignore if exists
  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (await fs.pathExists(gitignorePath)) {
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
      const lines = gitignoreContent.split(/\r?\n/);
      const hasStateFile = lines.some((line) => line.trim() === ".squad-state-*.json");
      if (!hasStateFile) {
        const endsWithNewline = gitignoreContent.endsWith("\n") || gitignoreContent.endsWith("\r");
        const appendStr = (endsWithNewline ? "" : "\n") + ".squad-state-*.json\n";
        await fs.appendFile(gitignorePath, appendStr);
      }
    } catch (e) {
      // Ignore gitignore append errors
    }
  }

  return { state, statePath, session_id, projectRoot };
}

/**
 * Request human approval for a gate.
 */
export async function requestGateApproval({ gate, artifact_path, summary, cwd }) {
  const { statePath } = await resolveStateFilePath(cwd);

  if (!(await fs.pathExists(statePath))) {
    return {
      standalone: true,
      gate,
      artifact_path,
      summary,
    };
  }

  const state = await fs.readJson(statePath);
  if (!state.gates[gate]) {
    state.gates[gate] = {};
  }
  state.gates[gate].status = "pending";
  state.gates[gate].requested_at = new Date().toISOString();
  if (artifact_path) state.gates[gate].artifact = artifact_path;

  await fs.writeJson(statePath, state, { spaces: 2 });
  return {
    standalone: false,
    gate,
    artifact_path,
    summary,
    state,
    statePath,
  };
}

/**
 * Checks gate status before proceeding.
 */
export async function checkGateStatus({ gate, cwd }) {
  const { statePath } = await resolveStateFilePath(cwd);

  if (!(await fs.pathExists(statePath))) {
    return {
      standalone: true,
      approved: true,
      gate,
    };
  }

  const state = await fs.readJson(statePath);
  const gateInfo = state.gates?.[gate];

  if (!gateInfo) {
    throw new Error(
      `Gate '${gate}' is not registered in this pipeline session. Registered gates: ${Object.keys(state.gates || {}).join(", ")}`
    );
  }

  if (gateInfo.status === "approved") {
    return {
      approved: true,
      gate,
      approved_at: gateInfo.approved_at,
    };
  }

  if (gateInfo.status === "pending") {
    throw new Error(
      `GATE PENDING APPROVAL: Gate '${gate}' requires human approval before this phase can proceed.\n` +
      `Summary: ${gateInfo.summary || "Phase complete, waiting for review."}\n` +
      (gateInfo.artifact ? `Artifact to review: ${gateInfo.artifact}\n` : "") +
      `To approve, run /squad:approve ${gate} or call the pipeline_approve tool.`
    );
  }

  // gateInfo.status === "locked"
  throw new Error(
    `GATE LOCKED: Gate '${gate}' has not been reached yet or approval has not been requested.\n` +
    `Complete the preceding phases and call request_approval before attempting to check this gate.`
  );
}

/**
 * Approves a pending gate.
 */
export async function approveGate({ gate, cwd }) {
  const { statePath } = await resolveStateFilePath(cwd);

  if (!(await fs.pathExists(statePath))) {
    throw new Error(
      `No active pipeline session found. No .squad-state-*.json file exists in this workspace.\n` +
      `Start a pipeline first using pipeline_start before approving gates.`
    );
  }

  const state = await fs.readJson(statePath);
  const gateInfo = state.gates?.[gate];

  if (!gateInfo) {
    throw new Error(
      `Gate '${gate}' is not registered in this pipeline session. Registered gates: ${Object.keys(state.gates || {}).join(", ")}`
    );
  }

  if (gateInfo.status === "approved") {
    return {
      alreadyApproved: true,
      gate,
      approved_at: gateInfo.approved_at,
    };
  }

  if (gateInfo.status === "locked") {
    throw new Error(
      `CANNOT APPROVE LOCKED GATE: Gate '${gate}' is still locked. The preceding phase has not finished or called request_approval yet.`
    );
  }

  gateInfo.status = "approved";
  gateInfo.approved_at = new Date().toISOString();
  await fs.writeJson(statePath, state, { spaces: 2 });

  return {
    success: true,
    gate,
    approved_at: gateInfo.approved_at,
    state,
  };
}

/**
 * Gets the current raw state object.
 */
export async function getState(cwd) {
  const { statePath, projectRoot, branchSlug } = await resolveStateFilePath(cwd);
  if (!(await fs.pathExists(statePath))) {
    return null;
  }
  const state = await fs.readJson(statePath);
  return { state, statePath, projectRoot, branchSlug };
}

/**
 * Saves raw state object.
 */
export async function saveState(state, cwd) {
  const { statePath } = await resolveStateFilePath(cwd);
  await fs.writeJson(statePath, state, { spaces: 2 });
}
