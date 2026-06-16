# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools needed for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Copy package files first (layer cache)
COPY package*.json ./

# Install ALL deps (including dev) for the build step
RUN npm ci

# Copy source
COPY . .

# Build frontend + backend
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install build tools again — needed to recompile better-sqlite3 native addon
# against this exact Node/Alpine ABI
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production deps only and rebuild native addons
RUN npm ci --omit=dev && npm rebuild better-sqlite3

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database
RUN mkdir -p /data

# Expose port
EXPOSE 5000

# Environment
ENV NODE_ENV=production
ENV PORT=5000

# Store database in /data volume (survives container restarts)
ENV DATABASE_URL=/data/data.db

# Start
CMD ["node", "dist/index.cjs"]
