# ==========================================
# CyberRig Enterprise Multi-stage Dockerfile
# Node.js 20 LTS (Alpine) - Task DEVOPS-01 (PB-15)
# ==========================================

# ------------------------------------------
# Stage 1: Builder
# Compiles TypeScript source to production JavaScript in dist/
# ------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies including devDependencies for build
COPY package*.json tsconfig*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ------------------------------------------
# Stage 2: Runner (Production)
# Minimal runtime image with non-root security and healthcheck
# ------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled distribution files from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Security hardening: Run as unprivileged 'node' user
USER node

# Expose backend port
EXPOSE 3000

# Health check configuration (checks GET /healthz every 30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Production startup command
CMD ["node", "dist/app.js"]
