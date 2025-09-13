/**
 * DOMAIN ADMIN ROUTES
 * 
 * RESTful API endpoints for dynamic domain management
 * Integrates with existing Express app without touching core processing logic
 * 
 * Routes:
 * POST   /admin/domains           - Add domains to processing pipeline
 * GET    /admin/domains/stats     - Get domain statistics  
 * GET    /admin/domains/cohorts   - List cohorts and their status
 * PUT    /admin/domains/cohort    - Update domain cohort assignment
 * 
 * Usage:
 * import { addDomainAdminRoutes } from './routes/domainAdmin';
 * addDomainAdminRoutes(app, domainManager);
 */

import { Express, Request, Response } from 'express';
import { DomainManager, DomainAddRequest } from '../modules/DomainManager';

export function addDomainAdminRoutes(app: Express, domainManager: DomainManager): void {
  
  /**
   * POST /admin/domains
   * 
   * Add domains to the processing pipeline
   * 
   * Body:
   * {
   *   "domains": ["example.com", "test.org"],
   *   "cohort": "ai_giants",        // optional, default: "manual"
   *   "source": "client_request",   // optional, default: "api_injection"  
   *   "priority": 2                 // optional, default: 1
   * }
   */
  app.post('/admin/domains', async (req: Request, res: Response) => {
    try {
      const request: DomainAddRequest = req.body;
      
      // Validation
      if (!request.domains || !Array.isArray(request.domains) || request.domains.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'domains array is required and must not be empty'
        });
      }

      if (request.domains.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'maximum 1000 domains per request'
        });
      }

      // Execute domain addition
      const result = await domainManager.addDomains(request);
      
      // Get updated stats for response
      const stats = await domainManager.getDomainStats(request.cohort);
      
      res.json({
        success: true,
        message: `Domain addition completed - ${result.inserted} inserted, ${result.skipped} skipped`,
        operation_id: result.operation_id,
        results: {
          inserted: result.inserted,
          skipped: result.skipped,
          errors: result.errors,
          cohort: request.cohort || 'manual'
        },
        updated_stats: stats,
        next_steps: {
          monitor_url: '/admin/domains/stats',
          processing_info: 'Domains will be automatically picked up by existing processNextBatch() cycle'
        }
      });

    } catch (error) {
      console.error('Domain addition failed:', error);
      res.status(500).json({
        success: false,
        error: 'Domain addition failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /admin/domains/stats
   * 
   * Get comprehensive domain statistics
   * 
   * Query params:
   * ?cohort=ai_giants  // optional: filter by cohort
   */
  app.get('/admin/domains/stats', async (req: Request, res: Response) => {
    try {
      const cohort = req.query.cohort as string | undefined;
      
      const stats = await domainManager.getDomainStats(cohort);
      
      res.json({
        success: true,
        stats,
        filtered_by: cohort ? { cohort } : null,
        processing_info: {
          pipeline_status: 'Active - domains automatically processed by existing system',
          read_source: 'replica database',
          refresh_rate: 'Real-time'
        }
      });

    } catch (error) {
      console.error('Stats fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch domain statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /admin/domains/cohorts
   * 
   * List all cohorts with their processing status
   */
  app.get('/admin/domains/cohorts', async (req: Request, res: Response) => {
    try {
      const cohorts = await domainManager.listCohorts();
      
      res.json({
        success: true,
        cohorts,
        summary: {
          total_cohorts: cohorts.length,
          total_domains: cohorts.reduce((sum, c) => sum + c.domain_count, 0),
          active_cohorts: cohorts.filter(c => c.pending > 0 || c.processing > 0).length
        },
        usage_examples: {
          add_to_existing: 'POST /admin/domains with "cohort": "existing_cohort_name"',
          create_new_cohort: 'POST /admin/domains with "cohort": "new_cohort_name"',
          filter_stats: 'GET /admin/domains/stats?cohort=cohort_name'
        }
      });

    } catch (error) {
      console.error('Cohorts fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cohorts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /admin/domains/cohort
   * 
   * Update cohort assignment for existing domains
   * 
   * Body:
   * {
   *   "domains": ["example.com", "test.org"],
   *   "new_cohort": "updated_cohort_name"
   * }
   */
  app.put('/admin/domains/cohort', async (req: Request, res: Response) => {
    try {
      const { domains, new_cohort } = req.body;
      
      // Validation
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'domains array is required and must not be empty'
        });
      }

      if (!new_cohort || typeof new_cohort !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'new_cohort is required and must be a string'
        });
      }

      // Execute cohort update
      const result = await domainManager.updateDomainCohort(domains, new_cohort);
      
      // Get updated cohort stats
      const updatedStats = await domainManager.getDomainStats(new_cohort);
      
      res.json({
        success: true,
        message: `Cohort updated for ${result.updated} domains`,
        results: {
          domains_updated: result.updated,
          new_cohort,
          domains_requested: domains.length
        },
        updated_cohort_stats: updatedStats
      });

    } catch (error) {
      console.error('Cohort update failed:', error);
      res.status(500).json({
        success: false,
        error: 'Cohort update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add route documentation endpoint
  app.get('/admin/domains/docs', (req: Request, res: Response) => {
    res.json({
      title: 'Domain Management API Documentation',
      description: 'Dynamic domain injection for the raw capture pipeline',
      architecture: {
        design: 'Modular, testable, preserves existing processing logic',
        database: 'Primary for writes, replica for reads',
        integration: 'Existing processNextBatch() automatically picks up new domains'
      },
      endpoints: [
        {
          method: 'POST',
          path: '/admin/domains',
          description: 'Add domains to processing pipeline',
          body: {
            domains: ['array of domain strings'],
            cohort: 'optional cohort name (default: manual)',
            source: 'optional source identifier (default: api_injection)',
            priority: 'optional priority 1-10 (default: 1)'
          }
        },
        {
          method: 'GET',
          path: '/admin/domains/stats',
          description: 'Get domain statistics',
          query: {
            cohort: 'optional cohort filter'
          }
        },
        {
          method: 'GET',
          path: '/admin/domains/cohorts',
          description: 'List all cohorts and their status'
        },
        {
          method: 'PUT',
          path: '/admin/domains/cohort',
          description: 'Update cohort assignment for domains',
          body: {
            domains: ['array of domain strings'],
            new_cohort: 'new cohort name'
          }
        }
      ],
      examples: {
        add_ai_cohort: {
          url: 'POST /admin/domains',
          body: {
            domains: ['openai.com', 'anthropic.com', 'huggingface.co'],
            cohort: 'ai_giants',
            priority: 3
          }
        },
        check_stats: {
          url: 'GET /admin/domains/stats?cohort=ai_giants'
        }
      }
    });
  });
} 