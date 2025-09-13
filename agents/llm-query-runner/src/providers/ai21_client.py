from typing import Optional
import os, requests

class AI21Client:
    def __init__(self, model: str, api_key_env: str = "AI21_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            f"https://api.ai21.com/studio/v1/{self.model}/complete",
            headers={
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json"
            },
            json={"prompt": text, "maxTokens": 512},
            timeout=t,
        )
        r.raise_for_status()
        data = r.json()
        # AI21 returns completions array
        return data.get("completions", [{}])[0].get("data", {}).get("text", "")