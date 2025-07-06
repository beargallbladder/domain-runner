#!/usr/bin/env ts-node
interface HealthCheckResult {
    passed: boolean;
    issues: string[];
    metrics: {
        recentResponses: number;
        activeModels: number;
        activeDomains: number;
        avgResponseLength: number;
    };
}
declare class TensorHealthChecker {
    private pool;
    constructor();
    runFullHealthCheck(): Promise<HealthCheckResult>;
    private checkDatabaseHealth;
    private checkRecentResponseVolume;
    private checkActiveModels;
    private checkActiveDomains;
    private checkResponseQuality;
    private checkInfrastructureEndpoints;
    private checkRateLimitStatus;
    close(): Promise<void>;
}
export { TensorHealthChecker, HealthCheckResult };
//# sourceMappingURL=health-checker.d.ts.map