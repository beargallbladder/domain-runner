class MockOK:
    def call(self, text, timeout):
        return f"answer: {text[:50]}"

class MockTimeout:
    def __init__(self, n=2): self.n = n
    def call(self, text, timeout):
        self.n -= 1
        raise TimeoutError("simulated timeout")

class MockMalformed:
    def call(self, text, timeout):
        return ""  # empty / malformed