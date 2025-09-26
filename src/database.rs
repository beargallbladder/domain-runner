use crate::domain::*;
use crate::error::Result;
use chrono::{DateTime, Utc};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Clone)]
pub struct Database {
    pool: Pool<Postgres>,
}

impl Database {
    /// Create new database connection pool with retry logic
    pub async fn new(database_url: &str) -> Result<Self> {
        let max_retries = 10;
        let retry_delay = Duration::from_secs(5);

        for attempt in 1..=max_retries {
            match PgPoolOptions::new()
                .max_connections(20)
                .min_connections(2)
                .connect_timeout(Duration::from_secs(10))
                .connect(database_url)
                .await
            {
                Ok(pool) => {
                    info!("Database connected on attempt {}", attempt);
                    return Ok(Self { pool });
                }
                Err(e) if attempt < max_retries => {
                    warn!(
                        "Database connection failed (attempt {}/{}): {}, retrying in {:?}",
                        attempt, max_retries, e, retry_delay
                    );
                    tokio::time::sleep(retry_delay).await;
                }
                Err(e) => {
                    error!("Database connection failed after {} attempts: {}", max_retries, e);
                    return Err(e.into());
                }
            }
        }

        unreachable!()
    }

    /// Run migrations
    pub async fn migrate(&self) -> Result<()> {
        sqlx::migrate!("./migrations").run(&self.pool).await?;
        info!("Database migrations applied");
        Ok(())
    }

    /// Get domain responses
    pub async fn get_domain_responses(
        &self,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<DomainResponse>> {
        let mut query = sqlx::query_as::<_, DomainResponse>(
            r#"
            SELECT dr.*
            FROM domain_responses dr
            WHERE ($1::timestamptz IS NULL OR dr.timestamp >= $1)
              AND ($2::timestamptz IS NULL OR dr.timestamp <= $2)
            ORDER BY dr.timestamp DESC
            LIMIT $3
            "#,
        );

        query = query.bind(start_date).bind(end_date).bind(limit);

        Ok(query.fetch_all(&self.pool).await?)
    }

    /// Get model performance statistics
    pub async fn get_model_performance_stats(&self) -> Result<Vec<ModelPerformance>> {
        let stats = sqlx::query_as!(
            ModelPerformance,
            r#"
            SELECT
                llm_model,
                COUNT(*) as "total_calls!",
                AVG(response_time_ms) as "avg_response_time!",
                AVG(token_count) as "avg_tokens!",
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float8 / COUNT(*) as "success_rate!",
                MAX(timestamp) as "last_used!"
            FROM domain_responses
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY llm_model
            ORDER BY total_calls DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(stats)
    }

    /// Get domain coverage metrics
    pub async fn get_domain_coverage(&self) -> Result<DomainCoverage> {
        let coverage = sqlx::query_as!(
            DomainCoverage,
            r#"
            WITH expected_domains AS (
                SELECT COUNT(DISTINCT domain) as total
                FROM domains
                WHERE active = true
            ),
            observed_domains AS (
                SELECT COUNT(DISTINCT domain) as total
                FROM domain_responses
                WHERE timestamp > NOW() - INTERVAL '24 hours'
                AND status = 'success'
            )
            SELECT
                ed.total as "expected!",
                od.total as "observed!",
                CASE
                    WHEN ed.total > 0
                    THEN od.total::float8 / ed.total
                    ELSE 0
                END as "coverage!"
            FROM expected_domains ed, observed_domains od
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(coverage)
    }

    /// Get drift scores for a domain
    pub async fn get_domain_drift(&self, domain: &str) -> Result<Vec<DriftScore>> {
        let scores = sqlx::query_as!(
            DriftScore,
            r#"
            SELECT
                drift_id,
                domain,
                prompt_id,
                model,
                ts_iso,
                similarity_prev,
                drift_score,
                status as "status: DriftStatus",
                explanation
            FROM drift_scores
            WHERE domain = $1
            ORDER BY ts_iso DESC
            LIMIT 10
            "#,
            domain
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(scores)
    }

    /// Get all domains with their status
    pub async fn get_domains(&self) -> Result<Vec<Domain>> {
        let domains = sqlx::query_as!(
            Domain,
            r#"
            SELECT
                domain,
                category,
                priority,
                active,
                created_at
            FROM domains
            WHERE active = true
            ORDER BY priority DESC, domain
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(domains)
    }

    /// Save a domain response
    pub async fn save_domain_response(&self, response: &DomainResponse) -> Result<Uuid> {
        let id = sqlx::query_scalar!(
            r#"
            INSERT INTO domain_responses (
                id, domain, llm_model, llm_response, timestamp,
                token_count, response_time_ms, status, prompt_type, embedding
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
            "#,
            response.id,
            response.domain,
            response.llm_model,
            response.llm_response,
            response.timestamp,
            response.token_count,
            response.response_time_ms,
            response.status as ResponseStatus,
            response.prompt_type,
            response.embedding.as_deref()
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(id)
    }

    /// Save drift score
    pub async fn save_drift_score(&self, drift: &DriftScore) -> Result<Uuid> {
        let id = sqlx::query_scalar!(
            r#"
            INSERT INTO drift_scores (
                drift_id, domain, prompt_id, model, ts_iso,
                similarity_prev, drift_score, status, explanation
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING drift_id
            "#,
            drift.drift_id,
            drift.domain,
            drift.prompt_id,
            drift.model,
            drift.ts_iso,
            drift.similarity_prev,
            drift.drift_score,
            drift.status as DriftStatus,
            drift.explanation
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(id)
    }

    /// Check if database is healthy
    pub async fn health_check(&self) -> bool {
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .is_ok()
    }
}