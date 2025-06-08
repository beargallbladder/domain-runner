import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional

class EmbeddingDB:
    def __init__(self):
        # Use read replica for data access
        self.read_conn_string = os.getenv('READ_REPLICA_URL') or os.getenv('DATABASE_URL')
        # Use primary for writes
        self.write_conn_string = os.getenv('DATABASE_URL')
        
        if not self.read_conn_string or not self.write_conn_string:
            raise ValueError("Database connection strings not found in environment")
    
    def get_read_connection(self):
        """Get connection to read replica for data access"""
        return psycopg2.connect(
            self.read_conn_string,
            cursor_factory=RealDictCursor
        )
    
    def get_write_connection(self):
        """Get connection to primary database for writes"""
        return psycopg2.connect(
            self.write_conn_string,
            cursor_factory=RealDictCursor
        )
    
    def create_drift_scores_table(self):
        """Create the drift_scores table if it doesn't exist"""
        with self.get_write_connection() as conn:
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
    
    def get_responses_for_analysis(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get responses from read replica for analysis"""
        with self.get_read_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT 
                        r.id,
                        r.domain,
                        r.model_name,
                        r.prompt_type,
                        r.response_text,
                        r.created_at
                    FROM raw_responses r
                    WHERE r.response_text IS NOT NULL 
                    AND r.response_text != ''
                    ORDER BY r.created_at DESC
                """
                
                if limit:
                    query += f" LIMIT {limit}"
                
                cursor.execute(query)
                return cursor.fetchall()
    
    def save_drift_score(self, domain: str, model_name: str, prompt_type: str, 
                        self_similarity: float, peer_similarity: float, 
                        canonical_similarity: float, drift_score: float):
        """Save drift score to database"""
        with self.get_write_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO drift_scores 
                    (domain, model_name, prompt_type, self_similarity, 
                     peer_similarity, canonical_similarity, drift_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (domain, model_name, prompt_type)
                    DO UPDATE SET
                        self_similarity = EXCLUDED.self_similarity,
                        peer_similarity = EXCLUDED.peer_similarity,
                        canonical_similarity = EXCLUDED.canonical_similarity,
                        drift_score = EXCLUDED.drift_score,
                        calculated_at = CURRENT_TIMESTAMP
                """, (domain, model_name, prompt_type, self_similarity, 
                      peer_similarity, canonical_similarity, drift_score))
                
                conn.commit()
    
    def get_drift_scores(self, domain: Optional[str] = None, 
                        model_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get drift scores with optional filtering"""
        with self.get_read_connection() as conn:
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