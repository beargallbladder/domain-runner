# Build stage
FROM rust:1.82 AS builder

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./
COPY services/crawler/Cargo.toml ./services/crawler/
COPY services/domain-registry/Cargo.toml ./services/domain-registry/

# Build dependencies (cached layer)
RUN mkdir -p services/crawler/src services/domain-registry/src && \
    echo "fn main() {}" > services/crawler/src/main.rs && \
    echo "fn main() {}" > services/domain-registry/src/main.rs && \
    cargo build --release --bin crawler && \
    rm -rf services/*/src

# Copy source code
COPY services/ ./services/

# Build for release
RUN touch services/crawler/src/main.rs && \
    cargo build --release --bin crawler

# Runtime stage
FROM debian:bookworm-slim

# Install SSL certificates and PostgreSQL client
RUN apt-get update && \
    apt-get install -y ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/crawler /app/crawler

# Expose port
EXPOSE 10000

# Run the crawler
CMD ["./crawler"]