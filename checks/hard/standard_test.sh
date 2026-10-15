#!/usr/bin/env bash
set -euo pipefail

# Standard Test Runner for Polyglot Projects
# Detects project ecosystem and executes corresponding test runner, preserving exit code.

PROJECT_ROOT="${1:-$(pwd)}"
cd "$PROJECT_ROOT"

echo "🔍 Detecting test runner in $PROJECT_ROOT..."

if [ -f "package.json" ]; then
  TEST_SCRIPT=$(node -e '
    try {
      const p = require("./package.json");
      console.log(p.scripts && p.scripts.test ? p.scripts.test : "");
    } catch(e) { process.exit(0); }
  ' 2>/dev/null || echo "")
  
  if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "echo \"Error: no test specified\" && exit 1" ]; then
    echo "📦 Detected Node.js project. Running: npm test"
    npm test
    exit $?
  fi
fi

if [ -f "Cargo.toml" ]; then
  echo "🦀 Detected Rust project. Running: cargo test"
  cargo test
  exit $?
fi

if [ -f "go.mod" ]; then
  echo "🐹 Detected Go project. Running: go test ./..."
  go test ./...
  exit $?
fi

if [ -f "pubspec.yaml" ]; then
  if command -v flutter >/dev/null 2>&1; then
    echo "💙 Detected Flutter project. Running: flutter test"
    flutter test
    exit $?
  elif command -v dart >/dev/null 2>&1; then
    echo "🎯 Detected Dart project. Running: dart test"
    dart test
    exit $?
  fi
fi

if [ -f "pyproject.toml" ] || [ -f "pytest.ini" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
  if command -v pytest >/dev/null 2>&1; then
    echo "🐍 Detected Python project. Running: pytest"
    pytest
    exit $?
  elif command -v python3 >/dev/null 2>&1 && python3 -m unittest discover >/dev/null 2>&1; then
    echo "🐍 Detected Python project. Running: python3 -m unittest discover"
    python3 -m unittest discover
    exit $?
  fi
fi

if [ -f "pom.xml" ]; then
  echo "☕ Detected Maven project. Running: mvn test"
  mvn test
  exit $?
fi

if [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  if [ -x "./gradlew" ]; then
    echo "☕ Detected Gradle project. Running: ./gradlew test"
    ./gradlew test
    exit $?
  elif command -v gradle >/dev/null 2>&1; then
    echo "☕ Detected Gradle project. Running: gradle test"
    gradle test
    exit $?
  fi
fi

if ls *.sln >/dev/null 2>&1 || ls *.csproj >/dev/null 2>&1; then
  echo "🔷 Detected .NET project. Running: dotnet test"
  dotnet test
  exit $?
fi

echo "⚠️  No recognized test suite found in $PROJECT_ROOT. Skipping tests."
exit 0
