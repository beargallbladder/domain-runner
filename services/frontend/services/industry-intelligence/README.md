# Industry Intelligence Service

**Foundational service for industry mapping, benchmark analysis, and strategic domain targeting.**

## 🎯 Purpose

This is the **foundational platform** that provides:

- Industry classification and mapping
- JOLT benchmark management (ground truth for brand transitions)
- Comparative analysis against known benchmarks
- Strategic domain targeting recommendations

## 🏗️ Architecture

```
services/industry-intelligence/
├── config/
│   ├── industry-mapping.json    # Industry definitions & criteria
│   └── jolt-benchmarks.json     # Known brand transition benchmarks
├── src/
│   ├── types.ts                 # TypeScript interfaces
│   ├── IndustryIntelligenceService.ts  # Core service class
│   └── index.ts                 # Express API server
├── test/
│   ├── foundation.test.ts       # Jest unit tests
│   └── test-foundation.sh       # Integration test script
└── render.yaml                  # Deployment configuration
```

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Test the foundation
chmod +x test/test-foundation.sh
npm run test:foundation
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:foundation

# Validate everything
npm run validate
```

## 📊 API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /` - Service information

### Industries
- `GET /industries` - All industry configurations
- `GET /industries/{key}` - Specific industry details

### JOLT Benchmarks  
- `GET /benchmarks` - All JOLT benchmarks
- `GET /benchmarks/industry/{key}` - Industry-specific benchmarks
- `GET /jolt/domains` - All JOLT domain list
- `GET /jolt/check/{domain}` - Check if domain is JOLT

### Analysis
- `POST /analysis/compare` - Compare domain to benchmarks

## 🔬 JOLT System

**JOLT** = **J**ump **O**r **L**oss **T**ransition events that serve as ground truth benchmarks.

Current JOLT cases:
- `facebook.com` → Meta rebrand (2021)
- `google.com` → Alphabet restructure (2015)  
- `twitter.com` → X rebrand (2023)
- `weightwatchers.com` → WW simplification (2018)
- `dunkindonuts.com` → Dunkin simplification (2018)

## 🎛️ Configuration

### Adding New Industries
Edit `config/industry-mapping.json`:
```json
{
  "industries": {
    "new_industry": {
      "name": "New Industry",
      "sectors": ["sector1", "sector2"],
      "market_cap_threshold": 1000000000,
      "volatility": "medium",
      "rebrand_frequency": "low",
      "ai_relevance": "high"
    }
  }
}
```

### Adding New JOLT Cases
Edit `config/jolt-benchmarks.json`:
```json
{
  "jolt_benchmarks": {
    "new_case": {
      "old_domain": "old.com",
      "new_domain": "new.com", 
      "industry": "technology",
      "transition_date": "2024-01-01",
      "type": "brand_transition",
      "severity": "high"
    }
  }
}
```

## 🚀 Deployment

Deploy to Render:
```bash
# Automatic deployment via render.yaml
git push origin main
```

## 🔗 Integration

Other services can consume this foundation:

```typescript
// Example: sophisticated-runner integration
const joltDomains = await fetch('https://industry-intelligence.onrender.com/jolt/domains');
const isJolt = await fetch('https://industry-intelligence.onrender.com/jolt/check/facebook.com');
```

## 📈 Next Steps

This foundation enables:
1. **Feature Layer**: Strategic targeting algorithms
2. **Analysis Layer**: Advanced comparative intelligence  
3. **Automation Layer**: Dynamic JOLT detection
4. **Integration Layer**: API consumption by other services

---

**Foundation Status**: ✅ **Complete and Testable**  
**Ready for**: Feature development and service integration 