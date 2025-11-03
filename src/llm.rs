/*!
LLM Provider Orchestration
True async parallelism with tokio (no GIL limitations!)
*/

use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::warn;

#[derive(Debug, Clone)]
pub struct LLMResponse {
    pub model: String,
    pub provider: String,
    pub answer: String,
    pub latency_ms: u64,
}

pub struct LLMOrchestrator {
    openai_key: Option<String>,
    anthropic_key: Option<String>,
    together_key: Option<String>,
    client: Client,
}

#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
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

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
}

#[derive(Deserialize)]
struct ContentBlock {
    text: String,
}

#[derive(Serialize)]
struct TogetherRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct TogetherResponse {
    choices: Vec<Choice>,
}

impl LLMOrchestrator {
    pub fn new(
        openai_key: Option<String>,
        anthropic_key: Option<String>,
        together_key: Option<String>,
    ) -> Self {
        Self {
            openai_key,
            anthropic_key,
            together_key,
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap(),
        }
    }

    pub fn provider_count(&self) -> usize {
        let mut count = 0;
        if self.openai_key.is_some() {
            count += 1;
        }
        if self.anthropic_key.is_some() {
            count += 1;
        }
        if self.together_key.is_some() {
            count += 1;
        }
        count
    }

    pub async fn query_all(&self, prompt: &str) -> Result<Vec<LLMResponse>> {
        let mut tasks = Vec::new();

        // OpenAI
        if self.openai_key.is_some() {
            let prompt = prompt.to_string();
            let orchestrator = self.clone();
            tasks.push(tokio::spawn(async move {
                orchestrator.query_openai(&prompt).await
            }));
        }

        // Anthropic
        if self.anthropic_key.is_some() {
            let prompt = prompt.to_string();
            let orchestrator = self.clone();
            tasks.push(tokio::spawn(async move {
                orchestrator.query_anthropic(&prompt).await
            }));
        }

        // Together AI
        if self.together_key.is_some() {
            let prompt = prompt.to_string();
            let orchestrator = self.clone();
            tasks.push(tokio::spawn(async move {
                orchestrator.query_together(&prompt).await
            }));
        }

        // Await all tasks in parallel (true concurrency!)
        let results = futures::future::join_all(tasks).await;

        let mut responses = Vec::new();
        for result in results {
            match result {
                Ok(Ok(response)) => responses.push(response),
                Ok(Err(e)) => warn!("LLM query failed: {}", e),
                Err(e) => warn!("Task join error: {}", e),
            }
        }

        Ok(responses)
    }

    async fn query_openai(&self, prompt: &str) -> Result<LLMResponse> {
        let start = Instant::now();

        let request = OpenAIRequest {
            model: "gpt-4".to_string(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: "You are a helpful assistant that provides accurate information about companies and brands.".to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            temperature: 0.0,
            max_tokens: 500,
        };

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.openai_key.as_ref().unwrap()))
            .json(&request)
            .send()
            .await?
            .json::<OpenAIResponse>()
            .await?;

        let answer = response.choices.first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(LLMResponse {
            model: "gpt-4".to_string(),
            provider: "openai".to_string(),
            answer,
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }

    async fn query_anthropic(&self, prompt: &str) -> Result<LLMResponse> {
        let start = Instant::now();

        let request = AnthropicRequest {
            model: "claude-3-sonnet-20240229".to_string(),
            messages: vec![
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            max_tokens: 500,
            temperature: 0.0,
        };

        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", self.anthropic_key.as_ref().unwrap())
            .header("anthropic-version", "2023-06-01")
            .json(&request)
            .send()
            .await?
            .json::<AnthropicResponse>()
            .await?;

        let answer = response.content.first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        Ok(LLMResponse {
            model: "claude-3-sonnet-20240229".to_string(),
            provider: "anthropic".to_string(),
            answer,
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }

    async fn query_together(&self, prompt: &str) -> Result<LLMResponse> {
        let start = Instant::now();

        let request = TogetherRequest {
            model: "meta-llama/Llama-2-70b-chat-hf".to_string(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: "You are a helpful assistant.".to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            temperature: 0.0,
            max_tokens: 500,
        };

        let response = self.client
            .post("https://api.together.xyz/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.together_key.as_ref().unwrap()))
            .json(&request)
            .send()
            .await?
            .json::<TogetherResponse>()
            .await?;

        let answer = response.choices.first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(LLMResponse {
            model: "meta-llama/Llama-2-70b-chat-hf".to_string(),
            provider: "together".to_string(),
            answer,
            latency_ms: start.elapsed().as_millis() as u64,
        })
    }
}

impl Clone for LLMOrchestrator {
    fn clone(&self) -> Self {
        Self {
            openai_key: self.openai_key.clone(),
            anthropic_key: self.anthropic_key.clone(),
            together_key: self.together_key.clone(),
            client: self.client.clone(),
        }
    }
}
