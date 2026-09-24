/**
 * Toolboxes Registry
 * Defines scoped capabilities exposed to agents per step under the principle of least privilege.
 */

export const TOOLBOXES = {
  fs_read: {
    name: "Filesystem Reader",
    description: "Read-only workspace inspection: view_file, list_dir, find_by_name, grep_search.",
    readOnly: true,
  },
  fs_write: {
    name: "Filesystem Writer",
    description: "Targeted file modifications: write_to_file, replace_file_content.",
    readOnly: false,
  },
  git: {
    name: "Git Operations",
    description: "Branching, staging, committing (Conventional Commits), diff inspection, and PR operations.",
    readOnly: false,
  },
  verification: {
    name: "Local Verification & Test Execution",
    description: "Execution of local test suites, linters, and typecheckers via child_process.",
    readOnly: false,
  },
  analysis: {
    name: "Code Analysis & AST",
    description: "Static code analysis, AST pattern matching, and stack detection.",
    readOnly: true,
  },
  search_web: {
    name: "Web & Documentation Retriever",
    description: "External documentation, library API search, and research retriever.",
    readOnly: true,
  },
};

export function listToolboxes() {
  return Object.entries(TOOLBOXES).map(([id, info]) => ({
    id,
    ...info,
  }));
}

export function getToolbox(id) {
  return TOOLBOXES[id] || null;
}
