# =============================================================================
# Domain Runner v2.0 - Rust Production Dockerfile
# Multi-stage build for optimal size and performance
# =============================================================================

# Stage 1: Build
FROM rust:1.81-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy all source files
COPY Cargo.toml ./
COPY src ./src
COPY migrations ./migrations

# Build application (single step, no caching optimization)
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
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
