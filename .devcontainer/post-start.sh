#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════════════"
echo "  Starting sidecar services (mailpit, postgres) — DinD"
echo "══════════════════════════════════════════════════════════════"

cd /workspace

# Ensure .env exists for docker-compose (variable substitution)
cp .devcontainer/sample.env.local .devcontainer/.env

# DinD: sidecars run inside devcontainer; ports publish to localhost
docker compose -f .devcontainer/docker-compose.yml up -d

# Copy sample.env.local to backend/.env for running against devcontainer
cp .devcontainer/sample.env.local backend/.env

echo "  Sidecar services ready (localhost:1025, localhost:5432, localhost:8025)."
echo "══════════════════════════════════════════════════════════════"
