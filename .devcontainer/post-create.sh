#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════════════"
echo "  BC Notify — Dev Container Setup"
echo "══════════════════════════════════════════════════════════════"
echo ""

# ── Install backend dependencies ────────────────────────────────────────────
echo "==> Installing backend dependencies..."
cd /workspace/backend
npm ci
cd /workspace

# ── Set up environment file ─────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  echo "==> Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  # Point DATABASE_URL to the devcontainer db service
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@db:5432/notify|' backend/.env
  echo "    Updated DATABASE_URL to use devcontainer PostgreSQL service"
else
  echo "==> backend/.env already exists, skipping..."
fi

# ── Print summary ───────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Setup complete!"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Quick start:"
echo "    cd backend && npm run start:dev    # API with hot reload"
echo "    cd backend && npm run start:debug  # API with debugger"
echo "    cd backend && npm test             # Unit tests"
echo "    cd backend && npm run test:e2e     # E2E tests"
echo "    cd backend && npm run lint         # Lint code"
echo ""
echo "  Endpoints:"
echo "    API:          http://localhost:3000"
echo "    Swagger docs: http://localhost:3000/api/docs"
echo ""
echo "  Database:"
echo "    Host: db  |  Port: 5432"
echo "    User: postgres  |  Password: postgres  |  DB: notify"
echo "    psql: psql -h db -U postgres -d notify"
echo ""
echo "  Installed tools:"
echo "    node $(node --version) | npm $(npm --version)"
echo "    psql (PostgreSQL) $(psql --version | awk '{print $3}')"
echo "    helm $(helm version --short 2>/dev/null || echo 'n/a')"
echo "    kubectl $(kubectl version --client --short 2>/dev/null || kubectl version --client -o json 2>/dev/null | jq -r '.clientVersion.gitVersion' || echo 'n/a')"
echo "    oc $(oc version --client 2>/dev/null | head -1 || echo 'n/a')"
echo "    trivy $(trivy --version 2>/dev/null | head -1 || echo 'n/a')"
echo "    k6 $(k6 version 2>/dev/null || echo 'n/a')"
echo "    gh $(gh --version 2>/dev/null | head -1 || echo 'n/a')"
echo ""
