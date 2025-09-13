from typing import Optional
import os, requests

class AnthropicClient:
    def __init__(self, model: str, api_key_env: str = "ANTHROPIC_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={"model": self.model, "max_tokens": 512, "messages":[{"role":"user","content": text}]},
            timeout=t,
        )
        r.raise_for_status()
        data = r.json()
        # Anthropic returns list of content blocks; take concatenated text
        content = "".join([c.get("text","") for c in data.get("content", [])])
        return content