declare class CachePopulationScheduler {
    private isRunning;
    constructor();
    populateCache(): Promise<void>;
    private computeCompetitiveMemoryScore;
    private generateCacheEntry;
    private upsertCacheEntry;
    private extractBusinessFocus;
    private determineMarketPosition;
    private extractKeywords;
    private extractThemes;
    startScheduler(): void;
    runOnce(): Promise<void>;
}
export default CachePopulationScheduler;
//# sourceMappingURL=cache-population-scheduler.d.ts.map