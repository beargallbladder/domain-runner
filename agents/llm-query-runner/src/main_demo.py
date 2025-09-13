import json, time
from runner import LLMQueryRunner
from mock_clients import MockOK

if __name__ == "__main__":
    clients = {"gpt-4o": MockOK(), "claude-3.5": MockOK()}
    runner = LLMQueryRunner(clients)
    domains = ["example.com", "openai.com"]
    prompts = [{"prompt_id": "P1", "text": "What does {domain} do?"}]
    models = ["gpt-4o", "claude-3.5"]
    rows, errs = runner.run_batch(domains, prompts, models)
    print(json.dumps({"rows": rows, "errors": errs}, indent=2))
    time.sleep(1)