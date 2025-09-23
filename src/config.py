"""
Centralized configuration loader for API keys and settings
"""
import os
import json
from dataclasses import dataclass
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class Settings:
    """Application settings from environment variables"""

    # Environment
    env: str = os.getenv("NODE_ENV", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/domain_runner")
    redis_url: Optional[str] = os.getenv("REDIS_URL")

    # LLM API Keys
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    deepseek_api_key: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
    mistral_api_key: Optional[str] = os.getenv("MISTRAL_API_KEY")
    cohere_api_key: Optional[str] = os.getenv("COHERE_API_KEY")
    ai21_api_key: Optional[str] = os.getenv("AI21_API_KEY")
    google_api_key: Optional[str] = os.getenv("GOOGLE_API_KEY")
    groq_api_key: Optional[str] = os.getenv("GROQ_API_KEY")
    together_api_key: Optional[str] = os.getenv("TOGETHER_API_KEY")
    perplexity_api_key: Optional[str] = os.getenv("PERPLEXITY_API_KEY")
    xai_api_key: Optional[str] = os.getenv("XAI_API_KEY")
    replicate_api_token: Optional[str] = os.getenv("REPLICATE_API_TOKEN")

    # Embedding configuration
    embed_provider: str = os.getenv("EMBED_PROVIDER", "openai")
    embed_model: str = os.getenv("EMBED_MODEL", "text-embedding-3-small")

    # Worker configuration
    worker_interval_sec: int = int(os.getenv("WORKER_INTERVAL_SEC", "300"))
    worker_batch_size: int = int(os.getenv("WORKER_BATCH_SIZE", "10"))
    enable_drift_monitoring: bool = os.getenv("ENABLE_DRIFT_MONITORING", "true").lower() == "true"
    enable_tensor_processing: bool = os.getenv("ENABLE_TENSOR_PROCESSING", "true").lower() == "true"

    # Crawl configuration
    crawl_concurrency: int = int(os.getenv("CRAWL_CONCURRENCY", "4"))
    timeout_ms: int = int(os.getenv("TIMEOUT_MS", "15000"))
    user_agent: str = os.getenv("USER_AGENT", "DomainRunner/1.0")

    def get_available_llm_keys(self) -> dict[str, str]:
        """Get all available LLM API keys"""
        keys = {}

        if self.openai_api_key:
            keys["openai"] = self.openai_api_key
        if self.anthropic_api_key:
            keys["anthropic"] = self.anthropic_api_key
        if self.deepseek_api_key:
            keys["deepseek"] = self.deepseek_api_key
        if self.mistral_api_key:
            keys["mistral"] = self.mistral_api_key
        if self.cohere_api_key:
            keys["cohere"] = self.cohere_api_key
        if self.ai21_api_key:
            keys["ai21"] = self.ai21_api_key
        if self.google_api_key:
            keys["google"] = self.google_api_key
        if self.groq_api_key:
            keys["groq"] = self.groq_api_key
        if self.together_api_key:
            keys["together"] = self.together_api_key
        if self.perplexity_api_key:
            keys["perplexity"] = self.perplexity_api_key
        if self.xai_api_key:
            keys["xai"] = self.xai_api_key
        if self.replicate_api_token:
            keys["replicate"] = self.replicate_api_token

        return keys

    def get_llm_key(self, provider: str) -> Optional[str]:
        """Get API key for a specific LLM provider"""
        provider_map = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "deepseek": self.deepseek_api_key,
            "mistral": self.mistral_api_key,
            "cohere": self.cohere_api_key,
            "ai21": self.ai21_api_key,
            "google": self.google_api_key,
            "groq": self.groq_api_key,
            "together": self.together_api_key,
            "perplexity": self.perplexity_api_key,
            "xai": self.xai_api_key,
            "grok": self.xai_api_key,  # Alias for xAI
            "replicate": self.replicate_api_token
        }
        return provider_map.get(provider.lower())

    def validate_keys(self, required_providers: List[str] = None) -> dict:
        """Validate that required API keys are present"""
        errors = []
        warnings = []

        # Check database URL
        if not self.database_url:
            errors.append("DATABASE_URL not configured")

        # Check for at least one LLM key
        available_keys = self.get_available_llm_keys()
        if not available_keys:
            errors.append("No LLM API keys configured")

        # Check specific required providers
        if required_providers:
            for provider in required_providers:
                if not self.get_llm_key(provider):
                    warnings.append(f"{provider.upper()}_API_KEY not configured")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "available_providers": list(available_keys.keys())
        }

# Global settings instance
settings = Settings()

# Validate on import in production
if settings.env == "production":
    validation = settings.validate_keys()
    if not validation["valid"]:
        print(f"[Config] ERROR: {', '.join(validation['errors'])}")
        # Don't raise in production, just warn
    if validation["warnings"]:
        print(f"[Config] WARNING: {', '.join(validation['warnings'])}")

    print(f"[Config] Available LLM providers: {', '.join(validation['available_providers'])}")