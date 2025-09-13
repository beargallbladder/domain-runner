use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Instant;

use super::{ProviderAdapter, ProviderResponse, Prompt};

pub struct PerplexityProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl PerplexityProvider {
    pub fn new(api_key: String, model: &str) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.to_string(),
        }
    }
}

#[derive(Serialize)]
struct PerplexityRequest {
    model: String,
    messages: Vec<Message>,
}

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct PerplexityResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[async_trait]
impl ProviderAdapter for PerplexityProvider {
    fn name(&self) -> &'static str {
        "perplexity"
    }
    
    fn model(&self) -> &str {
        &self.model
    }
    
    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    fn supports_search_enhanced(&self) -> bool {
        true // Perplexity has real-time web access
    }
    
    async fn query(&self, domain: &str, prompt: &Prompt) -> Result<ProviderResponse> {
        let full_prompt = prompt.text.replace("{domain}", domain);
        
        let request = PerplexityRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
        };
        
        let start = Instant::now();
        
        let response = self.client
            .post("https://api.perplexity.ai/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;
        
        let latency_ms = start.elapsed().as_millis() as u32;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("Perplexity API error: {}", error_text);
        }
        
        let api_response: PerplexityResponse = response.json().await?;
        
        let text = api_response.choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_else(|| "No response".to_string());
        
        Ok(ProviderResponse {
            text,
            latency_ms,
            retry_count: 0,
            quality_flag: Some("search_enhanced".to_string()),
            meta: json!({
                "provider": "perplexity",
                "model": self.model,
                "search_enhanced": true,
            }),
        })
    }
}