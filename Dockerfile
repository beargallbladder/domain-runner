# =============================================================================
# Domain Runner v2.0 - Rust Production Dockerfile
# Multi-stage build for optimal size and performance
# =============================================================================

# Stage 1: Build
FROM rust:1.75-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy main to cache dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src ./src
COPY migrations ./migrations

# Build application
RUN touch src/main.rs && \
    cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/domain-runner /app/domain-runner

# Copy migrations
COPY --from=builder /app/migrations /app/migrations

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/healthz || exit 1

# Run
CMD ["/app/domain-runner"]
