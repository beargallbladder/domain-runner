use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Core domain entity - represents a domain we're tracking
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Domain {
    pub domain: String,
    pub category: Option<String>,
    pub priority: i32,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}

/// Response from an LLM for a domain query
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DomainResponse {
    pub id: Uuid,
    pub domain: String,
    pub llm_model: String,
    pub llm_response: String,
    pub timestamp: DateTime<Utc>,
    pub token_count: i32,
    pub response_time_ms: i32,
    pub status: ResponseStatus,
    pub prompt_type: String,
    pub embedding: Option<Vec<f32>>,
}

/// Status of a response
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "lowercase")]
pub enum ResponseStatus {
    Success,
    Failed,
    Timeout,
}

/// Drift score for a domain/model/prompt combination
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DriftScore {
    pub drift_id: Uuid,
    pub domain: String,
    pub prompt_id: String,
    pub model: String,
    pub ts_iso: DateTime<Utc>,
    pub similarity_prev: f32,
    pub drift_score: f32,
    pub status: DriftStatus,
    pub explanation: Option<String>,
}

/// Status of drift detection
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "lowercase")]
pub enum DriftStatus {
    Stable,
    Drifting,
    Decayed,
}

/// Model performance statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPerformance {
    pub llm_model: String,
    pub total_calls: i64,
    pub avg_response_time: f64,
    pub avg_tokens: f64,
    pub success_rate: f64,
    pub last_used: DateTime<Utc>,
}

/// Domain coverage metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainCoverage {
    pub expected: i64,
    pub observed: i64,
    pub coverage: f64,
}

/// System health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub ok: bool,
    pub service: String,
    pub version: String,
    pub env: String,
    pub orchestrator_ready: bool,
    pub database_ready: bool,
}

/// Readiness check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessCheck {
    pub ready: bool,
    pub checks: ReadinessChecks,
    pub available_providers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessChecks {
    pub orchestrator: bool,
    pub database: bool,
    pub llm_keys: bool,
}

/// Trigger request for batch processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerRequest {
    pub batch: Option<String>,
    pub domain: Option<String>,
    pub force_refresh: bool,
}

/// Crawl request for specific domains
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlRequest {
    pub domains: Vec<String>,
    pub llm_providers: Option<Vec<String>>,
    pub prompt_types: Option<Vec<String>>,
}

impl Default for ResponseStatus {
    fn default() -> Self {
        Self::Success
    }
}

impl Default for DriftStatus {
    fn default() -> Self {
        Self::Stable
    }
}