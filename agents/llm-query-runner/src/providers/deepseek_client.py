from typing import Optional
import os, requests

class DeepSeekClient:
    def __init__(self, model: str, api_key_env: str = "DEEPSEEK_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {self.key}"},
            json={"model": self.model, "messages":[{"role":"user","content": text}]},
            timeout=t,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]