# Embedding Engine

**Single Responsibility:** Generate embeddings and detect temporal drift in LLM responses.

## What It Does
- Reads responses from read replica (never touches production data)
- Generates embeddings using sentence transformers
- Calculates cosine similarity for drift detection
- Stores drift scores in database for analysis

## Architecture
```
embedding-engine/
├── embedding_runner.py     # Main entry point
├── utils/
│   ├── db.py              # Read replica connection
│   └── embeddings.py      # Sentence transformer logic
├── analysis/
│   ├── drift.py           # Temporal drift detection
│   └── similarity.py      # Cosine similarity math
└── test_offline.py        # Offline testing with synthetic data
```

## Usage
```bash
python embedding_runner.py
```

## Testing
```bash
python test_offline.py  # Run offline tests with synthetic data
```

## Database Tables
- **Reads from:** `raw_responses` (via read replica)
- **Writes to:** `drift_scores` (new table for results) 