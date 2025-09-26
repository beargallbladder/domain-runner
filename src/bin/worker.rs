use domain_runner::{config::Settings, worker::Worker};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting domain-runner worker");

    // Load configuration
    let settings = Settings::new()?;
    settings.validate()?;

    info!(
        "Worker configuration: interval={}s, batch_size={}, drift_monitoring={}",
        settings.worker_interval_sec,
        settings.worker_batch_size,
        settings.enable_drift_monitoring
    );

    // Create and run worker
    let mut worker = Worker::new(settings).await?;
    worker.run().await?;

    Ok(())
}