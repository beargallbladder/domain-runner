use anyhow::Result;
use sqlx::PgPool;
use tracing::info;

pub async fn run_migrations(pool: &PgPool) -> Result<()> {
    info!("Running additive database migrations...");
    
    // Add missing columns to domain_responses (if not exist)
    sqlx::query(
        r#"
        ALTER TABLE domain_responses 
        ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS prompt TEXT,
        ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
        ADD COLUMN IF NOT EXISTS quality_flag VARCHAR(100) DEFAULT 'high_quality',
        ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0
        "#
    )
    .execute(pool)
    .await?;
    
    info!("✅ Updated domain_responses schema");
    
    // Add active flag to domains
    sqlx::query(
        r#"
        ALTER TABLE domains
        ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb
        "#
    )
    .execute(pool)
    .await?;
    
    info!("✅ Updated domains schema");
    
    // Create crawl_batches table if not exists
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crawl_batches (
            batch_id VARCHAR(255) PRIMARY KEY,
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            domains_processed INTEGER DEFAULT 0,
            providers_queried INTEGER DEFAULT 0,
            total_api_calls INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'running',
            metadata JSONB DEFAULT '{}'::jsonb
        )
        "#
    )
    .execute(pool)
    .await?;
    
    info!("✅ Ensured crawl_batches table exists");
    
    // Create provider_metrics table if not exists
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS provider_metrics (
            provider VARCHAR(100) PRIMARY KEY,
            total_queries INTEGER DEFAULT 0,
            success_rate FLOAT,
            avg_response_time_ms INTEGER,
            avg_sentiment_score FLOAT,
            last_updated TIMESTAMP DEFAULT NOW(),
            reliability_score FLOAT,
            cost_per_1k_tokens FLOAT
        )
        "#
    )
    .execute(pool)
    .await?;
    
    info!("✅ Ensured provider_metrics table exists");
    
    // Create indexes if not exist
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_domain_responses_model ON domain_responses(model);
        CREATE INDEX IF NOT EXISTS idx_domain_responses_created_at ON domain_responses(created_at);
        CREATE INDEX IF NOT EXISTS idx_domain_responses_batch_id ON domain_responses(batch_id);
        CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(active);
        "#
    )
    .execute(pool)
    .await?;
    
    info!("✅ Ensured indexes exist");
    
    Ok(())
}

pub async fn insert_response(
    pool: &PgPool,
    domain_id: &str,
    model: &str,
    prompt_type: &str,
    prompt: &str,
    response: &str,
    response_time_ms: u32,
    batch_id: &str,
    retry_count: u8,
) -> Result<()> {
    // Calculate basic sentiment score (simplified for now)
    let sentiment_score = calculate_sentiment(response);
    
    sqlx::query(
        r#"
        INSERT INTO domain_responses (
            domain_id, model, prompt_type, prompt, response,
            response_time_ms, batch_id, retry_count, sentiment_score,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (domain_id, model) DO UPDATE SET
            prompt_type = $3,
            prompt = $4,
            response = $5,
            response_time_ms = $6,
            batch_id = $7,
            retry_count = $8,
            sentiment_score = $9,
            created_at = NOW()
        "#
    )
    .bind(domain_id)
    .bind(model)
    .bind(prompt_type)
    .bind(prompt)
    .bind(response)
    .bind(response_time_ms as i32)
    .bind(batch_id)
    .bind(retry_count as i32)
    .bind(sentiment_score)
    .execute(pool)
    .await?;
    
    Ok(())
}

fn calculate_sentiment(response: &str) -> f32 {
    let response_lower = response.to_lowercase();
    
    // Positive indicators
    let positive_count = ["excellent", "innovative", "leader", "successful", "growth", "strong"]
        .iter()
        .filter(|word| response_lower.contains(*word))
        .count();
    
    // Negative indicators
    let negative_count = ["failing", "poor", "weak", "declining", "struggling", "controversy"]
        .iter()
        .filter(|word| response_lower.contains(*word))
        .count();
    
    // Simple scoring: 50 base + positives - negatives, clamped to 0-100
    let score = 50.0 + (positive_count as f32 * 10.0) - (negative_count as f32 * 10.0);
    score.max(0.0).min(100.0)
}