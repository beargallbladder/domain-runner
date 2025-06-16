import axios from 'axios';
import { SEOCollector } from '../src/seo-collector';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SEOCollector', () => {
  let collector: SEOCollector;

  beforeEach(() => {
    collector = new SEOCollector();
    jest.clearAllMocks();
  });

  describe('collectSEOMetrics', () => {
    it('should collect basic SEO metrics successfully', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Site</title>
          <meta name="description" content="Test description">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="application/ld+json">
            {"@type": "Organization", "name": "Test"}
          </script>
        </head>
        <body>
          <h1>Main Heading</h1>
          <h1>Second Heading</h1>
          <img src="test1.jpg" alt="Test">
          <img src="test2.jpg" alt="Test2">
          <a href="/internal">Internal Link</a>
          <a href="https://external.com">External Link</a>
          <div>Content</div>
        </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const metrics = await collector.collectSEOMetrics('test.com');

      expect(metrics).toMatchObject({
        domain: 'test.com',
        httpStatusCode: 200,
        httpsEnabled: true,
        metaTitle: true,
        metaDescription: true,
        h1Count: 2,
        imageCount: 2,
        schemaMarkup: ['Organization'],
        mobileViewport: true,
        internalLinks: 1,
        externalLinks: 1
      });

      expect(metrics.pageLoadTime).toBeGreaterThan(0);
      expect(metrics.pageSize).toBeGreaterThan(0);
      expect(metrics.domNodes).toBeGreaterThan(0);
      expect(metrics.capturedAt).toBeInstanceOf(Date);
    });

    it('should handle sites without SEO elements', async () => {
      const mockHtml = '<html><body><p>No SEO</p></body></html>';

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const metrics = await collector.collectSEOMetrics('noseo.com');

      expect(metrics).toMatchObject({
        domain: 'noseo.com',
        httpStatusCode: 200,
        metaTitle: false,
        metaDescription: false,
        h1Count: 0,
        imageCount: 0,
        schemaMarkup: [],
        mobileViewport: false,
        internalLinks: 0,
        externalLinks: 0
      });
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 404,
        data: 'Not Found'
      });

      const metrics = await collector.collectSEOMetrics('notfound.com');

      expect(metrics.httpStatusCode).toBe(404);
      expect(metrics.domain).toBe('notfound.com');
    });

    it('should handle malformed schema JSON', async () => {
      const mockHtml = `
        <html>
        <head>
          <script type="application/ld+json">
            {invalid json}
          </script>
        </head>
        <body></body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const metrics = await collector.collectSEOMetrics('malformed.com');

      expect(metrics.schemaMarkup).toEqual([]);
    });

    it('should throw error when axios fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(collector.collectSEOMetrics('error.com')).rejects.toThrow('Network error');
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>'
      });

      // First request
      await collector.collectSEOMetrics('test1.com');
      
      // Second request should be delayed
      await collector.collectSEOMetrics('test2.com');
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should take at least 3 seconds (STEALTH_CONFIG.requestDelay)
      expect(elapsed).toBeGreaterThan(2900);
    });

    it('should use different user agents', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: '<html></html>'
      });

      await collector.collectSEOMetrics('test.com');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          }),
          timeout: 15000,
          validateStatus: expect.any(Function)
        })
      );
    });
  });
}); 