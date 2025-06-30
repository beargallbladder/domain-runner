# Domain Runner - AI Brand Intelligence System

## MISSION CRITICAL
Process 3,183 pending domains with LLM APIs to generate brand intelligence data.

## WORKING SERVICES
- sophisticated-runner.onrender.com (HAS API KEYS ✅)
- Database: postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db

## IMMEDIATE TASK
Add domain processing endpoint to services/sophisticated-runner/src/index.ts that:
1. Fetches pending domains from database
2. Calls OpenAI/Anthropic APIs with business_analysis, content_strategy, technical_assessment prompts
3. Stores responses in domain_responses table
4. Marks domains as completed

## TARGET ENDPOINT
```typescript
app.post('/process-pending-domains', async (req, res) => {
  const pending = await pool.query('SELECT id, domain FROM domains WHERE status = $1 LIMIT 5', ['pending']);
  
  for (const row of pending.rows) {
    await processRealDomain(row.id, row.domain);
  }
  
  res.json({ processed: pending.rows.length });
});

async function processRealDomain(domainId: number, domain: string) {
  const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
  const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
  
  for (const prompt of prompts) {
    for (const model of models) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: `Analyze ${domain} for ${prompt}` }], max_tokens: 500 })
      });
      
      const data = await response.json();
      await pool.query('INSERT INTO domain_responses (domain_id, model, prompt_type, response) VALUES ($1, $2, $3, $4)', 
        [domainId, model, prompt, data.choices[0].message.content]);
    }
  }
  
  await pool.query('UPDATE domains SET status = $1 WHERE id = $2', ['completed', domainId]);
}
```

## BUILD & DEPLOY
```bash
cd services/sophisticated-runner
npm run build
git add . && git commit -m "Add domain processing"
git push origin main
```

## TEST
```bash
curl -X POST https://sophisticated-runner.onrender.com/process-pending-domains
```

## CURRENT STATUS
- 3,183 domains with status='pending' waiting to be processed
- sophisticated-runner has working API keys but only mock endpoints
- Need to add REAL domain processing logic with LLM API calls

## SUCCESS CRITERIA
- All 3,183 domains processed with real LLM responses
- Data stored in domain_responses table
- Domains marked as completed
- Continuous processing until all pending domains are done

## MONITOR
Check domain count every 30 minutes until 3,183 domains complete.

## ARCHITECTURE
- 3,183 domains pending
- 3 prompts × 15 models = 45 API calls per domain
- Target: Process 5 domains per batch
- Expected: 225 API calls per batch 