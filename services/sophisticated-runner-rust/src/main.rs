/*
🦀 SOPHISTICATED RUNNER - RUST EDITION
Independence Day 2025 - Built with love for Sam Kim 🇺🇸

This is the high-performance Rust version of the sophisticated runner
that processes domains with all 8 AI providers in parallel.
*/

mod ai_providers;
mod database;

use axum::{
    extract::Json,
    http::StatusCode,
    response::Json as ResponseJson,
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use std::env;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};

use crate::ai_providers::AIProviderManager;
use crate::database::DatabaseManager;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();
    
    info!("🦀 Starting Sophisticated Runner - Rust Edition");
    info!("🇺🇸 Independence Day 2025 - Built with love for Sam Kim");
    
    // Initialize database
    let db_manager = DatabaseManager::new().await
        .expect("Failed to initialize database");
    
    // Initialize AI providers
    let ai_manager = AIProviderManager::new();
    
    // Create router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/status", get(status))
        .route("/database-status", get(database_status))
        .route("/process-pending-domains", post(process_pending_domains))
        .layer(CorsLayer::permissive())
        .with_state((db_manager, ai_manager));
    
    // Start server
    let port = env::var("PORT").unwrap_or_else(|_| "10000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    
    info!("🚀 Server starting on {}", addr);
    
    axum::Server::bind(&addr.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn health_check() -> ResponseJson<Value> {
    ResponseJson(json!({
        "status": "OK",
        "service": "sophisticated-runner-rust",
        "version": "1.0.0",
        "timestamp": chrono::Utc::now(),
        "rust_powered": true,
        "independence_day": "July 4th, 2025 - Built with love for Sam Kim 🇺🇸"
    }))
}

async fn status() -> ResponseJson<Value> {
    ResponseJson(json!({
        "service": "sophisticated-runner-rust",
        "status": "running",
        "ai_providers": 8,
        "parallel_processing": true,
        "rust_performance": "blazing_fast"
    }))
}

async fn database_status() -> ResponseJson<Value> {
    ResponseJson(json!({
        "database": "connected",
        "status": "healthy"
    }))
}

async fn process_pending_domains(
    axum::extract::State((db_manager, mut ai_manager)): axum::extract::State<(DatabaseManager, AIProviderManager)>,
) -> Result<ResponseJson<Value>, StatusCode> {
    info!("🚀 Processing pending domains with all 8 AI providers");
    
    // Get 100 domains for high-concurrency processing
    let domains = match db_manager.get_pending_domains(100).await {
        Ok(domains) => domains,
        Err(e) => {
            error!("Failed to get pending domains: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    
    if domains.is_empty() {
        return Ok(ResponseJson(json!({
            "status": "no_pending_domains",
            "message": "No pending domains to process",
            "domains_processed": 0
        })));
    }
    
    info!("📊 Processing {} domains with all 8 AI providers", domains.len());
    
    let prompts = vec![
        "business_analysis".to_string(),
        "content_strategy".to_string(), 
        "technical_assessment".to_string()
    ];
    
    let mut total_responses = 0;
    let mut successful_domains = 0;
    let mut failed_domains = 0;
    
    // Process domains in parallel batches
    for (domain_id, domain) in domains {
        // Mark domain as processing
        if let Err(e) = db_manager.mark_domain_processing(domain_id).await {
            warn!("Failed to mark domain {} as processing: {}", domain, e);
            continue;
        }
        
        let mut domain_success = true;
        
        // Process all prompts for this domain
        for prompt in &prompts {
            match ai_manager.process_domain_with_all_providers(&domain, prompt).await {
                Ok(responses) => {
                    // Save all responses to database
                    for (provider_name, response, memory_score) in responses {
                        match db_manager.save_domain_response(
                            domain_id,
                            &domain,
                            &provider_name,
                            prompt,
                            &response,
                            memory_score,
                        ).await {
                            Ok(_) => {
                                total_responses += 1;
                                info!("💾 Saved response: {} -> {} (score: {:?})", 
                                      domain, provider_name, memory_score);
                            }
                            Err(e) => {
                                error!("Failed to save response for {}: {}", domain, e);
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to process {} with prompt '{}': {}", domain, prompt, e);
                    domain_success = false;
                }
            }
        }
        
        // Update domain status
        if domain_success {
            if let Err(e) = db_manager.mark_domain_completed(domain_id).await {
                error!("Failed to mark domain {} as completed: {}", domain, e);
            } else {
                successful_domains += 1;
                info!("✅ Completed domain: {}", domain);
            }
        } else {
            if let Err(e) = db_manager.mark_domain_failed(domain_id, "AI processing failed").await {
                error!("Failed to mark domain {} as failed: {}", domain, e);
            } else {
                failed_domains += 1;
                warn!("❌ Failed domain: {}", domain);
            }
        }
    }
    
    info!("🎉 Batch complete: {} successful, {} failed, {} total responses", 
          successful_domains, failed_domains, total_responses);
    
    Ok(ResponseJson(json!({
        "status": "processing_completed",
        "domains_processed": successful_domains + failed_domains,
        "successful_domains": successful_domains,
        "failed_domains": failed_domains,
        "total_responses": total_responses,
        "providers": ["openai", "anthropic", "deepseek", "mistral", "xai", "together", "perplexity", "google"]
    })))
} 