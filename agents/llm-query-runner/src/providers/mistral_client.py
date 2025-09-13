from typing import Optional
import os, requests

class MistralClient:
    def __init__(self, model: str, api_key_env: str = "MISTRAL_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.key}"},
            json={"model": self.model, "messages": [{"role":"user","content": text}]},
            timeout=t,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]