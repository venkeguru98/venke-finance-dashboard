# ─── Stage 1: Build React Frontend ───────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --silent
COPY client/ ./
RUN npm run build

# ─── Stage 2: Build Express Backend ──────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --silent
COPY server/ ./
RUN npm run build

# ─── Stage 3: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production --silent

# Copy compiled server output
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built frontend into client/dist (Express serves this statically)
COPY --from=client-builder /app/client/dist ./client/dist

# Create required directories
RUN mkdir -p uploads backups

# Run as non-root user for security
RUN addgroup -S venke && adduser -S venke -G venke && \
    chown -R venke:venke /app
USER venke

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/api/health || exit 1

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server/dist/server.js"]
