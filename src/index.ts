import * as dotenv from 'dotenv';
import { MonitoringService } from './services/monitoring';
import express, { Request, Response } from 'express';
import path from 'path';
import { query, testConnection } from './config/database';
import { Pool } from 'pg';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Schema initialization with proper column verification
async function ensureSchemaExists(): Promise<void> {
  try {
    console.log('🔍 Checking if database schema exists...');
    
    // Check if domains table has the correct structure
    try {
      await query(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
      // Check if processing_logs table exists
      await query(`SELECT event_type FROM processing_logs LIMIT 1`);
      console.log('✅ Database schema already exists with correct structure');
      return;
      
    } catch (error: any) {
      console.log(`📦 Schema issue detected (${error.code}): ${error.message}`);
      console.log('🔨 Initializing/fixing database schema...');
      
      // Try multiple possible schema file locations
      const possiblePaths = [
        path.join(__dirname, '..', 'schemas', 'schema.sql'),
        path.join(__dirname, '..', '..', 'schemas', 'schema.sql'),
        path.join(process.cwd(), 'schemas', 'schema.sql'),
        path.join('/opt/render/project/src', 'schemas', 'schema.sql'),
        path.join('/opt/render/project', 'schemas', 'schema.sql')
      ];
      
      let schemaContent: string | null = null;
      let foundPath: string | null = null;
      
      for (const schemaPath of possiblePaths) {
        console.log(`🔍 Trying schema path: ${schemaPath}`);
        if (fs.existsSync(schemaPath)) {
          schemaContent = fs.readFileSync(schemaPath, 'utf8');
          foundPath = schemaPath;
          console.log(`✅ Found schema at: ${foundPath}`);
          break;
        }
      }
      
      if (!schemaContent) {
        console.log('⚠️ Schema file not found, using embedded schema...');
        // Embedded schema as fallback
        schemaContent = `
          -- Enable UUID extension
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          -- Create domains table with full temporal tracking
          CREATE TABLE IF NOT EXISTS domains (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_processed_at TIMESTAMP WITH TIME ZONE,
            process_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            source TEXT
          );
          
          -- Create responses table with full temporal and cost tracking
          CREATE TABLE IF NOT EXISTS responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            model TEXT NOT NULL,
            prompt_type TEXT NOT NULL,
            interpolated_prompt TEXT NOT NULL,
            raw_response TEXT NOT NULL,
            token_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            token_usage JSONB,
            total_cost_usd DECIMAL(10,6),
            latency_ms INTEGER,
            captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create processing_logs table for detailed temporal monitoring
          CREATE TABLE IF NOT EXISTS processing_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            domain_id UUID REFERENCES domains(id),
            event_type TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create rate_limits table for temporal API usage tracking
          CREATE TABLE IF NOT EXISTS rate_limits (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            model TEXT NOT NULL,
            requests_per_minute INTEGER NOT NULL,
            requests_per_hour INTEGER NOT NULL,
            requests_per_day INTEGER NOT NULL,
            current_minute_count INTEGER DEFAULT 0,
            current_hour_count INTEGER DEFAULT 0,
            current_day_count INTEGER DEFAULT 0,
            last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (model)
          );
          
          -- Create prompt_templates table for template management
          CREATE TABLE IF NOT EXISTS prompt_templates (
            id TEXT PRIMARY KEY,
            template TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
      }
      
      // Drop existing tables if they exist with wrong structure
      console.log('🗑️ Dropping existing incompatible tables...');
      await query(`DROP TABLE IF EXISTS processing_logs CASCADE`);
      await query(`DROP TABLE IF EXISTS responses CASCADE`); 
      await query(`DROP TABLE IF EXISTS rate_limits CASCADE`);
      await query(`DROP TABLE IF EXISTS prompt_templates CASCADE`);
      await query(`DROP TABLE IF EXISTS domains CASCADE`);
      
      console.log('🔨 Creating fresh schema...');
      await query(schemaContent);
      
      // Verify schema was created correctly
      await query(`SELECT status, last_processed_at, process_count FROM domains LIMIT 1`);
      await query(`SELECT event_type FROM processing_logs LIMIT 1`);
      
      console.log('✅ Database schema initialized successfully!');
    }
    
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    throw error;
  }
}

// Domain seeding function
async function seedDomains(): Promise<{ inserted: number; skipped: number; total: number }> {
  // Embedded domains list (our 266 premium domains)
  const domains = [
    'google.com', 'blogger.com', 'youtube.com', 'linkedin.com', 'cloudflare.com',
    'microsoft.com', 'apple.com', 'wikipedia.org', 'wordpress.org', 'mozilla.org',
    'youtu.be', 'blogspot.com', 'googleusercontent.com', 't.me', 'europa.eu',
    'whatsapp.com', 'adobe.com', 'facebook.com', 'uol.com.br', 'istockphoto.com',
    'vimeo.com', 'vk.com', 'github.com', 'amazon.com', 'bbc.co.uk',
    'google.de', 'live.com', 'gravatar.com', 'nih.gov', 'dan.com',
    'wordpress.com', 'yahoo.com', 'cnn.com', 'dropbox.com', 'wikimedia.org',
    'creativecommons.org', 'google.com.br', 'line.me', 'googleblog.com', 'opera.com',
    'globo.com', 'brandbucket.com', 'myspace.com', 'slideshare.net', 'paypal.com',
    'tiktok.com', 'netvibes.com', 'theguardian.com', 'who.int', 'goo.gl',
    'medium.com', 'weebly.com', 'w3.org', 'gstatic.com', 'jimdofree.com',
    'cpanel.net', 'imdb.com', 'wa.me', 'feedburner.com', 'enable-javascript.com',
    'nytimes.com', 'ok.ru', 'google.es', 'dailymotion.com', 'afternic.com',
    'bloomberg.com', 'amazon.de', 'wiley.com', 'aliexpress.com', 'indiatimes.com',
    'youronlinechoices.com', 'elpais.com', 'tinyurl.com', 'yadi.sk', 'spotify.com',
    'huffpost.com', 'google.fr', 'webmd.com', 'samsung.com', 'independent.co.uk',
    'amazon.co.jp', 'amazon.co.uk', '4shared.com', 'telegram.me', 'planalto.gov.br',
    'businessinsider.com', 'ig.com.br', 'issuu.com', 'gov.br', 'wsj.com',
    'hugedomains.com', 'usatoday.com', 'scribd.com', 'gov.uk', 'googleapis.com',
    'huffingtonpost.com', 'bbc.com', 'estadao.com.br', 'nature.com', 'mediafire.com',
    'washingtonpost.com', 'forms.gle', 'namecheap.com', 'forbes.com', 'mirror.co.uk',
    'soundcloud.com', 'fb.com', 'domainmarket.com', 'ytimg.com', 'terra.com.br',
    'google.co.uk', 'shutterstock.com', 'dailymail.co.uk', 'reg.ru', 't.co',
    'cdc.gov', 'thesun.co.uk', 'wp.com', 'cnet.com', 'instagram.com',
    'researchgate.net', 'google.it', 'fandom.com', 'office.com', 'list-manage.com',
    'msn.com', 'un.org', 'ovh.com', 'mail.ru', 'bing.com',
    'hatena.ne.jp', 'shopify.com', 'bit.ly', 'reuters.com', 'booking.com',
    'discord.com', 'buydomains.com', 'nasa.gov', 'aboutads.info', 'time.com',
    'abril.com.br', 'change.org', 'nginx.org', 'twitter.com', 'archive.org',
    'cbsnews.com', 'networkadvertising.org', 'telegraph.co.uk', 'pinterest.com', 'google.co.jp',
    'pixabay.com', 'zendesk.com', 'cpanel.com', 'vistaprint.com', 'sky.com',
    'windows.net', 'alicdn.com', 'google.ca', 'lemonde.fr', 'newyorker.com',
    'webnode.page', 'surveymonkey.com', 'amazonaws.com', 'academia.edu', 'apache.org',
    'imageshack.us', 'akamaihd.net', 'nginx.com', 'discord.gg', 'thetimes.co.uk',
    'amazon.fr', 'yelp.com', 'berkeley.edu', 'google.ru', 'sedoparking.com',
    'cbc.ca', 'unesco.org', 'ggpht.com', 'privacyshield.gov', 'over-blog.com',
    'clarin.com', 'wix.com', 'whitehouse.gov', 'icann.org', 'gnu.org',
    'yandex.ru', 'francetvinfo.fr', 'gmail.com', 'mozilla.com', 'ziddu.com',
    'guardian.co.uk', 'twitch.tv', 'sedo.com', 'foxnews.com', 'rambler.ru',
    'stanford.edu', 'wikihow.com', '20minutos.es', 'sfgate.com', 'liveinternet.ru',
    '000webhost.com', 'espn.com', 'eventbrite.com', 'disney.com', 'statista.com',
    'addthis.com', 'pinterest.fr', 'lavanguardia.com', 'vkontakte.ru', 'doubleclick.net',
    'skype.com', 'sciencedaily.com', 'bloglovin.com', 'insider.com', 'sputniknews.com',
    'doi.org', 'nypost.com', 'elmundo.es', 'go.com', 'deezer.com',
    'express.co.uk', 'detik.com', 'mystrikingly.com', 'rakuten.co.jp', 'amzn.to',
    'arxiv.org', 'alibaba.com', 'fb.me', 'wikia.com', 't-online.de',
    'telegra.ph', 'mega.nz', 'usnews.com', 'plos.org', 'naver.com',
    'ibm.com', 'smh.com.au', 'dw.com', 'google.nl', 'lefigaro.fr',
    'theatlantic.com', 'nydailynews.com', 'themeforest.net', 'rtve.es', 'newsweek.com',
    'ovh.net', 'ca.gov', 'goodreads.com', 'economist.com', 'target.com',
    'marca.com', 'kickstarter.com', 'hindustantimes.com', 'weibo.com', 'huawei.com',
    'e-monsite.com', 'hubspot.com', 'npr.org', 'netflix.com', 'gizmodo.com',
    'netlify.app', 'yandex.com', 'mashable.com', 'ebay.com', 'etsy.com', 'walmart.com'
  ];

  let inserted = 0;
  let skipped = 0;
  
  for (const domain of domains) {
    try {
      const result = await query(`
        INSERT INTO domains (domain, source, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (domain) DO NOTHING
        RETURNING id
      `, [domain.trim(), 'api_seed', 'pending']);
      
      if (result.rows.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error inserting ${domain}:`, error);
    }
  }

  return { inserted, skipped, total: domains.length };
}

// Initialize monitoring
const monitoring = MonitoringService.getInstance();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Add middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'dashboard/public')));

