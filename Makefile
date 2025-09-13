.PHONY: ci test lint schema coverage allowlist venv run.a1 run.pipeline.demo run.pipeline.live

export $(shell sed 's/=.*//' .env 2>/dev/null)

ci: lint schema test coverage allowlist

lint:
	ruff check .
	black --check .

schema:
	python -m pytest tests/test_schemas.py -q

test:
	pytest -q

coverage:
	coverage run -m pytest && coverage report --fail-under=90

allowlist:
	python tools/allowlist_guard.py

venv:
	python3 -m venv .venv && . .venv/bin/activate && pip install -U pip wheel && pip install -r requirements.txt

run.a1:
	. .venv/bin/activate && python agents/llm-query-runner/src/main_demo.py

run.pipeline.demo:
	. .venv/bin/activate && python orchestrator_demo.py

run.pipeline.live:
	. .venv/bin/activate && python orchestrator.py --live