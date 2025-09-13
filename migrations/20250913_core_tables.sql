CREATE TABLE IF NOT EXISTS responses_raw (
  id UUID PRIMARY KEY,
  domain TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  model TEXT NOT NULL,
  ts_iso TIMESTAMPTZ NOT NULL,
  raw TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed','timeout')),
  latency_ms INT NOT NULL,
  attempt INT NOT NULL
);
CREATE TABLE IF NOT EXISTS responses_normalized (
  id UUID PRIMARY KEY REFERENCES responses_raw(id),
  domain TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  model TEXT NOT NULL,
  ts_iso TIMESTAMPTZ NOT NULL,
  answer TEXT NOT NULL,
  confidence REAL NULL,
  citations JSONB NOT NULL DEFAULT '[]',
  normalized_status TEXT NOT NULL CHECK (normalized_status IN ('valid','malformed','empty')),
  raw_ref UUID NOT NULL REFERENCES responses_raw(id)
);
CREATE TABLE IF NOT EXISTS drift_scores (
  drift_id UUID PRIMARY KEY,
  domain TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  model TEXT NOT NULL,
  ts_iso TIMESTAMPTZ NOT NULL,
  similarity_prev REAL NOT NULL,
  drift_score REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('stable','drifting','decayed')),
  explanation TEXT
);
-- run_manifest & observation_status created already by M1; ensure present if not