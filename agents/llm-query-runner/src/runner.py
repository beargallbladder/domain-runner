import time, uuid, hashlib
from typing import List, Dict, Any, Tuple, Optional
from providers.registry import load_runtime, build_clients
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from infra.db import write_rows

class LLMQueryRunner:
    """
    Executes (domain × prompt × model) calls using provided clients.
    Stores rows (dicts) that conform to responses_raw.schema.json.
    """

    def __init__(self, clients: Optional[Dict[str, Any]] = None, request_timeout_s=30, max_retries=3, sleep_fn=time.sleep):
        # Auto-load from runtime config if no clients provided
        if clients is None:
            runtime = load_runtime()
            clients = build_clients(runtime)
            if clients:
                print(f"[LLMQueryRunner] Active models: {', '.join(sorted(clients.keys()))}")
            else:
                print("[LLMQueryRunner] Warning: No active models (check API keys)")

        self.clients = clients or {}  # {"gpt-4o": client, "claude-3.5": client, ...}
        self.request_timeout_s = request_timeout_s
        self.max_retries = max_retries
        self.sleep = sleep_fn

    def _pk(self, domain: str, prompt_id: str, model: str, ts_iso_minute: str) -> str:
        # deterministic UUID from hash (first 32 hex chars)
        h = hashlib.sha256(f"{domain}|{prompt_id}|{model}|{ts_iso_minute}".encode()).hexdigest()
        return str(uuid.UUID(h[:32]))

    def run_batch(self, domains: List[str], prompts: List[Dict[str, str]], models: List[str]) -> Tuple[List[Dict], List[Dict]]:
        rows, errors = [], []
        ts_bucket = time.strftime("%Y-%m-%dT%H:%M:00Z", time.gmtime())
        for d in domains:
            for p in prompts:
                for m in models:
                    row, err = self._run_one(d, p, m, ts_bucket)
                    rows.append(row)
                    if err:
                        errors.append(err)
        return rows, errors

    def persist_rows(self, rows: List[Dict]):
        if not rows: return 0
        cols = ["id","domain","prompt_id","model","ts_iso","raw","status","latency_ms","attempt"]
        return write_rows("responses_raw", rows, cols)

    def _run_one(self, domain: str, prompt: Dict[str, str], model: str, ts_bucket: str) -> Tuple[Dict, Dict]:
        prompt_id = prompt["prompt_id"]
        text = prompt["text"].replace("{domain}", domain)
        attempts = 0
        start = time.time()
        status = "failed"
        raw = ""
        err = None

        # Check if model client exists
        if model not in self.clients:
            status = "skipped"
            err = {"domain": domain, "prompt_id": prompt_id, "model": model, "reason": "model_not_available", "attempt": 0}
            row = {
                "id": self._pk(domain, prompt_id, model, ts_bucket),
                "domain": domain,
                "prompt_id": prompt_id,
                "model": model,
                "ts_iso": ts_bucket,
                "raw": "",
                "status": status,
                "latency_ms": 0,
                "attempt": 0,
            }
            return row, err

        while attempts < self.max_retries:
            attempts += 1
            try:
                client = self.clients[model]
                raw = client.call(text, timeout=self.request_timeout_s)  # clients injected in tests / main
                status = "success" if raw and len(raw.strip()) > 0 else "failed"
                break
            except TimeoutError:
                status = "timeout"
                err = {"domain": domain, "prompt_id": prompt_id, "model": model, "reason": "timeout", "attempt": attempts}
                self.sleep(min(1.0 * (2 ** (attempts - 1)), 8.0))
            except Exception as e:
                status = "failed"
                err = {"domain": domain, "prompt_id": prompt_id, "model": model, "reason": str(e), "attempt": attempts}
                self.sleep(min(1.0 * (2 ** (attempts - 1)), 8.0))

        latency_ms = int((time.time() - start) * 1000)
        row = {
            "id": self._pk(domain, prompt_id, model, ts_bucket),
            "domain": domain,
            "prompt_id": prompt_id,
            "model": model,
            "ts_iso": ts_bucket,
            "raw": raw or "",
            "status": status,
            "latency_ms": latency_ms,
            "attempt": attempts,
        }
        return row, err