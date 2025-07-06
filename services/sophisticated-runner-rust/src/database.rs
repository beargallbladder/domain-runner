/*
🗄️ DATABASE MODULE - POSTGRESQL CONNECTION WITH DOMAIN PROCESSING
This module handles all database operations for the sophisticated runner
*/

use anyhow::{Result, anyhow};
use sqlx::{PgPool, Row};
use serde_json::Value;
use tracing::{info, warn, error};
use std::env;

pub struct DatabaseManager {
    pool: PgPool,
}

impl DatabaseManager {
    pub async fn new() -> Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow!("DATABASE_URL environment variable not set"))?;
        
        info!("🔗 Connecting to PostgreSQL database...");
        
        let pool = PgPool::connect(&database_url).await
            .map_err(|e| anyhow!("Failed to connect to database: {}", e))?;
        
        info!("✅ Database connection established");
        
        Ok(Self { pool })
    }
    
    /// Get pending domains for processing (high concurrency batch)
    pub async fn get_pending_domains(&self, limit: i32) -> Result<Vec<(i32, String)>> {
        let query = "
            SELECT id, domain 
            FROM domains 
            WHERE status = 'pending' 
            ORDER BY updated_at ASC 
            LIMIT $1
        ";
        
        let rows = sqlx::query(query)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;
        
        let domains: Vec<(i32, String)> = rows
            .into_iter()
            .map(|row| {
                let id: i32 = row.get("id");
                let domain: String = row.get("domain");
                (id, domain)
            })
            .collect();
        
        info!("📊 Retrieved {} pending domains for processing", domains.len());
        Ok(domains)
    }
    
    /// Update domain status to processing
    pub async fn mark_domain_processing(&self, domain_id: i32) -> Result<()> {
        let query = "
            UPDATE domains 
            SET status = 'processing', updated_at = NOW() 
            WHERE id = $1
        ";
        
        sqlx::query(query)
            .bind(domain_id)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    /// Save AI response to database
    pub async fn save_domain_response(
        &self,
        domain_id: i32,
        domain: &str,
        model: &str,
        prompt: &str,
        response: &Value,
        memory_score: Option<f64>,
    ) -> Result<()> {
        let query = "
            INSERT INTO domain_responses (
                domain_id, domain, model, prompt, response, memory_score, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ";
        
        sqlx::query(query)
            .bind(domain_id)
            .bind(domain)
            .bind(model)
            .bind(prompt)
            .bind(response)
            .bind(memory_score)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    /// Mark domain as completed
    pub async fn mark_domain_completed(&self, domain_id: i32) -> Result<()> {
        let query = "
            UPDATE domains 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = $1
        ";
        
        sqlx::query(query)
            .bind(domain_id)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    /// Mark domain as failed
    pub async fn mark_domain_failed(&self, domain_id: i32, error: &str) -> Result<()> {
        let query = "
            UPDATE domains 
            SET status = 'failed', error = $2, updated_at = NOW() 
            WHERE id = $1
        ";
        
        sqlx::query(query)
            .bind(domain_id)
            .bind(error)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    /// Get database statistics
    pub async fn get_stats(&self) -> Result<Value> {
        let domain_stats_query = "
            SELECT status, COUNT(*) as count 
            FROM domains 
            GROUP BY status
        ";
        
        let response_stats_query = "
            SELECT model, COUNT(*) as count
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY model
        ";
        
        let domain_rows = sqlx::query(domain_stats_query)
            .fetch_all(&self.pool)
            .await?;
        
        let response_rows = sqlx::query(response_stats_query)
            .fetch_all(&self.pool)
            .await?;
        
        let mut domain_stats = serde_json::Map::new();
        for row in domain_rows {
            let status: String = row.get("status");
            let count: i64 = row.get("count");
            domain_stats.insert(status, Value::Number(count.into()));
        }
        
        let mut response_stats = serde_json::Map::new();
        for row in response_rows {
            let model: String = row.get("model");
            let count: i64 = row.get("count");
            response_stats.insert(model, Value::Number(count.into()));
        }
        
        Ok(serde_json::json!({
            "domain_stats": domain_stats,
            "recent_responses": response_stats
        }))
    }
} 