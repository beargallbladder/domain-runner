use crate::error::Result;
use config::{Config, ConfigError, Environment};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    // Environment
    pub env: String,
    pub port: u16,
    pub host: String,

    // Database
    pub database_url: String,

    // LLM API Keys
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub deepseek_api_key: Option<String>,
    pub mistral_api_key: Option<String>,
    pub cohere_api_key: Option<String>,
    pub ai21_api_key: Option<String>,
    pub google_api_key: Option<String>,
    pub groq_api_key: Option<String>,
    pub together_api_key: Option<String>,
    pub perplexity_api_key: Option<String>,
    pub xai_api_key: Option<String>,

    // Worker settings
    pub worker_interval_sec: u64,
    pub worker_batch_size: usize,
    pub enable_drift_monitoring: bool,
    pub enable_tensor_processing: bool,

    // Embedding settings
    pub embed_provider: String,
    pub embed_model: String,

    // Safety flags - default to read-only for production safety
    pub db_readonly: bool,
    pub feature_write_drift: bool,
    pub feature_cron: bool,
    pub feature_worker_writes: bool,
}

impl Settings {
    pub fn new() -> Result<Self> {
        // Load .env file if it exists
        dotenvy::dotenv().ok();

        let config = Config::builder()
            // Set defaults
            .set_default("env", "development")?
            .set_default("port", 8080)?
            .set_default("host", "0.0.0.0")?
            .set_default("worker_interval_sec", 300)?
            .set_default("worker_batch_size", 10)?
            .set_default("enable_drift_monitoring", true)?
            .set_default("enable_tensor_processing", true)?
            .set_default("embed_provider", "openai")?
            .set_default("embed_model", "text-embedding-3-small")?
            // Safety defaults - start in read-only mode
            .set_default("db_readonly", true)?  // DEFAULT TO SAFE
            .set_default("feature_write_drift", false)?
            .set_default("feature_cron", false)?
            .set_default("feature_worker_writes", false)?
            // Add environment variables
            .add_source(Environment::default())
            // Override with PORT if set (for Render)
            .add_source(
                Environment::with_prefix("PORT")
                    .try_parsing(true)
                    .separator("_"),
            )
            .build()?;

        let mut settings: Settings = config.try_deserialize()?;

        // Use PORT env var if set (Render compatibility)
        if let Ok(port) = std::env::var("PORT") {
            if let Ok(p) = port.parse::<u16>() {
                settings.port = p;
            }
        }

        Ok(settings)
    }

    /// Get all available LLM API keys
    pub fn get_available_llm_keys(&self) -> HashMap<String, String> {
        let mut keys = HashMap::new();

        if let Some(ref key) = self.openai_api_key {
            keys.insert("openai".to_string(), key.clone());
        }
        if let Some(ref key) = self.anthropic_api_key {
            keys.insert("anthropic".to_string(), key.clone());
        }
        if let Some(ref key) = self.deepseek_api_key {
            keys.insert("deepseek".to_string(), key.clone());
        }
        if let Some(ref key) = self.mistral_api_key {
            keys.insert("mistral".to_string(), key.clone());
        }
        if let Some(ref key) = self.cohere_api_key {
            keys.insert("cohere".to_string(), key.clone());
        }
        if let Some(ref key) = self.ai21_api_key {
            keys.insert("ai21".to_string(), key.clone());
        }
        if let Some(ref key) = self.google_api_key {
            keys.insert("google".to_string(), key.clone());
        }
        if let Some(ref key) = self.groq_api_key {
            keys.insert("groq".to_string(), key.clone());
        }
        if let Some(ref key) = self.together_api_key {
            keys.insert("together".to_string(), key.clone());
        }
        if let Some(ref key) = self.perplexity_api_key {
            keys.insert("perplexity".to_string(), key.clone());
        }
        if let Some(ref key) = self.xai_api_key {
            keys.insert("xai".to_string(), key.clone());
        }

        keys
    }

    /// Check if configuration is valid
    pub fn validate(&self) -> Result<()> {
        if self.database_url.is_empty() {
            return Err(crate::error::Error::Config(
                "DATABASE_URL not configured".to_string(),
            ));
        }

        let available_keys = self.get_available_llm_keys();
        if available_keys.is_empty() {
            tracing::warn!("No LLM API keys configured");
        } else {
            tracing::info!(
                "Available LLM providers: {:?}",
                available_keys.keys().collect::<Vec<_>>()
            );
        }

        Ok(())
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self::new().expect("Failed to load settings")
    }
}