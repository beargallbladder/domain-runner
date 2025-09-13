use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

use crate::config::Config;

mod openai;
mod anthropic;
mod perplexity;

pub use openai::OpenAIProvider;
pub use anthropic::AnthropicProvider;
pub use perplexity::PerplexityProvider;

#[derive(Debug, Clone)]
pub struct ProviderResponse {
    pub text: String,
    pub latency_ms: u32,
    pub retry_count: u8,
    pub quality_flag: Option<String>,
    pub meta: Value,
}

#[derive(Debug, Clone)]
pub struct Prompt {
    pub prompt_type: String,
    pub text: String,
}

#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    fn model(&self) -> &str;
    fn is_configured(&self) -> bool;
    fn supports_search_enhanced(&self) -> bool { false }
    
    async fn query(&self, domain: &str, prompt: &Prompt) -> Result<ProviderResponse>;
}

pub fn initialize_providers(config: &Config) -> Result<Vec<Arc<dyn ProviderAdapter>>> {
    let mut providers: Vec<Arc<dyn ProviderAdapter>> = Vec::new();
    
    // OpenAI
    if let Some(api_key) = &config.openai_api_key {
        providers.push(Arc::new(OpenAIProvider::new(api_key.clone(), "gpt-4o-mini")));
    }
    
    // Anthropic
    if let Some(api_key) = &config.anthropic_api_key {
        providers.push(Arc::new(AnthropicProvider::new(api_key.clone(), "claude-3-haiku-20240307")));
    }
    
    // Perplexity (search-enhanced)
    if let Some(api_key) = &config.perplexity_api_key {
        providers.push(Arc::new(PerplexityProvider::new(api_key.clone(), "llama-3.1-sonar-small-128k-online")));
        providers.push(Arc::new(PerplexityProvider::new(api_key.clone(), "sonar-pro")));
    }
    
    // Add more providers as implemented...
    
    Ok(providers)
}