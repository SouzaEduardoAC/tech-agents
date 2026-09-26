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
  context7: {
    name: "Context7 Documentation & API Contracts (Peer MCP)",
    description: "Query live dependency documentation and API contracts via Context7 MCP (resolve-library-id, query-docs). Authorized during research and architecture phases.",
    readOnly: true,
  },
  stitch: {
    name: "Google Stitch UI Design & Tokens (Peer MCP)",
    description: "Extract design tokens, UI screens, and frontend component specs via Google Stitch MCP (get_screen, list_screens, list_projects, get_project).",
    readOnly: true,
  },
  playwright: {
    name: "Playwright E2E Browser Testing (Peer MCP)",
    description: "Automated browser interaction, screenshot capture, and visual regression testing via Playwright MCP (browser_navigate, browser_snapshot, browser_click).",
    readOnly: false,
  },
  sonarqube: {
    name: "SonarQube Code Quality & Security (Peer MCP)",
    description: "Code quality metrics, security hotspots, and quality gate evaluation via SonarQube MCP (quality_gate, issues, measures_component).",
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
