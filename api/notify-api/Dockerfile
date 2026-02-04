# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS production

# Add non-root user for security (OpenShift requirement)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nestjs

CMD ["node", "dist/main.js"]