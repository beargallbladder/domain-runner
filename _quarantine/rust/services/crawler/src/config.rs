use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    // Database (from Render)
    pub database_url: String,
    pub redis_url: Option<String>,
    
    // Crawler settings
    pub global_concurrency: usize,
    pub sla_target_secs: u64,
    pub sla_max_secs: u64,
    pub provider_timeout_ms: u64,
    pub cost_budget_usd: Option<f64>,
    
    // Server
    pub port: u16,
    
    // Provider API keys (all from Render env vars)
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub deepseek_api_key: Option<String>,
    pub mistral_api_key: Option<String>,
    pub cohere_api_key: Option<String>,
    pub together_api_key: Option<String>,
    pub groq_api_key: Option<String>,
    pub xai_api_key: Option<String>,
    pub google_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub ai21_api_key: Option<String>,
    pub openrouter_api_key: Option<String>,
    pub perplexity_api_key: Option<String>,
    pub you_api_key: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        // Use Render's database URL
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db?sslmode=require".to_string());
        
        Ok(Config {
            database_url,
            redis_url: std::env::var("REDIS_URL").ok(),
            
            // Crawler settings
            global_concurrency: std::env::var("GLOBAL_CONCURRENCY")
                .unwrap_or_else(|_| "64".to_string())
                .parse()?,
            sla_target_secs: std::env::var("CRAWL_SLA_TARGET_SECS")
                .unwrap_or_else(|_| "3600".to_string())
                .parse()?,
            sla_max_secs: std::env::var("CRAWL_SLA_MAX_SECS")
                .unwrap_or_else(|_| "7200".to_string())
                .parse()?,
            provider_timeout_ms: std::env::var("PROVIDER_TIMEOUT_MS")
                .unwrap_or_else(|_| "15000".to_string())
                .parse()?,
            cost_budget_usd: std::env::var("COST_BUDGET_USD")
                .ok()
                .and_then(|s| s.parse().ok()),
            
            // Server
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "10000".to_string())
                .parse()?,
            
            // Provider API keys from Render environment
            openai_api_key: std::env::var("OPENAI_API_KEY").ok(),
            anthropic_api_key: std::env::var("ANTHROPIC_API_KEY").ok(),
            deepseek_api_key: std::env::var("DEEPSEEK_API_KEY").ok(),
            mistral_api_key: std::env::var("MISTRAL_API_KEY").ok(),
            cohere_api_key: std::env::var("COHERE_API_KEY").ok(),
            together_api_key: std::env::var("TOGETHER_API_KEY").ok(),
            groq_api_key: std::env::var("GROQ_API_KEY").ok(),
            xai_api_key: std::env::var("XAI_API_KEY").ok(),
            google_api_key: std::env::var("GOOGLE_API_KEY").ok(),
            gemini_api_key: std::env::var("GEMINI_API_KEY").ok(),
            ai21_api_key: std::env::var("AI21_API_KEY").ok(),
            openrouter_api_key: std::env::var("OPENROUTER_API_KEY").ok(),
            perplexity_api_key: std::env::var("PERPLEXITY_API_KEY").ok(),
            you_api_key: std::env::var("YOU_API_KEY").ok(),
        })
    }
}