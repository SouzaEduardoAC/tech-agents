import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import { fileURLToPath } from "url";
import {
  resolveStateFilePath,
  initPipelineSession,
  checkGateStatus,
  getState,
  saveState,
} from "./state_manager.js";
import { compileStepPrompt, interpolateVariables } from "./prompt_compiler.js";
import { runHardChecks, runSoftChecks } from "./check_runner.js";

const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Lists all available playbooks in playbooks/
 */
export async function listPlaybooks() {
  const pbDir = path.join(AGENTS_ROOT, "playbooks");
  if (!(await fs.pathExists(pbDir))) return [];

  const files = await fs.readdir(pbDir);
  const playbooks = [];

  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    try {
      const raw = await fs.readFile(path.join(pbDir, file), "utf-8");
      const data = yaml.parse(raw);
      if (data && data.id) {
        playbooks.push({
          id: data.id,
          name: data.name || data.id,
          category: data.category || "General",
          role: data.role || "Any",
          when_to_use: data.when_to_use || data.description || "",
          description: data.description || "",
          stepCount: Array.isArray(data.steps) ? data.steps.length : 0,
          gates: data.default_gates || [],
          file,
        });
      }
    } catch (e) {
      // Ignore unparseable files
    }
  }

  return playbooks;
}

/**
 * Loads a playbook by ID or filename.
 */
export async function loadPlaybook(playbookId) {
  const pbDir = path.join(AGENTS_ROOT, "playbooks");
  const candidates = [
    path.join(pbDir, `${playbookId}.yaml`),
    path.join(pbDir, `${playbookId}.yml`),
    path.join(pbDir, playbookId),
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      const raw = await fs.readFile(candidate, "utf-8");
      const data = yaml.parse(raw);
      if (data) return data;
    }
  }

  throw new Error(`Playbook '${playbookId}' not found in playbooks/ directory.`);
}

/**
 * Starts a new playbook session.
 */
export async function startPlaybook({ playbookId, goal, cwd, feature }) {
  if (!playbookId || !goal) {
    throw new Error("startPlaybook requires 'playbookId' and 'goal'.");
  }

  const playbook = await loadPlaybook(playbookId);
  const defaultGates = playbook.default_gates || [];

  const { state, statePath, session_id, projectRoot, feature: featureSlug } = await initPipelineSession({
    goal,
    gates: defaultGates,
    cwd,
    playbookId: playbook.id,
    feature,
  });

  state.playbook_id = playbook.id;
  state.playbook_name = playbook.name;
  state.feature = featureSlug;
  state.step_index = 0;
  state.total_steps = Array.isArray(playbook.steps) ? playbook.steps.length : 0;
  state.history = [];
  state.last_check_result = null;

  await saveState(state, cwd);

  const initialStep = playbook.steps && playbook.steps[0] ? playbook.steps[0] : null;

  return {
    session_id,
    playbook_id: playbook.id,
    playbook_name: playbook.name,
    feature: featureSlug,
    statePath,
    projectRoot,
    step_index: 0,
    total_steps: state.total_steps,
    active_step: initialStep,
  };
}

/**
 * Gets the active step definition and compiles its prompt context.
 */
export async function getActiveStep(cwd) {
  const stateResult = await getState(cwd);
  if (!stateResult || !stateResult.state) {
    throw new Error("No active pipeline session found. Start a playbook first with playbook_start.");
  }

  const { state, projectRoot } = stateResult;
  const playbook = await loadPlaybook(state.playbook_id || "feature_dev");

  if (state.step_index >= playbook.steps.length) {
    return {
      completed: true,
      message: `Playbook '${playbook.name}' completed all ${playbook.steps.length} steps.`,
      session_id: state.session_id,
      goal: state.goal,
      feature: state.feature,
      history: state.history,
    };
  }

  const step = playbook.steps[state.step_index];
  const feature = state.feature || "feature";
  const vars = { args: feature, feature, goal: state.goal };

  // Resolve interpolated artifacts
  const inputArtifacts = (step.input_artifacts || []).map((art) => interpolateVariables(art, vars));
  const outputArtifact = step.output_artifact ? interpolateVariables(step.output_artifact, vars) : null;

  // Resolve lens content
  let lensContent = "";
  let lensName = "";
  if (step.lens) {
    lensName = path.basename(step.lens, ".md");
    let lensPath = path.isAbsolute(step.lens) ? step.lens : path.join(AGENTS_ROOT, step.lens);
    if (await fs.pathExists(lensPath)) {
      lensContent = await fs.readFile(lensPath, "utf-8");
    }
  }

  // Compile step prompt
  const compiledPrompt = await compileStepPrompt({
    playbookId: playbook.id,
    stepId: step.id,
    stepName: step.name,
    stepDescription: step.description || "",
    lensName,
    goal: state.goal,
    feature,
    lensContent,
    inputArtifacts,
    outputArtifact,
    gate: step.gate || null,
    standards: step.standards || [],
    toolbox: step.toolbox || [],
    customCwd: cwd,
  });

  const resolvedStep = {
    ...step,
    input_artifacts: inputArtifacts,
    output_artifact: outputArtifact,
  };

  return {
    completed: false,
    session_id: state.session_id,
    playbook_id: playbook.id,
    feature,
    step_index: state.step_index,
    total_steps: playbook.steps.length,
    step: resolvedStep,
    output_artifact: outputArtifact,
    compiledPrompt,
    toolbox: step.toolbox || [],
    gate: step.gate || null,
    last_check_result: state.last_check_result,
  };
}

