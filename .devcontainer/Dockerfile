FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# ── Add third-party APT repositories ──────────────────────────────────────────
# PostgreSQL 17 client (matches production Crunchy PostgreSQL version)
# Trivy (security/vulnerability scanner used in CI)
RUN curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
        | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
        > /etc/apt/sources.list.d/trivy.list

# ── Install packages from APT ────────────────────────────────────────────────
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        postgresql-client-17 \
        trivy \
        jq \
    && rm -rf /var/lib/apt/lists/*

# ── k6 (load testing) — multi-arch binary download ───────────────────────────
# k6 apt repo lacks arm64 packages, so we download the binary directly.
RUN set -e; \
    ARCH="$(dpkg --print-architecture)"; \
    K6_VERSION="$(curl -fsSL https://api.github.com/repos/grafana/k6/releases/latest | jq -r '.tag_name')"; \
    curl -fsSL "https://github.com/grafana/k6/releases/download/${K6_VERSION}/k6-${K6_VERSION}-linux-${ARCH}.tar.gz" \
        | tar xz --strip-components=1 -C /usr/local/bin

# ── OpenShift CLI (oc) — multi-arch binary download ───────────────────────────
# Deployment target is OpenShift Silver; oc is useful for cluster interaction.
# Supports both Intel (x86_64) and Apple Silicon (aarch64) hosts.
RUN set -e; \
    ARCH="$(uname -m)"; \
    case "$ARCH" in \
        x86_64)  OC_SUFFIX="linux" ;; \
        aarch64) OC_SUFFIX="linux-arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac; \
    curl -fsSL "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-${OC_SUFFIX}.tar.gz" \
        | tar xz -C /usr/local/bin oc
