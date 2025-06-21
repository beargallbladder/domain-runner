import express from 'express';
import cors from 'cors';
import { RealityEngine } from './reality-engine';
import { DatabaseManager } from './database';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new DatabaseManager();
const realityEngine = new RealityEngine(db);

// Middleware for tier-based access control
const checkTierAccess = (requiredTier: 'basic' | 'pro' | 'enterprise') => {
  return (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    const userTier = getUserTier(apiKey); // Integrate with your existing auth
    
    const tierLevels = { basic: 1, pro: 2, enterprise: 3 };
    
    if (tierLevels[userTier] >= tierLevels[requiredTier]) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Premium feature', 
        message: `Reality validation requires ${requiredTier} tier or higher`,
        upgrade_url: 'https://llmrank.io/pricing'
      });
    }
  };
};

// Helper function to determine user tier from API key
function getUserTier(apiKey: string): 'basic' | 'pro' | 'enterprise' {
  // Integrate with your existing user/subscription system
  // For now, return based on API key pattern or database lookup
  if (!apiKey) return 'basic';
  
  // Example: Check your existing users table
  // This should integrate with your current auth system
  if (apiKey.includes('enterprise')) return 'enterprise';
  if (apiKey.includes('pro')) return 'pro';
  return 'basic';
}

// Health check (always available)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reality-validator' });
});

// BASIC TIER: Standard AI intelligence (existing functionality)
app.get('/api/ai-assessment/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const aiData = await realityEngine.getAIAssessment(domain);
    res.json(aiData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI assessment' });
  }
});

// PRO TIER: Basic reality checks (limited validation)
app.get('/api/reality-check/:domain', checkTierAccess('pro'), async (req, res) => {
  try {
    const { domain } = req.params;
    const userTier = getUserTier(req.headers['x-api-key'] as string);
    
    const result = await realityEngine.performRealityCheck(domain, {
      includeFinancial: userTier === 'enterprise',
      includeRegulatory: userTier === 'enterprise', 
      includeMarket: true, // Available in pro
      includeBusiness: userTier === 'enterprise',
      limitedDepth: userTier === 'pro' // Pro gets limited depth
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform reality check' });
  }
});

// ENTERPRISE TIER: Full reality validation suite
app.get('/api/reality-check/:domain/comprehensive', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await realityEngine.performComprehensiveRealityCheck(domain);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform comprehensive reality check' });
  }
});

// ENTERPRISE TIER: Model accuracy tracking
app.get('/api/model-accuracy', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const accuracy = await realityEngine.getModelAccuracy();
    res.json(accuracy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get model accuracy' });
  }
});

// ENTERPRISE TIER: Historical divergence analysis
app.get('/api/timeline/:domain', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const { domain } = req.params;
    const timeline = await realityEngine.getDivergenceTimeline(domain);
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// ENTERPRISE TIER: Divergence alerts and monitoring
app.get('/api/divergence-alerts', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const alerts = await realityEngine.getDivergenceAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get divergence alerts' });
  }
});

// PRO TIER: Limited batch processing (max 10 domains)
app.post('/api/reality-check/batch', checkTierAccess('pro'), async (req, res) => {
  try {
    const { domains } = req.body;
    const userTier = getUserTier(req.headers['x-api-key'] as string);
    
    // Tier-based limits
    const maxDomains = userTier === 'enterprise' ? 100 : 10;
    const limitedDomains = domains.slice(0, maxDomains);
    
    if (domains.length > maxDomains) {
      res.json({
        warning: `Limited to ${maxDomains} domains for ${userTier} tier`,
        upgrade_message: 'Upgrade to Enterprise for unlimited batch processing'
      });
    }
    
    const results = await realityEngine.batchRealityCheck(limitedDomains, {
      includeFinancial: userTier === 'enterprise',
      includeRegulatory: userTier === 'enterprise',
      includeMarket: true,
      includeBusiness: userTier === 'enterprise'
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform batch reality check' });
  }
});

// ENTERPRISE TIER: High-divergence domain discovery
app.get('/api/domains/high-divergence', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const domains = await realityEngine.getHighDivergenceDomains();
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get high divergence domains' });
  }
});

// ENTERPRISE TIER: Custom reality metrics
app.post('/api/custom-reality-metrics', checkTierAccess('enterprise'), async (req, res) => {
  try {
    const { domain, metrics } = req.body;
    const result = await realityEngine.customRealityAnalysis(domain, metrics);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform custom reality analysis' });
  }
});

app.listen(port, () => {
  console.log(`Reality Validator running on port ${port}`);
  console.log('Tier-based access control enabled');
}); 