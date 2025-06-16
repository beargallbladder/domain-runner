export interface SEOMetrics {
    domain: string;
    httpStatusCode: number;
    pageLoadTime: number;
    pageSize: number;
    domNodes: number;
    httpsEnabled: boolean;
    metaTitle: boolean;
    metaDescription: boolean;
    h1Count: number;
    imageCount: number;
    schemaMarkup: string[];
    mobileViewport: boolean;
    internalLinks: number;
    externalLinks: number;
    capturedAt: Date;
}
export declare class SEOCollector {
    private lastRequest;
    private makeRequest;
    collectSEOMetrics(domain: string): Promise<SEOMetrics>;
}
//# sourceMappingURL=seo-collector.d.ts.map