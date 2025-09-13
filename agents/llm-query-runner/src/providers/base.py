from typing import Protocol, Optional

class LLMProvider(Protocol):
    def call(self, text: str, timeout: Optional[int] = None) -> str: ...