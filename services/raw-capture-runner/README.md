# RawCaptureRunner

A clean, stateless service for capturing raw LLM responses across multiple models.

## Overview

RawCaptureRunner is a service that:
1. Loads domains from a Postgres database
2. Runs each domain through a set of prompt templates
3. Captures raw responses from 8 different LLM providers
4. Stores results back in Postgres

## Deployment on Render

1. Fork/clone this repository
2. Create a new Web Service on Render
3. Connect to your repository
4. Use the following settings:
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

## Environment Variables

Set these in your Render dashboard:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
COHERE_API_KEY=...
```

The `DATABASE_URL` will be automatically set by Render when you attach the database.

## Database Setup

The database schema will be automatically created when you deploy to Render. You just need to:

1. Create a new PostgreSQL database in your Render dashboard
2. Attach it to your web service
3. The schema will be applied on first run

## Adding Domains

Insert domains you want to process:

```sql
INSERT INTO domains (domain, source) VALUES 
  ('example.com', 'manual'),
  ('sample.org', 'manual');
```

## Monitoring

Monitor your service through:
1. Render dashboard logs
2. Database queries on raw_responses
3. Cost estimates in the raw_responses table

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `npm start`

## Schema

See `schemas/tables.sql` for the complete database schema.

## Prompt Templates

See `prompts/triad-001.json` for the current prompt set.

## LLM Configuration

See `models/llm-config.json` for supported models and endpoints. 