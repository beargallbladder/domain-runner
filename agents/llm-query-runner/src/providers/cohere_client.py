from typing import Optional
import os, requests

class CohereClient:
    def __init__(self, model: str, api_key_env: str = "COHERE_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            "https://api.cohere.ai/v1/generate",
            headers={
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json"
            },
            json={"model": self.model, "prompt": text, "max_tokens": 512},
            timeout=t,
        )
        r.raise_for_status()
        data = r.json()
        # Cohere returns generations array
        return data.get("generations", [{}])[0].get("text", "")