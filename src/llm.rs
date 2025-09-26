use crate::error::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// LLM provider trait - explicit interface
#[async_trait]
pub trait LLMProvider: Send + Sync {
    /// Query the LLM with a prompt
    async fn query(&self, prompt: &str) -> Result<LLMResponse>;

    /// Generate embedding for text
    async fn embed(&self, text: &str) -> Result<Vec<f32>>;

    /// Get provider name
    fn name(&self) -> &str;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMResponse {
    pub text: String,
    pub tokens: usize,
    pub model: String,
}

/// Mock provider for testing
pub struct MockProvider;

#[async_trait]
impl LLMProvider for MockProvider {
    async fn query(&self, prompt: &str) -> Result<LLMResponse> {
        Ok(LLMResponse {
            text: format!("Mock response to: {}", prompt),
            tokens: 100,
            model: "mock-v1".to_string(),
        })
    }

    async fn embed(&self, _text: &str) -> Result<Vec<f32>> {
        // Return mock 5-dimensional embedding
        Ok(vec![0.1, 0.2, 0.3, 0.4, 0.5])
    }

    fn name(&self) -> &str {
        "mock"
    }
}