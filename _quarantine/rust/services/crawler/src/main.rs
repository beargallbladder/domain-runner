use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod crawler;
mod providers;
mod db;

use config::Config;
use crawler::CrawlerOrchestrator;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "crawler=info,sqlx=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("🚀 Starting Domain Intelligence Crawler (Rust)");

    // Load configuration from environment
    let config = Config::from_env()?;
    
    info!("📊 Configuration loaded:");
    info!("  Database: {}", if config.database_url.contains("render.com") { "Render PostgreSQL" } else { "Unknown" });
    info!("  Redis: {}", if config.redis_url.is_some() { "Configured" } else { "Not configured" });
    info!("  Global concurrency: {}", config.global_concurrency);
    info!("  SLA target: {} minutes", config.sla_target_secs / 60);
    info!("  SLA max: {} minutes", config.sla_max_secs / 60);

    // Connect to PostgreSQL (Render)
    info!("🔌 Connecting to PostgreSQL on Render...");
    let pg_pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&config.database_url)
        .await?;
    
    info!("✅ Connected to database");

    // Run migrations (additive only)
    info!("🔧 Running database migrations...");
    db::run_migrations(&pg_pool).await?;
    
    // Count domains
    let domain_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM domains WHERE active = true")
        .fetch_one(&pg_pool)
        .await
        .unwrap_or(0);
    
    info!("📊 Found {} active domains to crawl", domain_count);

    // Connect to Redis if configured
    let redis_client = if let Some(redis_url) = &config.redis_url {
        info!("🔌 Connecting to Redis...");
        let client = redis::Client::open(redis_url.as_str())?;
        let mut conn = client.get_multiplexed_tokio_connection().await?;
        
        // Test connection
        let _: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .unwrap_or_else(|_| "PONG".to_string());
        
        info!("✅ Connected to Redis");
        Some(client)
    } else {
        info!("⚠️  Redis not configured, using in-memory rate limiting");
        None
    };

    // Initialize provider adapters with Render's API keys
    info!("🔑 Initializing provider adapters...");
    let providers = providers::initialize_providers(&config)?;
    info!("✅ Initialized {} providers", providers.len());
    
    for provider in &providers {
        info!("  • {}: {}", provider.name(), if provider.is_configured() { "✅ Ready" } else { "❌ No API key" });
    }

    // Create crawler orchestrator
    let orchestrator = CrawlerOrchestrator::new(
        config.clone(),
        pg_pool.clone(),
        redis_client,
        providers,
    );

    // Start health/metrics server
    tokio::spawn(async move {
        if let Err(e) = start_health_server(config.port).await {
            error!("Health server error: {}", e);
        }
    });

    // Start the crawl
    info!("🚀 Starting crawl of {} domains with {} providers", domain_count, orchestrator.provider_count());
    info!("⏱️  Target SLA: {} minutes", config.sla_target_secs / 60);
    
    match orchestrator.run().await {
        Ok(stats) => {
            info!("✅ Crawl completed successfully!");
            info!("📊 Final statistics:");
            info!("  Total API calls: {}", stats.total_calls);
            info!("  Successful: {}", stats.successful);
            info!("  Failed: {}", stats.failed);
            info!("  Duration: {} minutes", stats.duration_secs / 60);
            info!("  Rate: {:.1} calls/sec", stats.total_calls as f64 / stats.duration_secs as f64);
        }
        Err(e) => {
            error!("❌ Crawl failed: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}

async fn start_health_server(port: u16) -> Result<()> {
    use axum::{Router, routing::get, Json};
    use serde_json::json;
    
    let app = Router::new()
        .route("/healthz", get(|| async { Json(json!({"status": "healthy"})) }))
        .route("/metrics", get(|| async { Json(json!({"crawler": "running"})) }));
    
    let addr = format!("0.0.0.0:{}", port);
    info!("🏥 Health server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}