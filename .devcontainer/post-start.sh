#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════════════"
echo "  Starting sidecar services (mailpit, postgres)"
echo "══════════════════════════════════════════════════════════════"

cd /workspace
docker compose -f .devcontainer/docker-compose.yml up -d

# Connect this dev container to the sidecar network so we can reach mailpit and db
CONTAINER_ID=$(cat /etc/hostname)
docker network connect notify-dev "$CONTAINER_ID" 2>/dev/null || true

echo "  Sidecar services ready."
echo "══════════════════════════════════════════════════════════════"
