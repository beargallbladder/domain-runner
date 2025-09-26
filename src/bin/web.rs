use domain_runner::{config::Settings, database::Database, web::{create_router, AppState}};
use std::net::SocketAddr;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting domain-runner web service");

    // Load configuration
    let settings = Settings::new()?;
    settings.validate()?;

    info!(
        "Configuration loaded: env={}, port={}",
        settings.env, settings.port
    );

    // Initialize database with retry logic
    let db = match Database::new(&settings.database_url, settings.clone()).await {
        Ok(db) => {
            info!("Database connected");
            // Run migrations
            if let Err(e) = db.migrate().await {
                error!("Failed to run migrations: {}", e);
            }
            Some(db)
        }
        Err(e) => {
            error!("Database connection failed: {}, running without database", e);
            None
        }
    };

    // Create app state
    let state = AppState {
        db,
        settings: settings.clone(),
    };

    // Create router
    let app = create_router(state);

    // Bind to address
    let addr = SocketAddr::from(([0, 0, 0, 0], settings.port));
    info!("Listening on {}", addr);

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}