from typing import Optional
import os, requests

class PerplexityClient:
    def __init__(self, model: str, api_key_env: str = "PERPLEXITY_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {self.key}"},
            json={
                "model": self.model,
                "messages": [{"role":"user","content": text}],
                # Perplexity-specific: includes web search
                "search_domain_filter": [],
                "return_citations": True
            },
            timeout=t,
        )
        r.raise_for_status()
        data = r.json()
        # Note: Perplexity includes citations, we return just text here
        # Full response should be preserved in responses_raw
        return data["choices"][0]["message"]["content"]