/*!
Configuration and Settings
*/

use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    // Database
    pub database_url: String,

    // LLM API Keys
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub together_api_key: Option<String>,

    // Sentinel Configuration
    pub drift_threshold_stable: f32,
    pub drift_threshold_decayed: f32,
    pub similarity_window_days: i64,

    // LLM Configuration
    pub llm_timeout_seconds: u64,
    pub llm_max_retries: u32,
    pub llm_temperature: f32,
    pub llm_max_tokens: u32,

    // Feature Flags
    pub enable_drift_detection: bool,
    pub enable_competitive_ranking: bool,
}

impl Settings {
    pub fn load() -> anyhow::Result<Self> {
        // Load .env file if exists
        dotenvy::dotenv().ok();

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://nexus:IbzPnTJnqc8g0JbdVvBVITq5NVf4Rwu3@dpg-d3c6odj7mgec73a930n0-a.oregon-postgres.render.com/domain_runner".to_string()),

            openai_api_key: env::var("OPENAI_API_KEY").ok(),
            anthropic_api_key: env::var("ANTHROPIC_API_KEY").ok(),
            together_api_key: env::var("TOGETHER_API_KEY").ok(),

            drift_threshold_stable: env::var("DRIFT_THRESHOLD_STABLE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.3),

            drift_threshold_decayed: env::var("DRIFT_THRESHOLD_DECAYED")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.7),

            similarity_window_days: env::var("SIMILARITY_WINDOW_DAYS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(7),

            llm_timeout_seconds: env::var("LLM_TIMEOUT_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),

            llm_max_retries: env::var("LLM_MAX_RETRIES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(2),

            llm_temperature: env::var("LLM_TEMPERATURE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0),

            llm_max_tokens: env::var("LLM_MAX_TOKENS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(500),

            enable_drift_detection: env::var("ENABLE_DRIFT_DETECTION")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),

            enable_competitive_ranking: env::var("ENABLE_COMPETITIVE_RANKING")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
        })
    }
}