/**
 * Runs the configured hard checks and soft checks for the active step.
 */
export async function runActiveStepChecks(cwd) {
  const stateResult = await getState(cwd);
  if (!stateResult || !stateResult.state) {
    throw new Error("No active pipeline session found. Start a playbook first.");
  }

  const { state, projectRoot } = stateResult;
  const playbook = await loadPlaybook(state.playbook_id);
  const step = playbook.steps[state.step_index];

  if (!step) {
    throw new Error("No active step to run checks on.");
  }

  const feature = state.feature || "feature";
  const vars = { args: feature, feature, goal: state.goal };
  const resolvedOutput = step.output_artifact ? interpolateVariables(step.output_artifact, vars) : null;

  // 1. Run Hard Checks
  let hardResult = { pass: true, message: "No hard checks configured for this step." };
  if (step.hard_checks && step.hard_checks.length > 0) {
    hardResult = await runHardChecks(step.hard_checks, { cwd, projectRoot });
    if (!hardResult.pass) {
      state.last_check_result = hardResult;
      await saveState(state, cwd);
      return hardResult;
    }
  }

  // 2. Run Soft Checks
  let softResult = { pass: true, message: "No soft checks configured for this step." };
  if (step.soft_checks && step.soft_checks.length > 0) {
    softResult = await runSoftChecks(step.soft_checks, resolvedOutput, { projectRoot });
    if (!softResult.pass) {
      state.last_check_result = softResult;
      await saveState(state, cwd);
      return softResult;
    }
  }

  const combined = {
    pass: true,
    hard_checks: hardResult,
    soft_checks: softResult,
  };
  state.last_check_result = combined;
  await saveState(state, cwd);
  return combined;
}

/**
 * Advances to the next playbook step if all gates and checks are satisfied.
 */
export async function advanceStep(cwd) {
  const stateResult = await getState(cwd);
  if (!stateResult || !stateResult.state) {
    throw new Error("No active pipeline session found.");
  }

  const { state, projectRoot } = stateResult;
  const playbook = await loadPlaybook(state.playbook_id);
  const currentStep = playbook.steps[state.step_index];

  if (!currentStep) {
    return { completed: true, message: "Playbook already completed." };
  }

  // 1. Check Human Gate
  if (currentStep.gate) {
    const gateStatus = await checkGateStatus({ gate: currentStep.gate, cwd });
    if (!gateStatus.approved) {
      throw new Error(`CANNOT ADVANCE STEP: Gate '${currentStep.gate}' is not approved yet.`);
    }
  }

  // 2. Check Soft Checks
  if (currentStep.soft_checks && currentStep.soft_checks.length > 0) {
    const feature = state.feature || "feature";
    const vars = { args: feature, feature, goal: state.goal };
    const resolvedOutput = currentStep.output_artifact
      ? interpolateVariables(currentStep.output_artifact, vars)
      : null;

    const softRes = await runSoftChecks(currentStep.soft_checks, resolvedOutput, { projectRoot });
    if (!softRes.pass) {
      state.last_check_result = softRes;
      await saveState(state, cwd);
      throw new Error(
        `CANNOT ADVANCE STEP: Soft check failed for step '${currentStep.id}'.\n` +
        softRes.errorMessage
      );
    }
  }

  // 3. Check Hard Checks
  if (currentStep.hard_checks && currentStep.hard_checks.length > 0) {
    if (!state.last_check_result || !state.last_check_result.pass || state.last_check_result.failedCommand) {
      const checkRes = await runHardChecks(currentStep.hard_checks, { cwd, projectRoot });
      state.last_check_result = checkRes;
      await saveState(state, cwd);

      if (!checkRes.pass) {
        throw new Error(
          `CANNOT ADVANCE STEP: Hard check failed for step '${currentStep.id}'.\n` +
          checkRes.errorMessage
        );
      }
    }
  }

  // Record history
  state.history.push({
    step_id: currentStep.id,
    step_name: currentStep.name,
    completed_at: new Date().toISOString(),
    gate: currentStep.gate,
  });

  state.step_index++;
  state.last_check_result = null;
  await saveState(state, cwd);

  const nextStep = playbook.steps[state.step_index];
  const isCompleted = state.step_index >= playbook.steps.length;

  return {
    completed: isCompleted,
    previous_step: currentStep.id,
    step_index: state.step_index,
    total_steps: playbook.steps.length,
    active_step: nextStep || null,
  };
}

/**
 * Gets a clean status summary of the active playbook run.
 */
export async function getPlaybookStatus(cwd) {
  const stateResult = await getState(cwd);
  if (!stateResult || !stateResult.state) {
    return {
      active: false,
      message: "No active playbook session.",
    };
  }

  const { state } = stateResult;
  const playbook = await loadPlaybook(state.playbook_id || "feature_dev");
  const isCompleted = state.step_index >= playbook.steps.length;
  const currentStep = !isCompleted ? playbook.steps[state.step_index] : null;

  return {
    active: true,
    session_id: state.session_id,
    goal: state.goal,
    playbook_id: state.playbook_id,
    playbook_name: state.playbook_name || playbook.name,
    step_index: state.step_index,
    total_steps: playbook.steps.length,
    active_step: currentStep ? { id: currentStep.id, name: currentStep.name, gate: currentStep.gate } : null,
    completed: isCompleted,
    gates: state.gates || {},
    history: state.history || [],
  };
}
