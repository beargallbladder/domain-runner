#!/bin/bash

echo "📊 CONTINUOUS CRAWL MONITOR"
echo "=========================="
echo "Press Ctrl+C to stop"
echo ""

while true; do
    clear
    echo "📊 CRAWL MONITOR - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"
    
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ 
      connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
      ssl: { rejectUnauthorized: false }
    });
    
    (async () => {
      try {
        const status = await pool.query('SELECT status, COUNT(*) FROM domains GROUP BY status ORDER BY status');
        const responses = await pool.query('SELECT COUNT(*) as total FROM domain_responses WHERE created_at > NOW() - INTERVAL \\'10 minutes\\'');
        const rate = await pool.query('SELECT COUNT(*) as recent FROM domain_responses WHERE created_at > NOW() - INTERVAL \\'1 minute\\'');
        const models = await pool.query('SELECT DISTINCT model FROM domain_responses WHERE created_at > NOW() - INTERVAL \\'10 minutes\\'');
        
        let completed = 0, pending = 0, processing = 0;
        status.rows.forEach(r => {
          console.log(r.status.toUpperCase() + ': ' + r.count);
          if (r.status === 'completed') completed = parseInt(r.count);
          if (r.status === 'pending') pending = parseInt(r.count);
          if (r.status === 'processing') processing = parseInt(r.count);
        });
        
        const total = completed + pending + processing;
        const percent = (completed / total * 100).toFixed(1);
        
        console.log('\\nPROGRESS: ' + percent + '% (' + completed + '/' + total + ')');
        console.log('\\nLast 10 min: ' + responses.rows[0].total + ' responses');
        console.log('Current rate: ' + rate.rows[0].recent + ' responses/minute');
        console.log('Active LLMs: ' + models.rows.length);
        
        if (rate.rows[0].recent > 0 && pending > 0) {
          const domainsPerMin = rate.rows[0].recent / 33; // ~33 responses per domain
          const eta = (pending / domainsPerMin / 60).toFixed(1);
          console.log('\\nETA: ~' + eta + ' hours remaining');
        }
        
        // Check if crawl is stalled
        if (processing > 0 && rate.rows[0].recent === '0') {
          console.log('\\n⚠️  WARNING: Crawl may be stalled!');
        }
        
        if (pending === 0 && processing === 0) {
          console.log('\\n✅ CRAWL COMPLETE!');
        }
        
      } catch (err) {
        console.error('Error:', err.message);
      } finally {
        await pool.end();
      }
    })();
    "
    
    echo ""
    echo "Next update in 2 minutes..."
    sleep 120
done