// SEED ENDPOINT - THE MONEY SHOT! 🚀
app.post('/seed', async (req: Request, res: Response) => {
  try {
    console.log('🌱 Seeding domains via API endpoint...');
    const result = await seedDomains();
    
    // Get current stats
    const stats = await query(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_domains,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_domains,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_domains
      FROM domains
    `);

    const response = {
      success: true,
      message: '🎉 Domain seeding complete!',
      inserted: result.inserted,
      skipped: result.skipped,
      total_in_list: result.total,
      database_stats: {
        total_domains: parseInt(stats.rows[0].total_domains),
        pending: parseInt(stats.rows[0].pending_domains),
        processing: parseInt(stats.rows[0].processing_domains),
        completed: parseInt(stats.rows[0].completed_domains)
      },
      estimated_time: `~${Math.ceil(parseInt(stats.rows[0].pending_domains) / 60)} hours for first complete run`,
      processing_rate: '1 domain per minute, 3 prompts per domain'
    };

    console.log('🎉 Seeding complete!', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Seeding failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// API endpoints for metrics
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as '1h' | '24h' | '7d') || '24h';
    const stats = await monitoring.getStats(timeframe);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get recent alerts
app.get('/api/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await query(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'alert'
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(alerts.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get recent errors
app.get('/api/errors', async (req: Request, res: Response) => {
  try {
    const errors = await query(`
      SELECT details
      FROM processing_logs
      WHERE event_type = 'error'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(errors.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Simple status endpoint for domain progress
app.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'error') as errors
      FROM domains
    `);

    const recent = await query(`
      SELECT domain, status, updated_at 
      FROM domains 
      WHERE status != 'pending' 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);

    res.json({
      domain_stats: stats.rows[0],
      recent_activity: recent.rows,
      processing_rate: '1 domain per minute',
      estimated_completion: `~${Math.ceil(parseInt(stats.rows[0].pending) / 60)} hours remaining`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Initialize application
async function initializeApp(): Promise<void> {
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Ensure schema exists with proper structure
    await ensureSchemaExists();
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    
    // Start processing
    console.log('🚀 Starting domain processing...');
    processNextBatch().catch((error: unknown) => {
      const err = error as Error;
      console.error('Failed to start processing:', err);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

// Initialize the processing loop
async function processNextBatch(): Promise<void> {
  try {
    const pendingDomains = await query(`
      SELECT id, domain
      FROM domains
      WHERE status = 'pending'
      ORDER BY last_processed_at ASC NULLS FIRST
      LIMIT 1
    `);

    if (pendingDomains.rows.length > 0) {
      const domain = pendingDomains.rows[0];
      await monitoring.logDomainProcessing(domain.id, 'processing');
      
      // Process domain here
      // ... your existing processing logic ...

      await monitoring.logDomainProcessing(domain.id, 'completed');
    } else {
      console.log('📊 No pending domains found');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Processing error:', err);
    await monitoring.logError(err, { context: 'batch_processing' });
  }

  // Schedule next batch
  setTimeout(processNextBatch, 60000); // 1 minute delay
}

// Start the application
initializeApp(); 