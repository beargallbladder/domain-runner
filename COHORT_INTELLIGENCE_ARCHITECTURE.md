# 🎯 COHORT INTELLIGENCE ARCHITECTURE

## 🚀 **THE VISION**
Transform LLM PageRank from domain rankings into **strategic competitive intelligence** where brands compete in multiple categories simultaneously.

**Example**: Microsoft competes in:
- Cloud Infrastructure (vs AWS, Google Cloud)
- AI Platforms (vs OpenAI, Anthropic) 
- Productivity Tools (vs Notion, Slack)
- Developer Tools (vs GitHub, GitLab)
- Enterprise Software (vs Salesforce, Oracle)

## 🏗️ **MODULAR ARCHITECTURE**

### **Service 1: Category Discovery Engine**
*New Service: `services/cohort-intelligence/`*

**Purpose**: Discover business categories for each domain
**Input**: Domain name
**Output**: List of business categories with confidence scores

```typescript
interface CategoryDiscovery {
  domain: string;
  categories: {
    name: string;
    confidence: number;
    keywords: string[];
    competitors: string[];
  }[];
}
```

### **Service 2: Competitor Discovery Engine** 
*Extend existing: `services/sophisticated-runner/CompetitorDiscoveryService`*

**Purpose**: Find all competitors for each category
**Input**: Domain + Category
**Output**: Ranked list of competitors

### **Service 3: Cohort Ranking Engine**
*New Service: `services/cohort-ranking/`*

**Purpose**: Generate category-specific rankings
**Input**: Category + Competitor list
**Output**: Ranked cohort with positions 1-10+

## 🗄️ **DATABASE SCHEMA**

```sql
-- Business categories for each domain
CREATE TABLE domain_categories (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  confidence_score FLOAT NOT NULL,
  keywords JSONB,
  discovered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(domain, category_name)
);

-- Competitor relationships
CREATE TABLE category_competitors (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  competitor_domain VARCHAR(255) NOT NULL,
  relevance_score FLOAT NOT NULL,
  source VARCHAR(50) NOT NULL,
  discovered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(domain, category_name, competitor_domain)
);

-- Cohort rankings (updated every 2 days)
CREATE TABLE cohort_rankings (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  score FLOAT NOT NULL,
  trend VARCHAR(10) DEFAULT 'stable',
  ranking_date DATE NOT NULL,
  premium_required BOOLEAN DEFAULT FALSE,
  UNIQUE(category_name, domain, ranking_date)
);
```

## 🔄 **DATA FLOW**

1. **Category Discovery**: Domain → LLM Analysis → Categories
2. **Competitor Discovery**: Domain + Category → Competitor Search  
3. **Domain Addition**: New Competitors → sophisticated-runner
4. **Cohort Ranking**: Category Domains → Score Analysis
5. **Scheduled Updates**: Every 2 days → Re-rank cohorts

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Foundation (Week 1)**
- Create `cohort-intelligence-service`
- Implement category discovery for existing 1,705 domains
- Build competitor discovery engine
- Create database schema

### **Phase 2: Integration (Week 2)**
- Connect to `sophisticated-runner` for domain addition
- Implement cohort ranking algorithm
- Build scheduling system for updates

### **Phase 3: Frontend (Week 3)**
- Update cohorts page to show category-based rankings
- Implement premium gating (hide positions 1-4)
- Add multi-category view for domains

### **Phase 4: Automation (Week 4)**
- Automated competitor discovery
- Scheduled cohort updates every 2 days
- Real-time ranking updates

## 🔒 **PREMIUM STRATEGY**

### **Free Tier**
- See positions 5-10+ in each category
- Basic category information

### **Premium Tier**
- See positions 1-4 (market leaders)
- Full competitive analysis
- Historical trend data

## 💰 **BUSINESS IMPACT**

- Premium subscriptions for top 4 positions
- Multi-category competition creates stickiness
- Competitive anxiety drives premium upgrades
- First platform to show multi-category competition

This architecture leverages your existing modular foundation while adding the killer feature that transforms your platform into a strategic competitive intelligence engine. 