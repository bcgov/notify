#!/usr/bin/env bash
# Replicate PR/CI workflow steps locally:
# - pr-open.yml: build Docker image (backend)
# - analysis.yml: lint, unit tests
#
# Usage: ./scripts/ci-local.sh [--no-docker] [--no-trivy]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

# Parse flags
BUILD_DOCKER=true
RUN_TRIVY=true
for arg in "$@"; do
  case $arg in
    --no-docker) BUILD_DOCKER=false ;;
    --no-trivy) RUN_TRIVY=false ;;
  esac
done

echo "==> CI Local: Lint, Unit Tests, Build Image"
echo ""

# 1. Lint (backend - not in workflows but standard practice)
echo "==> [1/4] Lint (backend)"
cd "$BACKEND_DIR"
npm ci --ignore-scripts
npm run lint
echo ""

# 2. Unit tests (from analysis.yml backend-tests)
echo "==> [2/4] Unit Tests (backend)"
npm run test
echo ""

# 3. Build Docker image (from pr-open.yml builds job)
if [ "$BUILD_DOCKER" = true ]; then
  echo "==> [3/4] Build Docker image (backend)"
  cd "$ROOT_DIR"
  docker build -t notify-api-backend:local ./backend
  echo ""
else
  echo "==> [3/4] Build Docker image (skipped --no-docker)"
  echo ""
fi

# 4. Trivy security scan (from analysis.yml - optional)
if [ "$RUN_TRIVY" = true ] && command -v trivy &>/dev/null; then
  echo "==> [4/4] Trivy security scan"
  cd "$ROOT_DIR"
  trivy fs --ignore-unfixed --severity CRITICAL,HIGH . 2>/dev/null || true
  echo ""
elif [ "$RUN_TRIVY" = true ]; then
  echo "==> [4/4] Trivy (skipped - trivy not installed)"
  echo ""
else
  echo "==> [4/4] Trivy (skipped --no-trivy)"
  echo ""
fi

echo "==> CI Local: All steps completed successfully"
