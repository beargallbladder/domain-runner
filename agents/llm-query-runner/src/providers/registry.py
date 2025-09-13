import os, yaml
from typing import Dict, Any
from .openai_client import OpenAIClient
from .anthropic_client import AnthropicClient
from .deepseek_client import DeepSeekClient
from .mistral_client import MistralClient
from .cohere_client import CohereClient
from .ai21_client import AI21Client
from .google_client import GoogleClient
from .groq_client import GroqClient
from .together_client import TogetherClient
from .perplexity_client import PerplexityClient
from .xai_client import XAIClient

CLIENTS = {
    "openai": OpenAIClient,
    "anthropic": AnthropicClient,
    "deepseek": DeepSeekClient,
    "mistral": MistralClient,
    "cohere": CohereClient,
    "ai21": AI21Client,
    "google": GoogleClient,
    "groq": GroqClient,
    "together": TogetherClient,
    "perplexity": PerplexityClient,
    "xai": XAIClient,
}

def load_runtime(path: str = "config/runtime.yml") -> Dict[str, Any]:
    # Try absolute path first, then relative to project root
    if not os.path.exists(path):
        # Try from project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        path = os.path.join(project_root, path)

    with open(path) as f:
        return yaml.safe_load(f)

def build_clients(runtime: Dict[str, Any]) -> Dict[str, Any]:
    out = {}
    for name, cfg in runtime.get("providers", {}).items():
        if not cfg.get("enabled", False):
            continue
        key_env = cfg.get("api_key_env")
        key_val = os.environ.get(key_env or "")
        if not key_val:
            print(f"[registry] {name} enabled but env {key_env} not set -> disabling")
            continue
        cls = CLIENTS.get(name)
        if not cls:
            print(f"[registry] no client for {name}")
            continue
        out[cfg.get("model", name)] = cls(
            model=cfg.get("model"),
            api_key_env=key_env,
            timeout=cfg.get("timeout_s", 30),
        )
    return out