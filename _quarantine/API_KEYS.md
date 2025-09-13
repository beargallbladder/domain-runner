# API Key Configuration

## CRITICAL: Data Protection

Our crown jewel is the **deep tensor memory data** collected over time across all 11 LLMs and 3,239 brands. This data is NOT public and must be protected.

## API Key Tiers

### 1. Partner Keys (Limited Access)
For: llmpagerank.com and approved partners
```bash
PAGERANK_API_KEY=pk_llmpagerank_[generate_secure_key]
PARTNER_API_KEY_1=pk_partner1_[generate_secure_key]
PARTNER_API_KEY_2=pk_partner2_[generate_secure_key]
```
**Access:**
- Basic rankings (top domains)
- Simple scores (no provider breakdown)
- Limited to 20 results per query
- NO tensor data
- NO drift metrics
- NO provider details

### 2. Premium Keys (brandsentiment.io)
For: Premium dashboard subscribers
```bash
SENTIMENT_API_KEY=sk_sentiment_[generate_secure_key]
```
**Access:**
- Timeline drift analysis
- Memory gap scoring
- Sentiment vs reality comparison
- Provider breakdowns
- Historical trends
- Correction campaigns
- Predictive modeling

### 3. Enterprise Keys (Full Access)
For: Data partners and enterprise clients
```bash
ENTERPRISE_API_KEY=ek_enterprise_[generate_secure_key]
ADMIN_API_KEY=ak_admin_[generate_secure_key]
```
**Access:**
- Complete tensor data
- All 11 LLM provider responses
- Raw database access
- Batch processing
- WebSocket real-time feeds
- Custom data exports

## Generate Keys

```bash
# Generate secure API keys
openssl rand -hex 32

# Example for llmpagerank.com
export PAGERANK_API_KEY=pk_llmpagerank_$(openssl rand -hex 32)
```

## Set on Render

1. Go to Render Dashboard
2. Navigate to domain-runner service
3. Go to Environment tab
4. Add these keys:

```
PAGERANK_API_KEY=pk_llmpagerank_[your_generated_key]
SENTIMENT_API_KEY=sk_sentiment_[your_generated_key]
ENTERPRISE_API_KEY=ek_enterprise_[your_generated_key]
ADMIN_API_KEY=ak_admin_[your_generated_key]
```

## Usage Examples

### llmpagerank.com (Partner Access)
```javascript
// In llmpagerank.com frontend
const API_KEY = 'pk_llmpagerank_...'; // Store securely

fetch('https://domain-runner.onrender.com/api/stats', {
  headers: {
    'X-API-Key': API_KEY
  }
});
```

### brandsentiment.io (Premium Access)
```javascript
// In brandsentiment.io
const API_KEY = 'sk_sentiment_...';

fetch('https://domain-runner.onrender.com/api/v2/timeline-drift/openai.com', {
  headers: {
    'X-API-Key': API_KEY
  }
});
```

## Security Notes

1. **NEVER expose tensor data without authentication**
2. **Partner keys get LIMITED data only**
3. **Premium keys get analytical insights**
4. **Enterprise keys get raw data access**
5. **Rate limits apply to all tiers**
6. **All requests are logged for audit**

## Current Status

- ✅ Authentication middleware implemented
- ✅ Three-tier access control
- ✅ Partner endpoints return limited data
- ⚠️ **API keys need to be generated and set on Render**
- ⚠️ **llmpagerank.com needs the PAGERANK_API_KEY**