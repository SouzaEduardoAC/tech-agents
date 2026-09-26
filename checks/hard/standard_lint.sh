#!/usr/bin/env bash
set -euo pipefail

# Standard Linter Runner for Polyglot Projects
# Detects project ecosystem and executes corresponding linter, preserving exit code.

PROJECT_ROOT="${1:-$(pwd)}"
cd "$PROJECT_ROOT"

echo "🔍 Detecting linter in $PROJECT_ROOT..."

if [ -f "package.json" ]; then
  LINT_SCRIPT=$(node -e '
    try {
      const p = require("./package.json");
      console.log(p.scripts && p.scripts.lint ? p.scripts.lint : "");
    } catch(e) { process.exit(0); }
  ' 2>/dev/null || echo "")

  if [ -n "$LINT_SCRIPT" ]; then
    echo "📦 Detected Node.js lint script. Running: npm run lint"
    npm run lint
    exit $?
  fi

  if [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ] || [ -f ".eslintrc" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.yml" ]; then
    echo "📦 Detected ESLint configuration. Running: npx eslint ."
    npx eslint .
    exit $?
  fi
fi

if [ -f "Cargo.toml" ]; then
  echo "🦀 Detected Rust project. Running: cargo clippy"
  cargo clippy -- -D warnings
  exit $?
fi

if [ -f "go.mod" ]; then
  if command -v golangci-lint >/dev/null 2>&1; then
    echo "🐹 Detected Go project. Running: golangci-lint run"
    golangci-lint run
    exit $?
  else
    echo "🐹 Detected Go project. Running: go vet ./..."
    go vet ./...
    exit $?
  fi
fi

if [ -f "pubspec.yaml" ]; then
  if command -v flutter >/dev/null 2>&1; then
    echo "💙 Detected Flutter project. Running: flutter analyze"
    flutter analyze
    exit $?
  elif command -v dart >/dev/null 2>&1; then
    echo "🎯 Detected Dart project. Running: dart analyze"
    dart analyze
    exit $?
  fi
fi

if [ -f "pyproject.toml" ] || [ -f "setup.cfg" ] || [ -f ".flake8" ]; then
  if command -v ruff >/dev/null 2>&1; then
    echo "🐍 Detected Python project. Running: ruff check ."
    ruff check .
    exit $?
  elif command -v flake8 >/dev/null 2>&1; then
    echo "🐍 Detected Python project. Running: flake8"
    flake8
    exit $?
  fi
fi

if ls *.sln >/dev/null 2>&1 || ls *.csproj >/dev/null 2>&1; then
  echo "🔷 Detected .NET project. Running: dotnet format --verify-no-changes"
  dotnet format --verify-no-changes
  exit $?
fi

echo "⚠️  No recognized linter found in $PROJECT_ROOT. Skipping lint."
exit 0
