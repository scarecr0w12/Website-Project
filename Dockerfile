# Multi-stage Dockerfile for system-agnostic production deployment
# Supports multiple architectures (amd64, arm64) and optimized for security and performance

# =============================================================================
# Base stage - common foundation for all stages
# =============================================================================
FROM node:24-alpine AS base

# Install system dependencies for cross-platform compatibility
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# =============================================================================
# Dependencies stage - install and cache dependencies
# =============================================================================
FROM base AS deps

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci --include=dev && \
    npm cache clean --force

# =============================================================================
# Build stage - compile application
# =============================================================================
FROM deps AS build

# Copy source code
COPY . .

# Build application (if needed for transpilation/bundling)
RUN npm run build 2>/dev/null || true

# Remove development dependencies
RUN npm prune --omit=dev && \
    npm cache clean --force

# =============================================================================
# Production stage - final optimized image
# =============================================================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy built application and production dependencies
COPY --from=build --chown=nextjs:nodejs /app/package*.json ./
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app .

# Create necessary directories with proper permissions
RUN mkdir -p data generated-content logs backups tmp && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# =============================================================================
# Development stage - optimized for development workflow
# =============================================================================
FROM base AS development

# Set development environment
ENV NODE_ENV=development
ENV NODE_OPTIONS="--inspect=0.0.0.0:9229 --max-old-space-size=2048"

# Install additional development tools
RUN apk add --no-cache \
    git \
    openssh-client \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies including dev
RUN npm ci && \
    npm cache clean --force

# Create directories with proper permissions
RUN mkdir -p data generated-content logs backups tmp && \
    chown -R nextjs:nodejs /app

# Copy source code (will be overridden by volume mount in development)
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose application and debug ports
EXPOSE 3000 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# =============================================================================
# Tools stage - utilities and development tools
# =============================================================================
FROM development AS tools

# Install additional development and testing tools
RUN npm install -g \
    nodemon \
    pm2 \
    mocha \
    jest \
    eslint \
    prettier \
    && npm cache clean --force

# Create tools directory
RUN mkdir -p /app/tools && \
    chown -R nextjs:nodejs /app/tools

# Default command for tools container
CMD ["tail", "-f", "/dev/null"]

# =============================================================================
# Backup stage - specialized for backup operations
# =============================================================================
FROM base AS backup

# Install backup utilities
RUN apk add --no-cache \
    sqlite \
    gzip \
    tar \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Copy backup scripts
COPY --chown=nextjs:nodejs scripts/backup.js ./scripts/
COPY --chown=nextjs:nodejs package*.json ./

# Install minimal dependencies for backup operations
RUN npm ci --omit=dev && \
    npm cache clean --force

# Create backup directories
RUN mkdir -p /backup-source /backups && \
    chown -R nextjs:nodejs /backup-source /backups

# Switch to non-root user
USER nextjs

# Health check for backup service
HEALTHCHECK --interval=300s --timeout=30s --start-period=60s --retries=2 \
    CMD test -f /tmp/backup-health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start backup service
CMD ["node", "scripts/backup.js"]

# =============================================================================
# Labels for better container management
# =============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=latest

LABEL maintainer="Viral Content Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="viral-content-website" \
      org.label-schema.description="System-agnostic viral content generation platform" \
      org.label-schema.url="https://github.com/viral-content/website" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/viral-content/website" \
      org.label-schema.vendor="Viral Content Team" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0" \
      com.viral-content.component="main-application" \
      com.viral-content.platform="multi-arch"
