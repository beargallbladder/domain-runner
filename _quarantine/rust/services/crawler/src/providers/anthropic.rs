use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Instant;

use super::{ProviderAdapter, ProviderResponse, Prompt};

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String, model: &str) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.to_string(),
        }
    }
}

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<Content>,
}

#[derive(Deserialize)]
struct Content {
    text: String,
}

#[async_trait]
impl ProviderAdapter for AnthropicProvider {
    fn name(&self) -> &'static str {
        "anthropic"
    }
    
    fn model(&self) -> &str {
        &self.model
    }
    
    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    async fn query(&self, domain: &str, prompt: &Prompt) -> Result<ProviderResponse> {
        let full_prompt = prompt.text.replace("{domain}", domain);
        
        let request = AnthropicRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            max_tokens: 500,
        };
        
        let start = Instant::now();
        
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;
        
        let latency_ms = start.elapsed().as_millis() as u32;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("Anthropic API error: {}", error_text);
        }
        
        let api_response: AnthropicResponse = response.json().await?;
        
        let text = api_response.content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_else(|| "No response".to_string());
        
        Ok(ProviderResponse {
            text,
            latency_ms,
            retry_count: 0,
            quality_flag: Some("high_quality".to_string()),
            meta: json!({
                "provider": "anthropic",
                "model": self.model,
            }),
        })
    }
}