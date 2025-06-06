export interface PromptTemplate {
  id: string;
  template: string;
  category?: string;
}

export interface LLMConfig {
  provider: string;
  env_key: string;
  endpoint: string;
  model: string;
  max_tokens: number;
}

// Simplified to just store whatever the API returns
export interface TokenUsage {
  [key: string]: any;
}

export interface RawResponse {
  domain: string;
  model: string;
  prompt_template_id: string;
  interpolated_prompt: string;
  response: string;
  captured_at: Date;
  latency_ms: number;
  token_usage: TokenUsage;
  cost_estimate: number;
}

export interface Domain {
  id: string;
  domain: string;
  source?: string;
  added_at: Date;
} 