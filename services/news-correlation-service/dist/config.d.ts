export interface ServiceConfig {
    database: {
        connectionString: string;
        ssl: boolean | {
            rejectUnauthorized: boolean;
        };
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
export declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    getConfig(): ServiceConfig;
    private loadConfiguration;
    private requireEnvVar;
    setConfig(config: Partial<ServiceConfig>): void;
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
}
export declare const config: ServiceConfig;
//# sourceMappingURL=config.d.ts.map