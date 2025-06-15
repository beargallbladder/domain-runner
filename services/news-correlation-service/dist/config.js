"use strict";
// ============================================================================
// 🔧 NEWS CORRELATION SERVICE CONFIGURATION
// ============================================================================
// Centralized configuration for better testability and modularity
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigManager = void 0;
class ConfigManager {
    constructor() {
        this.config = this.loadConfiguration();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getConfig() {
        return this.config;
    }
    loadConfiguration() {
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
    requireEnvVar(name) {
        const value = process.env[name];
        if (!value) {
            throw new Error(`Required environment variable ${name} is not set`);
        }
        return value;
    }
    // For testing - allows overriding config
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    // Validate configuration
    validateConfig() {
        const errors = [];
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
exports.ConfigManager = ConfigManager;
exports.config = ConfigManager.getInstance().getConfig();
//# sourceMappingURL=config.js.map