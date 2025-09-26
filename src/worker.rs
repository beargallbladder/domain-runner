use crate::{
    database::Database,
    domain::{DomainResponse, DriftScore},
    drift::DriftEngine,
    error::Result,
    Settings,
};
use chrono::Utc;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};
use uuid::Uuid;

pub struct Worker {
    db: Database,
    settings: Settings,
    drift_engine: DriftEngine,
    run_count: u64,
}

impl Worker {
    pub async fn new(settings: Settings) -> Result<Self> {
        let db = Database::new(&settings.database_url, settings.clone()).await?;
        db.migrate().await?;

        Ok(Self {
            db,
            settings,
            drift_engine: DriftEngine::new(),
            run_count: 0,
        })
    }

    /// Main worker loop - explicit and type-safe
    pub async fn run(&mut self) -> Result<()> {
        let interval = Duration::from_secs(self.settings.worker_interval_sec);

        info!(
            "Worker starting with interval: {:?}, batch_size: {}",
            interval, self.settings.worker_batch_size
        );

        loop {
            self.run_count += 1;
            info!("Starting worker iteration #{}", self.run_count);

            match self.process_batch().await {
                Ok(processed) => {
                    info!("Processed {} items in iteration #{}", processed, self.run_count);
                }
                Err(e) => {
                    error!("Worker iteration #{} failed: {}", self.run_count, e);
                }
            }

            if self.settings.enable_drift_monitoring {
                if let Err(e) = self.process_drift_monitoring().await {
                    error!("Drift monitoring failed: {}", e);
                }
            }

            info!("Worker sleeping for {:?}", interval);
            sleep(interval).await;
        }
    }

    /// Process a batch of domains
    async fn process_batch(&mut self) -> Result<usize> {
        let domains = self.db.get_domains().await?;
        let batch_size = self.settings.worker_batch_size.min(domains.len());

        info!("Processing batch of {} domains", batch_size);

        let mut processed = 0;
        for domain in domains.iter().take(batch_size) {
            // In production, this would call LLM providers
            // For now, simulate processing
            info!("Processing domain: {}", domain.domain);

            // Create mock response
            let response = DomainResponse {
                id: Uuid::new_v4(),
                domain: domain.domain.clone(),
                llm_model: "mock-model".to_string(),
                llm_response: format!("Processed {}", domain.domain),
                timestamp: Utc::now(),
                token_count: 100,
                response_time_ms: 250,
                status: crate::domain::ResponseStatus::Success,
                prompt_type: "analysis".to_string(),
                embedding: Some(vec![0.1, 0.2, 0.3, 0.4, 0.5]),
            };

            self.db.save_domain_response(&response).await?;
            processed += 1;
        }

        Ok(processed)
    }

    /// Process drift monitoring
    async fn process_drift_monitoring(&mut self) -> Result<()> {
        info!("Processing drift monitoring");

        // Get recent responses for drift analysis
        let responses = self
            .db
            .get_domain_responses(None, None, 100)
            .await?;

        let mut drift_count = 0;

        // Group by domain and check for drift
        let mut domain_embeddings: std::collections::HashMap<String, Vec<Vec<f32>>> =
            std::collections::HashMap::new();

        for response in responses {
            if let Some(embedding) = response.embedding {
                domain_embeddings
                    .entry(response.domain.clone())
                    .or_default()
                    .push(embedding);
            }
        }

        // Calculate drift for each domain
        for (domain, embeddings) in domain_embeddings {
            if embeddings.len() < 2 {
                continue;
            }

            let drifts = self.drift_engine.calculate_temporal_drift(&embeddings);

            if let Some(latest_drift) = drifts.last() {
                if *latest_drift > 0.3 {
                    warn!(
                        "High drift detected for domain {}: {:.2}",
                        domain, latest_drift
                    );

                    // Create drift score record
                    let drift_score = DriftScore {
                        drift_id: Uuid::new_v4(),
                        domain: domain.clone(),
                        prompt_id: "analysis".to_string(),
                        model: "ensemble".to_string(),
                        ts_iso: Utc::now(),
                        similarity_prev: 1.0 - latest_drift,
                        drift_score: *latest_drift,
                        status: self.drift_engine.classify_drift(1.0 - latest_drift),
                        explanation: Some(format!("Drift: {:.2}%", latest_drift * 100.0)),
                    };

                    self.db.save_drift_score(&drift_score).await?;
                    drift_count += 1;
                }
            }
        }

        info!("Drift monitoring complete: {} drifts detected", drift_count);
        Ok(())
    }
}