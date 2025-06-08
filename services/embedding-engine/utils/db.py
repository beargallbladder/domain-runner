"""
Database utilities for embedding engine
Handles read-only access to raw capture data via read replica
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        """Initialize database connections for read-only access"""
        # Read replica for data analysis (preferred)
        self.read_replica_url = os.getenv('READ_REPLICA_URL')
        
        # Fallback to main database if no read replica
        self.main_db_url = os.getenv('DATABASE_URL')
        
        # Use read replica if available, otherwise main database
        self.read_url = self.read_replica_url or self.main_db_url
        
        # Write database for drift scores (separate table)
        self.write_url = self.main_db_url
        
        logger.info(f"🔍 Read source: {'Read Replica' if self.read_replica_url else 'Main Database'}")
        logger.info(f"💾 Write target: Main Database")
        
        # Test connections
        self._test_connections()
    
    def _test_connections(self):
        """Test database connections"""
        try:
            # Test read connection
            with psycopg2.connect(self.read_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    logger.info("✅ Read connection successful")
            
            # Test write connection
            with psycopg2.connect(self.write_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    logger.info("✅ Write connection successful")
                    
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise

    def get_read_connection(self):
        """Get read-only connection (from replica if available)"""
        return psycopg2.connect(
            self.read_url,
            cursor_factory=RealDictCursor,
            # Read-only optimizations
            options="-c default_transaction_isolation=serializable -c default_transaction_read_only=on"
        )
    
    def get_write_connection(self):
        """Get write connection (to main database)"""
        return psycopg2.connect(
            self.write_url,
            cursor_factory=RealDictCursor
        )

    def get_responses_for_analysis(self, limit: Optional[int] = None, domains: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get responses from read replica for analysis
        
        Args:
            limit: Maximum number of responses to fetch
            domains: Specific domains to analyze (None for all)
        """
        query = """
        SELECT 
            r.id,
            r.domain_id,
            r.model,
            r.prompt_type,
            r.raw_response as response_text,
            r.created_at,
            r.token_count,
            r.total_cost_usd as cost
        FROM responses r
        JOIN domains d ON r.domain_id = d.id
        WHERE d.status = 'completed'
        AND r.raw_response IS NOT NULL
        AND LENGTH(r.raw_response) > 10
        """
        
        params = []
        
        if domains:
            placeholders = ','.join(['%s'] * len(domains))
            query += f" AND r.domain_id IN ({placeholders})"
            params.extend(domains)
        
        query += " ORDER BY r.domain_id, r.model, r.prompt_type"
        
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        
        with self.get_read_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                results = cur.fetchall()
                return [dict(row) for row in results]

    def save_drift_score(self, domain: str, model_name: str, prompt_type: str, 
                        self_similarity: float, peer_similarity: float, 
                        canonical_similarity: float, drift_score: float):
        """Save drift analysis results to main database"""
        
        # Create table if it doesn't exist
        create_table_query = """
        CREATE TABLE IF NOT EXISTS drift_scores (
            id SERIAL PRIMARY KEY,
            domain VARCHAR(255) NOT NULL,
            model_name VARCHAR(255) NOT NULL,
            prompt_type VARCHAR(50) NOT NULL,
            self_similarity DECIMAL(5,4) NOT NULL,
            peer_similarity DECIMAL(5,4) NOT NULL,
            canonical_similarity DECIMAL(5,4) NOT NULL,
            drift_score DECIMAL(5,4) NOT NULL,
            analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(domain, model_name, prompt_type)
        );
        """
        
        # Insert or update drift score
        upsert_query = """
        INSERT INTO drift_scores 
            (domain, model_name, prompt_type, self_similarity, peer_similarity, canonical_similarity, drift_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (domain, model_name, prompt_type) 
        DO UPDATE SET 
            self_similarity = EXCLUDED.self_similarity,
            peer_similarity = EXCLUDED.peer_similarity,
            canonical_similarity = EXCLUDED.canonical_similarity,
            drift_score = EXCLUDED.drift_score,
            analysis_date = CURRENT_TIMESTAMP;
        """
        
        with self.get_write_connection() as conn:
            with conn.cursor() as cur:
                # Create table
                cur.execute(create_table_query)
                
                # Insert/update data
                cur.execute(upsert_query, (
                    domain, model_name, prompt_type,
                    self_similarity, peer_similarity, canonical_similarity, drift_score
                ))
                
            conn.commit()

    def get_drift_scores(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get existing drift scores from database"""
        query = """
        SELECT domain, model_name, prompt_type, 
               self_similarity, peer_similarity, canonical_similarity, drift_score,
               analysis_date
        FROM drift_scores
        """
        
        params = []
        if domain:
            query += " WHERE domain = %s"
            params.append(domain)
        
        query += " ORDER BY drift_score DESC, domain, model_name"
        
        with self.get_read_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                results = cur.fetchall()
                return [dict(row) for row in results]

# Legacy compatibility class
class EmbeddingDB:
    """Legacy wrapper for backward compatibility"""
    def __init__(self):
        self.manager = DatabaseManager()
    
    def get_responses_for_analysis(self, limit=None):
        return self.manager.get_responses_for_analysis(limit=limit)
    
    def save_drift_score(self, domain, model_name, prompt_type, self_similarity, peer_similarity, canonical_similarity, drift_score):
        return self.manager.save_drift_score(domain, model_name, prompt_type, self_similarity, peer_similarity, canonical_similarity, drift_score)

    def create_drift_scores_table(self):
        """Create the drift_scores table if it doesn't exist"""
        with self.manager.get_write_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS drift_scores (
                        id SERIAL PRIMARY KEY,
                        domain VARCHAR(255) NOT NULL,
                        model_name VARCHAR(100) NOT NULL,
                        prompt_type VARCHAR(50) NOT NULL,
                        self_similarity FLOAT,
                        peer_similarity FLOAT,
                        canonical_similarity FLOAT,
                        drift_score FLOAT NOT NULL,
                        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(domain, model_name, prompt_type)
                    );
                """)
                
                # Create indexes for performance
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_drift_scores_domain 
                    ON drift_scores(domain);
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_drift_scores_model 
                    ON drift_scores(model_name);
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_drift_scores_calculated 
                    ON drift_scores(calculated_at);
                """)
                
                conn.commit()
    
    def get_drift_scores(self, domain: Optional[str] = None, 
                        model_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get drift scores with optional filtering"""
        with self.manager.get_read_connection() as conn:
            with conn.cursor() as cursor:
                query = "SELECT * FROM drift_scores WHERE 1=1"
                params = []
                
                if domain:
                    query += " AND domain = %s"
                    params.append(domain)
                
                if model_name:
                    query += " AND model_name = %s"
                    params.append(model_name)
                
                query += " ORDER BY calculated_at DESC"
                
                cursor.execute(query, params)
                return cursor.fetchall() 