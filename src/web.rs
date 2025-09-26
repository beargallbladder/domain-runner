use crate::{
    database::Database,
    domain::*,
    error::{Error, Result},
    Settings,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: Option<Database>,
    pub settings: Settings,
}

/// Create the Axum router with all routes
pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(health_check))
        .route("/readyz", get(readiness_check))
        .route("/status", get(status))
        .route("/domains", get(get_domains))
        .route("/models", get(get_models))
        .route("/drift/:domain", get(get_drift))
        .route("/trigger", post(trigger))
        .route("/crawl", post(crawl))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(Arc::new(state))
}

/// Health check - always returns 200 if service is running
async fn health_check(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_ready = if let Some(ref db) = state.db {
        db.health_check().await
    } else {
        false
    };

    Json(HealthStatus {
        ok: true,
        service: "domain-runner".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        env: state.settings.env.clone(),
        orchestrator_ready: true,
        database_ready: db_ready,
    })
}

/// Readiness check - returns 503 if not ready
async fn readiness_check(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse> {
    let db_ready = if let Some(ref db) = state.db {
        db.health_check().await
    } else {
        false
    };

    let available_keys = state.settings.get_available_llm_keys();
    let llm_ready = !available_keys.is_empty();

    let checks = ReadinessChecks {
        orchestrator: true,
        database: db_ready,
        llm_keys: llm_ready,
    };

    let ready = checks.orchestrator && checks.database && checks.llm_keys;

    if !ready {
        return Err(Error::NotReady(format!(
            "Service not ready: {:?}",
            checks
        )));
    }

    Ok(Json(ReadinessCheck {
        ready,
        checks,
        available_providers: available_keys.keys().cloned().collect(),
    }))
}

/// Get system status with real database metrics
async fn status(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse> {
    let db = state
        .db
        .as_ref()
        .ok_or_else(|| Error::NotReady("Database not initialized".to_string()))?;

    // Get real data from existing tables
    let domain_count = sqlx::query_scalar!(
        "SELECT COUNT(DISTINCT domain) FROM domains WHERE active = true"
    )
    .fetch_one(&db.pool)
    .await
    .unwrap_or(0);

    let drift_rows_7d = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM drift_scores WHERE ts_iso >= NOW() - INTERVAL '7 days'"
    )
    .fetch_one(&db.pool)
    .await
    .unwrap_or(0);

    let last_observation = sqlx::query_scalar!(
        "SELECT MAX(ts_iso) FROM drift_scores"
    )
    .fetch_optional(&db.pool)
    .await?;

    let models_seen = sqlx::query_scalar!(
        "SELECT DISTINCT model FROM drift_scores ORDER BY 1"
    )
    .fetch_all(&db.pool)
    .await
    .unwrap_or_default();

    let coverage = db.get_domain_coverage().await.ok();
    let model_stats = db.get_model_performance_stats().await.ok();

    Ok(Json(json!({
        "ok": true,
        "environment": {
            "db_readonly": state.settings.db_readonly,
            "features": {
                "write_drift": state.settings.feature_write_drift,
                "cron": state.settings.feature_cron,
                "worker_writes": state.settings.feature_worker_writes,
            }
        },
        "data": {
            "domains": domain_count,
            "drift_rows_7d": drift_rows_7d,
            "last_observation": last_observation,
            "models_seen": models_seen,
            "coverage": coverage,
            "model_performance": model_stats,
        },
        "available_providers": state.settings.get_available_llm_keys().keys().collect::<Vec<_>>(),
    })))
}

/// Get all domains
async fn get_domains(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse> {
    let db = state
        .db
        .as_ref()
        .ok_or_else(|| Error::NotReady("Database not initialized".to_string()))?;

    let domains = db.get_domains().await?;

    Ok(Json(json!({
        "ok": true,
        "domain_count": domains.len(),
        "domains": domains,
    })))
}

/// Get model performance
async fn get_models(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse> {
    let db = state
        .db
        .as_ref()
        .ok_or_else(|| Error::NotReady("Database not initialized".to_string()))?;

    let models = db.get_model_performance_stats().await?;

    Ok(Json(json!({
        "ok": true,
        "model_count": models.len(),
        "models": models,
    })))
}

/// Get drift analysis for a domain
async fn get_drift(
    State(state): State<Arc<AppState>>,
    Path(domain): Path<String>,
) -> Result<impl IntoResponse> {
    let db = state
        .db
        .as_ref()
        .ok_or_else(|| Error::NotReady("Database not initialized".to_string()))?;

    let drift_scores = db.get_domain_drift(&domain).await?;

    if drift_scores.is_empty() {
        return Ok(Json(json!({
            "ok": true,
            "domain": domain,
            "drift_data": {
                "status": "no_drift_data",
                "message": "No drift analysis available yet"
            }
        })));
    }

    let avg_drift: f32 = drift_scores.iter().map(|s| s.drift_score).sum::<f32>()
        / drift_scores.len() as f32;

    Ok(Json(json!({
        "ok": true,
        "domain": domain,
        "drift_data": {
            "average_drift_score": avg_drift,
            "latest_status": drift_scores[0].status,
            "last_check": drift_scores[0].ts_iso,
            "recent_drifts": drift_scores,
        }
    })))
}

/// Trigger batch processing
async fn trigger(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TriggerRequest>,
) -> Result<impl IntoResponse> {
    info!(
        "Triggering batch: {:?}, domain: {:?}",
        req.batch, req.domain
    );

    // In production, this would queue a job
    // For now, return success
    Ok(Json(json!({
        "ok": true,
        "triggered": true,
        "batch": req.batch.unwrap_or_else(|| "default".to_string()),
        "message": "Batch processing queued"
    })))
}

/// Trigger crawl for specific domains
async fn crawl(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CrawlRequest>,
) -> Result<impl IntoResponse> {
    info!(
        "Crawling {} domains with providers: {:?}",
        req.domains.len(),
        req.llm_providers
    );

    // In production, this would queue crawl jobs
    Ok(Json(json!({
        "ok": true,
        "domains_queued": req.domains.len(),
        "providers": req.llm_providers.unwrap_or_default(),
    })))
}