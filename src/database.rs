/*!
Database Layer
Preserves existing schema, adds Sentinel drift_scores table
*/

use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::drift::DriftAnalysis;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

#[derive(Debug)]
pub struct DriftStats {
    pub total: i64,
    pub stable: i64,
    pub drifting: i64,
    pub decayed: i64,
}

impl Database {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn health_check(&self) -> bool {
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .is_ok()
    }

    pub async fn get_or_create_domain(&self, domain: &str) -> Result<Uuid, sqlx::Error> {
        // Try to get existing domain
        let existing = sqlx::query!(
            "SELECT id FROM domains WHERE domain = $1",
            domain
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = existing {
            return Ok(row.id);
        }

        // Create new domain
        let id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO domains (id, domain, status, priority, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)",
            id,
            domain,
            "pending",
            0,
            Utc::now(),
            Utc::now()
        )
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    pub async fn store_response(
        &self,
        domain_id: Uuid,
        model: &str,
        prompt_id: Uuid,
        answer: &str,
        normalized_status: &str,
    ) -> Result<(), sqlx::Error> {
        let id = Uuid::new_v4();

        sqlx::query!(
            "INSERT INTO domain_responses (id, domain_id, model, prompt_id, answer, ts_iso, normalized_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
            id,
            domain_id,
            model,
            prompt_id,
            answer,
            Utc::now(),
            normalized_status
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_baseline(
        &self,
        domain: &str,
        model: &str,
        exclude_prompt_id: Uuid,
    ) -> Result<Option<String>, sqlx::Error> {
        let result = sqlx::query!(
            r#"
            SELECT dr.answer
            FROM domain_responses dr
            JOIN domains d ON dr.domain_id = d.id
            WHERE d.domain = $1
              AND dr.model = $2
              AND dr.normalized_status = 'valid'
              AND dr.prompt_id != $3
            ORDER BY dr.ts_iso DESC
            LIMIT 1
            "#,
            domain,
            model,
            exclude_prompt_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.and_then(|r| r.answer))
    }

    pub async fn store_drift(&self, drift: &DriftAnalysis) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "INSERT INTO drift_scores (drift_id, domain, prompt_id, model, ts_iso, similarity_prev, drift_score, status, explanation)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            drift.drift_id,
            &drift.domain,
            drift.prompt_id,
            &drift.model,
            drift.timestamp,
            drift.similarity_prev as f64,
            drift.drift_score as f64,
            &drift.status,
            &drift.explanation
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_drift_stats(&self, domain: &str) -> Result<DriftStats, sqlx::Error> {
        let row = sqlx::query!(
            r#"
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'stable') as stable,
                COUNT(*) FILTER (WHERE status = 'drifting') as drifting,
                COUNT(*) FILTER (WHERE status = 'decayed') as decayed
            FROM drift_scores
            WHERE domain = $1
            "#,
            domain
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(DriftStats {
            total: row.total.unwrap_or(0),
            stable: row.stable.unwrap_or(0),
            drifting: row.drifting.unwrap_or(0),
            decayed: row.decayed.unwrap_or(0),
        })
    }

    pub async fn get_latest_drift(&self, domain: &str) -> Result<Option<DriftAnalysis>, sqlx::Error> {
        let result = sqlx::query!(
            r#"
            SELECT drift_id, domain, prompt_id, model, ts_iso, similarity_prev, drift_score, status, explanation
            FROM drift_scores
            WHERE domain = $1
            ORDER BY ts_iso DESC
            LIMIT 1
            "#,
            domain
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|r| DriftAnalysis {
            drift_id: r.drift_id,
            domain: r.domain,
            model: r.model,
            prompt_id: r.prompt_id,
            timestamp: r.ts_iso,
            similarity_prev: r.similarity_prev as f32,
            drift_score: r.drift_score as f32,
            status: r.status,
            explanation: r.explanation.unwrap_or_default(),
        }))
    }

    pub async fn update_domain_status(&self, domain_id: Uuid, status: &str) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "UPDATE domains SET status = $1, updated_at = $2 WHERE id = $3",
            status,
            Utc::now(),
            domain_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}
