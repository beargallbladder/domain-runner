use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Instant;

use super::{ProviderAdapter, ProviderResponse, Prompt};

pub struct OpenAIProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String, model: &str) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.to_string(),
        }
    }
}

#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[async_trait]
impl ProviderAdapter for OpenAIProvider {
    fn name(&self) -> &'static str {
        "openai"
    }
    
    fn model(&self) -> &str {
        &self.model
    }
    
    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    async fn query(&self, domain: &str, prompt: &Prompt) -> Result<ProviderResponse> {
        let full_prompt = prompt.text.replace("{domain}", domain);
        
        let request = OpenAIRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            max_tokens: 500,
            temperature: 0.7,
        };
        
        let start = Instant::now();
        
        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;
        
        let latency_ms = start.elapsed().as_millis() as u32;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("OpenAI API error: {}", error_text);
        }
        
        let api_response: OpenAIResponse = response.json().await?;
        
        let text = api_response.choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_else(|| "No response".to_string());
        
        Ok(ProviderResponse {
            text,
            latency_ms,
            retry_count: 0,
            quality_flag: Some("high_quality".to_string()),
            meta: json!({
                "provider": "openai",
                "model": self.model,
            }),
        })
    }
}