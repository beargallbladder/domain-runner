#!/usr/bin/env ts-node
interface CrawlResult {
    success: boolean;
    completionRate: number;
    totalResponses: number;
    modelCoverage: number;
    duration: number;
    issues: string[];
}
declare class WeeklyTensorCrawler {
    private pool;
    private healthChecker;
    private progress;
    constructor();
    executeWeeklyCrawl(): Promise<CrawlResult>;
    private initializeCrawlSession;
    private resetDomainsForWeeklyCrawl;
    private executeBatchedCrawl;
    private getNextBatch;
    private processBatch;
    private waitForBatchCompletion;
    private validateCrawlCompletion;
    private generateCompletionReport;
    private logProgress;
    private sleep;
    close(): Promise<void>;
}
export { WeeklyTensorCrawler, CrawlResult };
//# sourceMappingURL=weekly-crawler.d.ts.map