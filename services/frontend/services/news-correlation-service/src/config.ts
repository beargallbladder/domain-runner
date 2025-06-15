// ============================================================================
// 🔧 NEWS CORRELATION SERVICE CONFIGURATION
// ============================================================================
// Centralized configuration for better testability and modularity

export interface ServiceConfig {
  database: {
    connectionString: string;
    ssl: boolean | { rejectUnauthorized: boolean };
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  newsScanning: {
    crisisKeywords: string[];
    eventTypeMapping: Record<string, string[]>;
    rssRequestTimeout: number;
    rateLimitDelayMs: number;
  };
  correlation: {
    maxEventsPerDomain: number;
    lookbackDays: number;
    beforeEventDays: number;
    afterEventDays: number;
    minCorrelationStrength: number;
  };
  scheduling: {
    processingIntervalHours: number;
    enableAutoProcessing: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ServiceConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): ServiceConfig {
    return this.config;
  }

  private loadConfiguration(): ServiceConfig {
    const env = process.env.NODE_ENV || 'development';
    
    return {
      database: {
        connectionString: this.requireEnvVar('DATABASE_URL'),
        ssl: env === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
        idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      },
      newsScanning: {
        crisisKeywords: [
          'scandal', 'investigation', 'lawsuit', 'recall', 'crisis',
          'bankruptcy', 'fraud', 'resignation', 'layoffs', 'closure',
          'whistleblower', 'regulatory action', 'FDA warning', 'SEC investigation',
          'data breach', 'cyber attack', 'hack', 'fine', 'penalty'
        ],
        eventTypeMapping: {
          'leadership': ['resignation', 'CEO', 'fired', 'stepped down', 'leaves', 'departure'],
          'scandal': ['scandal', 'fraud', 'investigation', 'whistleblower'],
          'regulatory': ['FDA', 'SEC', 'fine', 'penalty', 'regulatory', 'violation'],
          'security': ['data breach', 'hack', 'cyber attack', 'security'],
          'financial': ['bankruptcy', 'layoffs', 'losses', 'revenue', 'earnings'],
          'product': ['recall', 'defect', 'safety', 'withdrawal']
        },
        rssRequestTimeout: parseInt(process.env.RSS_REQUEST_TIMEOUT || '10000'),
        rateLimitDelayMs: parseInt(process.env.RATE_LIMIT_DELAY || '1000'),
      },
      correlation: {
        maxEventsPerDomain: parseInt(process.env.MAX_EVENTS_PER_DOMAIN || '50'),
        lookbackDays: parseInt(process.env.CORRELATION_LOOKBACK_DAYS || '30'),
        beforeEventDays: parseInt(process.env.BEFORE_EVENT_DAYS || '7'),
        afterEventDays: parseInt(process.env.AFTER_EVENT_DAYS || '7'),
        minCorrelationStrength: parseFloat(process.env.MIN_CORRELATION_STRENGTH || '0.1'),
      },
      scheduling: {
        processingIntervalHours: parseInt(process.env.PROCESSING_INTERVAL_HOURS || '6'),
        enableAutoProcessing: process.env.ENABLE_AUTO_PROCESSING !== 'false',
      }
    };
  }

  private requireEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  // For testing - allows overriding config
  public setConfig(config: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Validate configuration
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.database.connectionString) {
      errors.push('Database connection string is required');
    }

    if (this.config.correlation.lookbackDays <= 0) {
      errors.push('Correlation lookback days must be positive');
    }

    if (this.config.newsScanning.crisisKeywords.length === 0) {
      errors.push('Crisis keywords cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const config = ConfigManager.getInstance().getConfig(); 