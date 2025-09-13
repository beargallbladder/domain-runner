from typing import Optional
import os, requests

class GoogleClient:
    def __init__(self, model: str, api_key_env: str = "GOOGLE_API_KEY", timeout: int = 30):
        self.model = model
        self.key = os.environ[api_key_env]
        self.timeout = timeout

    def call(self, text: str, timeout: Optional[int] = None) -> str:
        t = timeout or self.timeout
        r = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            params={"key": self.key},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": text}]}],
                "generationConfig": {"maxOutputTokens": 512}
            },
            timeout=t,
        )
        r.raise_for_status()
        data = r.json()
        # Google returns candidates array with content
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "")
        return ""