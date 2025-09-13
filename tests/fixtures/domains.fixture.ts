/**
 * Test fixtures for domain-related tests
 */

export const mockDomains = {
  pending: [
    {
      id: 1,
      domain: 'example1.com',
      status: 'pending',
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
    },
    {
      id: 2,
      domain: 'example2.com',
      status: 'pending',
      created_at: new Date('2025-01-02'),
      updated_at: new Date('2025-01-02'),
    },
    {
      id: 3,
      domain: 'example3.com',
      status: 'pending',
      created_at: new Date('2025-01-03'),
      updated_at: new Date('2025-01-03'),
    },
  ],
  
  completed: [
    {
      id: 4,
      domain: 'completed1.com',
      status: 'completed',
      brand_strength: 85.5,
      ai_summary: 'Leading technology company with strong market presence',
      created_at: new Date('2025-01-04'),
      updated_at: new Date('2025-01-05'),
    },
    {
      id: 5,
      domain: 'completed2.com',
      status: 'completed',
      brand_strength: 92.3,
      ai_summary: 'Innovative startup disrupting the industry',
      created_at: new Date('2025-01-05'),
      updated_at: new Date('2025-01-06'),
    },
  ],
  
  processing: [
    {
      id: 6,
      domain: 'processing1.com',
      status: 'processing',
      created_at: new Date('2025-01-06'),
      updated_at: new Date('2025-01-07'),
    },
  ],
};

export const mockDomainResponses = {
  openai: {
    domain_id: 1,
    model: 'openai/gpt-4o-mini',
    prompt_type: 'comprehensive_analysis',
    response: `
      Comprehensive analysis of example1.com:
      
      Business Model: B2B SaaS platform offering cloud-based solutions
      Market Position: Strong presence in mid-market segment
      Competitive Advantages: Advanced AI features, user-friendly interface
      Growth Potential: High, with expanding international markets
      Technical Assessment: Modern tech stack with excellent scalability
    `,
    created_at: new Date('2025-01-07'),
  },
  
  anthropic: {
    domain_id: 1,
    model: 'anthropic/claude-3-haiku',
    prompt_type: 'comprehensive_analysis',
    response: `
      Domain Analysis for example1.com:
      
      1. Business Strategy: Focus on enterprise customers with premium offerings
      2. Market Dynamics: Operating in a competitive but growing market
      3. Innovation: Continuous product development with quarterly releases
      4. Customer Base: 5000+ active customers across 30 countries
      5. Financial Health: Estimated ARR of $50M with 40% YoY growth
    `,
    created_at: new Date('2025-01-07'),
  },
  
  deepseek: {
    domain_id: 1,
    model: 'deepseek/deepseek-chat',
    prompt_type: 'comprehensive_analysis',
    response: `
      Analysis Summary for example1.com:
      
      - Core Offering: Cloud infrastructure management tools
      - Target Market: DevOps teams and IT departments
      - Pricing Strategy: Tiered subscription model
      - Key Differentiators: Automation capabilities, integration ecosystem
      - Market Outlook: Positive with increasing demand for cloud solutions
    `,
    created_at: new Date('2025-01-07'),
  },
};

export const mockCacheSnapshots = {
  strong: {
    domain: 'strong-brand.com',
    consensus_data: {
      strengths: ['Market leader', 'Strong technology', 'Excellent team'],
      weaknesses: ['High pricing', 'Limited geographic presence'],
      opportunities: ['International expansion', 'New product lines'],
      threats: ['Increasing competition', 'Market saturation'],
      overall_sentiment: 'positive',
      confidence_score: 0.92,
    },
    brand_strength: 88.5,
    competitive_position: {
      rank: 3,
      total_competitors: 150,
      category: 'Technology',
      growth_trend: 'upward',
    },
    created_at: new Date('2025-01-08'),
  },
  
  average: {
    domain: 'average-brand.com',
    consensus_data: {
      strengths: ['Stable business', 'Good customer service'],
      weaknesses: ['Slow innovation', 'Limited resources'],
      opportunities: ['Partnership potential', 'Niche markets'],
      threats: ['Larger competitors', 'Technology changes'],
      overall_sentiment: 'neutral',
      confidence_score: 0.75,
    },
    brand_strength: 65.2,
    competitive_position: {
      rank: 45,
      total_competitors: 150,
      category: 'Technology',
      growth_trend: 'stable',
    },
    created_at: new Date('2025-01-08'),
  },
};

export const mockLLMResponses = {
  success: {
    choices: [
      {
        message: {
          content: 'This is a successful LLM response with meaningful analysis content.',
        },
      },
    ],
  },
  
  anthropicSuccess: {
    content: [
      {
        text: 'This is a successful Anthropic response with detailed analysis.',
      },
    ],
  },
  
  googleSuccess: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'This is a successful Google AI response with comprehensive insights.',
            },
          ],
        },
      },
    ],
  },
  
  error: {
    error: {
      message: 'Rate limit exceeded',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
    },
  },
  
  emptyResponse: {
    choices: [],
  },
};

export const mockAPIKeys = {
  valid: {
    OPENAI_API_KEY: 'sk-test-valid-openai-key',
    ANTHROPIC_API_KEY: 'sk-test-valid-anthropic-key',
    DEEPSEEK_API_KEY: 'sk-test-valid-deepseek-key',
    MISTRAL_API_KEY: 'sk-test-valid-mistral-key',
    XAI_API_KEY: 'sk-test-valid-xai-key',
    TOGETHER_API_KEY: 'sk-test-valid-together-key',
    PERPLEXITY_API_KEY: 'sk-test-valid-perplexity-key',
    GOOGLE_API_KEY: 'sk-test-valid-google-key',
  },
  
  partial: {
    OPENAI_API_KEY: 'sk-test-valid-openai-key',
    ANTHROPIC_API_KEY: 'sk-test-valid-anthropic-key',
    // Missing other keys
  },
  
  invalid: {
    OPENAI_API_KEY: 'invalid-key',
    ANTHROPIC_API_KEY: 'invalid-key',
  },
};

export const mockDatabaseErrors = {
  connectionError: new Error('Connection to database failed'),
  
  queryTimeout: new Error('Query timeout after 10000ms'),
  
  constraintViolation: {
    code: '23505',
    detail: 'Key (domain)=(example.com) already exists.',
    message: 'duplicate key value violates unique constraint "domains_domain_key"',
  },
  
  syntaxError: new Error('syntax error at or near "INVALID"'),
  
  poolExhausted: new Error('Connection pool exhausted'),
};