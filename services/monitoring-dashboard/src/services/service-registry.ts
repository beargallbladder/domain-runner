import { Logger } from 'winston';

export interface ServiceInfo {
  name: string;
  url: string;
  healthPath: string;
  type: 'web' | 'worker' | 'api';
  criticality: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  dependencies?: string[];
}

export class ServiceRegistry {
  private services: Map<string, ServiceInfo> = new Map();

  constructor(private logger: Logger) {}

  initialize() {
    // Register all known services based on render.yaml configuration
    const services: ServiceInfo[] = [
      {
        name: 'sophisticated-runner',
        url: process.env.SOPHISTICATED_RUNNER_URL || 'https://sophisticated-runner.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'critical',
        description: 'Main domain processing engine'
      },
      {
        name: 'domain-processor-v2',
        url: process.env.DOMAIN_PROCESSOR_V2_URL || 'https://domain-processor-v2.onrender.com',
        healthPath: '/api/v2/health',
        type: 'web',
        criticality: 'high',
        description: 'Domain processing API v2'
      },
      {
        name: 'llm-pagerank-public-api',
        url: process.env.PUBLIC_API_URL || 'https://llmrank.io',
        healthPath: '/health',
        type: 'api',
        criticality: 'critical',
        description: 'Public API service'
      },
      {
        name: 'seo-metrics-runner',
        url: process.env.SEO_METRICS_URL || 'https://seo-metrics-runner.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'medium',
        description: 'SEO metrics collection service'
      },
      {
        name: 'cohort-intelligence',
        url: process.env.COHORT_INTELLIGENCE_URL || 'https://cohort-intelligence.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'high',
        description: 'Cohort analysis and intelligence'
      },
      {
        name: 'industry-intelligence',
        url: process.env.INDUSTRY_INTELLIGENCE_URL || 'https://industry-intelligence.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'medium',
        description: 'Industry benchmarking and analysis'
      },
      {
        name: 'news-correlation-service',
        url: process.env.NEWS_CORRELATION_URL || 'https://news-correlation-service.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'low',
        description: 'News correlation and monitoring'
      },
      {
        name: 'swarm-intelligence',
        url: process.env.SWARM_INTELLIGENCE_URL || 'https://swarm-intelligence.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'medium',
        description: 'Distributed agent coordination'
      },
      {
        name: 'memory-oracle',
        url: process.env.MEMORY_ORACLE_URL || 'https://memory-oracle.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'medium',
        description: 'Memory and prediction engine'
      },
      {
        name: 'weekly-scheduler',
        url: process.env.WEEKLY_SCHEDULER_URL || 'https://weekly-scheduler.onrender.com',
        healthPath: '/health',
        type: 'worker',
        criticality: 'low',
        description: 'Scheduled job coordinator'
      },
      {
        name: 'visceral-intelligence',
        url: process.env.VISCERAL_INTELLIGENCE_URL || 'https://visceral-intelligence.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'medium',
        description: 'Competitive intelligence engine'
      },
      {
        name: 'reality-validator',
        url: process.env.REALITY_VALIDATOR_URL || 'https://reality-validator.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'high',
        description: 'Data validation and reality checking'
      },
      {
        name: 'predictive-analytics',
        url: process.env.PREDICTIVE_ANALYTICS_URL || 'https://predictive-analytics.onrender.com',
        healthPath: '/health',
        type: 'web',
        criticality: 'high',
        description: 'Predictive modeling and analytics'
      },
      {
        name: 'embedding-engine',
        url: process.env.EMBEDDING_ENGINE_URL || 'https://embedding-engine.onrender.com',
        healthPath: '/health',
        type: 'api',
        criticality: 'high',
        description: 'Vector embedding generation'
      },
      {
        name: 'database-manager',
        url: process.env.DATABASE_MANAGER_URL || 'https://database-manager.onrender.com',
        healthPath: '/health',
        type: 'worker',
        criticality: 'critical',
        description: 'Database maintenance and optimization'
      }
    ];

    services.forEach(service => {
      this.registerService(service);
    });

    this.logger.info(`Registered ${services.length} services`);
  }

  registerService(service: ServiceInfo) {
    this.services.set(service.name, service);
    this.logger.debug(`Registered service: ${service.name}`);
  }

  getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  getRegisteredServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getServicesByType(type: ServiceInfo['type']): ServiceInfo[] {
    return Array.from(this.services.values()).filter(s => s.type === type);
  }

  getServicesByCriticality(criticality: ServiceInfo['criticality']): ServiceInfo[] {
    return Array.from(this.services.values()).filter(s => s.criticality === criticality);
  }

  getCriticalServices(): ServiceInfo[] {
    return this.getServicesByCriticality('critical');
  }
}