#!/usr/bin/env ts-node
declare class TensorGuardianScheduler {
    private healthChecker;
    private weeklyCrawler;
    private anomalyDetector;
    constructor();
    start(): void;
    private executeWeeklyCrawl;
    private executeDailyHealthCheck;
    private executeAnomalyDetection;
    private executeEmergencyHealthCheck;
    private sendNotification;
    stop(): Promise<void>;
}
export { TensorGuardianScheduler };
//# sourceMappingURL=scheduler.d.ts.map