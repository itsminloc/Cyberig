# ==========================================
# CyberRig Backend Production Multi-stage Dockerfile
# Node.js 20 LTS (Alpine)
# ==========================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------
# Stage 2: Runner (Production)
# ------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "dist/app.js"]
