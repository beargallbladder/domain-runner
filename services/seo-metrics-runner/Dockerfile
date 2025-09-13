# Production Dockerfile for SEO Metrics Runner Service
FROM node:18-alpine AS builder

# Security: Create non-root user early
RUN addgroup -g 1001 -S nodejs && \
    adduser -S seorunner -u 1001 -G nodejs

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies for build
RUN npm ci --silent

# Copy source code
COPY src/ ./src/

# Build TypeScript if needed
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Production stage
FROM node:18-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S seorunner -u 1001 -G nodejs

# Install security updates and required packages
RUN apk add --no-cache \
    ca-certificates \
    curl \
    dumb-init \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --silent \
    && npm cache clean --force

# Copy built application (fallback to index.js if no build)
COPY --from=builder --chown=seorunner:nodejs /app/dist ./dist 2>/dev/null || \
COPY --chown=seorunner:nodejs index.js ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3004
ENV LOG_LEVEL=info
ENV SERVICE_NAME=seo-metrics-runner

# Security: Use non-root user
USER seorunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 3004

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application (check for built version first)
CMD ["sh", "-c", "if [ -f dist/index.js ]; then node dist/index.js; else node index.js; fi"]