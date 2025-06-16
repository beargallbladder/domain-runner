const { Pool } = require('pg');

// Simple database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class DataSanityMonitor {
  
  async checkDataQuality() {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE memory_score > 95) as suspicious_high,
          COUNT(*) FILTER (WHERE memory_score < 10) as suspicious_low,
          COUNT(*) as total,
          AVG(memory_score) as avg_score,
          MAX(updated_at) as last_update
        FROM domain_cache 
        WHERE updated_at > NOW() - INTERVAL '24 hours'
      `;
      
      const result = await pool.query(query);
      const { suspicious_high, suspicious_low, total, avg_score, last_update } = result.rows[0];
      
      // Check 1: Too many high scores (would catch 100% issue)
      const highRatio = suspicious_high / total;
      if (highRatio > 0.15) { // Alert if >15% have 95%+ scores
        await this.alert(`🚨 DATA BROKEN: ${suspicious_high}/${total} domains have >95% scores (${Math.round(highRatio * 100)}%)`);
        return false;
      }
      
      // Check 2: Average way off normal
      if (avg_score > 85 || avg_score < 40) {
        await this.alert(`🚨 DATA BROKEN: Average score is ${Math.round(avg_score)}% (should be 60-75%)`);
        return false;
      }
      
      // Check 3: No recent updates
      const hoursAgo = (Date.now() - new Date(last_update)) / (1000 * 60 * 60);
      if (hoursAgo > 12) {
        await this.alert(`🚨 DATA STALE: No cache updates in ${Math.round(hoursAgo)} hours`);
        return false;
      }
      
      console.log(`✅ Data quality OK: avg=${Math.round(avg_score)}%, high=${suspicious_high}/${total}, updated ${Math.round(hoursAgo)}h ago`);
      return true;
      
    } catch (error) {
      await this.alert(`🚨 DATA CHECK FAILED: ${error.message}`);
      return false;
    }
  }
  
  async checkSiteUp() {
    try {
      const response = await fetch('https://llmpagerank.com/api/domain/microsoft.com', { 
        timeout: 5000 
      });
      
      if (!response.ok) {
        await this.alert(`🚨 SITE DOWN: API returned ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      if (!data.memory_score) {
        await this.alert(`🚨 API BROKEN: No memory_score in response`);
        return false;
      }
      
      console.log(`✅ Site up: API responding, Microsoft score=${data.memory_score}%`);
      return true;
      
    } catch (error) {
      await this.alert(`🚨 SITE DOWN: ${error.message}`);
      return false;
    }
  }
  
  async alert(message) {
    console.error(message);
    
    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK) {
      try {
        await fetch(process.env.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error.message);
      }
    }
  }
  
  async runAllChecks() {
    console.log(`🔍 Running data sanity checks at ${new Date().toISOString()}`);
    
    const dataOK = await this.checkDataQuality();
    const siteOK = await this.checkSiteUp();
    
    if (dataOK && siteOK) {
      console.log('✅ All systems healthy');
    }
    
    return { dataOK, siteOK };
  }
}

// Run checks every 10 minutes
const monitor = new DataSanityMonitor();

setInterval(() => {
  monitor.runAllChecks();
}, 10 * 60 * 1000);

// Run immediately on startup
monitor.runAllChecks();

console.log('🚀 Data sanity monitoring started - checking every 10 minutes');

module.exports = DataSanityMonitor; 