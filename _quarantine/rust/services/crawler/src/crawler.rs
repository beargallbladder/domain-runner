use anyhow::Result;
use chrono::Utc;
use futures::stream::{self, StreamExt};
use sqlx::PgPool;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tracing::{info, warn, error};
use uuid::Uuid;

use crate::config::Config;
use crate::db;
use crate::providers::{ProviderAdapter, Prompt};

pub struct CrawlerOrchestrator {
    config: Config,
    pg_pool: PgPool,
    redis_client: Option<redis::Client>,
    providers: Vec<Arc<dyn ProviderAdapter>>,
    global_semaphore: Arc<Semaphore>,
}

pub struct CrawlStats {
    pub total_calls: usize,
    pub successful: usize,
    pub failed: usize,
    pub duration_secs: u64,
}

impl CrawlerOrchestrator {
    pub fn new(
        config: Config,
        pg_pool: PgPool,
        redis_client: Option<redis::Client>,
        providers: Vec<Arc<dyn ProviderAdapter>>,
    ) -> Self {
        let global_semaphore = Arc::new(Semaphore::new(config.global_concurrency));
        
        Self {
            config,
            pg_pool,
            redis_client,
            providers,
            global_semaphore,
        }
    }
    
    pub fn provider_count(&self) -> usize {
        self.providers.iter().filter(|p| p.is_configured()).count()
    }
    
    pub async fn run(&self) -> Result<CrawlStats> {
        let start_time = Instant::now();
        let batch_id = format!("rust_crawler_{}", Utc::now().format("%Y%m%d_%H%M%S"));
        
        info!("🏁 Starting crawl batch: {}", batch_id);
        
        // Record batch start
        sqlx::query(
            "INSERT INTO crawl_batches (batch_id, started_at, status) VALUES ($1, NOW(), 'running')"
        )
        .bind(&batch_id)
        .execute(&self.pg_pool)
        .await?;
        
        // Get active domains from database
        let domains = self.fetch_active_domains().await?;
        info!("📋 Fetched {} active domains", domains.len());
        
        // Define prompts
        let prompts = vec![
            Prompt {
                prompt_type: "business_analysis".to_string(),
                text: "Analyze the business potential and market position of {domain}. Provide comprehensive insights.".to_string(),
            },
            Prompt {
                prompt_type: "content_strategy".to_string(),
                text: "Develop a content and SEO strategy for {domain}. Include competitive analysis.".to_string(),
            },
            Prompt {
                prompt_type: "technical_assessment".to_string(),
                text: "Assess the technical implementation and infrastructure needs for {domain}.".to_string(),
            },
        ];
        
        let mut total_calls = 0;
        let mut successful = 0;
        let mut failed = 0;
        
        // Process domains in chunks
        let chunk_size = 10;
        for chunk in domains.chunks(chunk_size) {
            let tasks = chunk.iter().flat_map(|domain| {
                self.providers.iter()
                    .filter(|p| p.is_configured())
                    .flat_map(|provider| {
                        prompts.iter().map(move |prompt| {
                            self.process_domain_provider(
                                domain.clone(),
                                provider.clone(),
                                prompt.clone(),
                                batch_id.clone(),
                            )
                        })
                    })
                    .collect::<Vec<_>>()
            });
            
            let results = stream::iter(tasks)
                .buffer_unordered(self.config.global_concurrency)
                .collect::<Vec<_>>()
                .await;
            
            for result in results {
                total_calls += 1;
                match result {
                    Ok(_) => successful += 1,
                    Err(e) => {
                        failed += 1;
                        warn!("Task failed: {}", e);
                    }
                }
            }
            
            // Check SLA
            let elapsed = start_time.elapsed();
            if elapsed > Duration::from_secs(self.config.sla_target_secs) {
                warn!("⚠️  Soft deadline reached ({} minutes), degrading", elapsed.as_secs() / 60);
            }
            if elapsed > Duration::from_secs(self.config.sla_max_secs) {
                error!("❌ Hard deadline reached ({} minutes), stopping", elapsed.as_secs() / 60);
                break;
            }
            
            // Progress update
            info!("📊 Progress: {}/{} calls ({} successful, {} failed)", 
                  total_calls, 
                  domains.len() * self.provider_count() * prompts.len(),
                  successful, 
                  failed);
        }
        
        // Update batch completion
        let duration_secs = start_time.elapsed().as_secs();
        sqlx::query(
            r#"
            UPDATE crawl_batches 
            SET completed_at = NOW(), 
                status = 'completed',
                domains_processed = $2,
                total_api_calls = $3,
                success_count = $4,
                error_count = $5
            WHERE batch_id = $1
            "#
        )
        .bind(&batch_id)
        .bind(domains.len() as i32)
        .bind(total_calls as i32)
        .bind(successful as i32)
        .bind(failed as i32)
        .execute(&self.pg_pool)
        .await?;
        
        Ok(CrawlStats {
            total_calls,
            successful,
            failed,
            duration_secs,
        })
    }
    
    async fn fetch_active_domains(&self) -> Result<Vec<Domain>> {
        let domains = sqlx::query_as::<_, Domain>(
            "SELECT id, domain FROM domains WHERE active = true ORDER BY domain"
        )
        .fetch_all(&self.pg_pool)
        .await?;
        
        Ok(domains)
    }
    
    async fn process_domain_provider(
        &self,
        domain: Domain,
        provider: Arc<dyn ProviderAdapter>,
        prompt: Prompt,
        batch_id: String,
    ) -> Result<()> {
        let _permit = self.global_semaphore.acquire().await?;
        
        let start = Instant::now();
        let mut retry_count = 0;
        let max_retries = 3;
        
        loop {
            match provider.query(&domain.domain, &prompt).await {
                Ok(response) => {
                    // Store in database
                    db::insert_response(
                        &self.pg_pool,
                        &domain.id.to_string(),
                        &format!("{}/{}", provider.name(), provider.model()),
                        &prompt.prompt_type,
                        &prompt.text,
                        &response.text,
                        response.latency_ms,
                        &batch_id,
                        retry_count,
                    ).await?;
                    
                    return Ok(());
                }
                Err(e) => {
                    retry_count += 1;
                    if retry_count >= max_retries {
                        return Err(e);
                    }
                    
                    // Exponential backoff
                    let delay = Duration::from_millis(100 * 2_u64.pow(retry_count as u32));
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }
}

#[derive(sqlx::FromRow, Clone)]
struct Domain {
    id: Uuid,
    domain: String,
}