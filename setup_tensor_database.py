#!/usr/bin/env python3
"""
Setup Tensor Database Tables and Get Test Domain IDs
This script ensures the tensor system database tables exist and retrieves real domain IDs for testing
"""

import psycopg2
import json
import sys
from typing import List, Dict, Any

# Database connection string
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def connect_to_database():
    """Connect to the database with SSL settings"""
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        return conn
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return None

def get_real_domain_ids(conn, limit: int = 10) -> List[str]:
    """Get real domain IDs from the database"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, domain 
            FROM domains 
            WHERE status = 'completed' 
            ORDER BY updated_at DESC 
            LIMIT %s
        """, (limit,))
        
        results = cursor.fetchall()
        domains = []
        
        print(f"Found {len(results)} domains:")
        for domain_id, domain_name in results:
            print(f"  - {domain_name} (ID: {domain_id})")
            domains.append(str(domain_id))
        
        cursor.close()
        return domains
        
    except Exception as e:
        print(f"Failed to get domain IDs: {e}")
        return []

def check_domain_responses(conn, domain_id: str) -> Dict[str, Any]:
    """Check if a domain has responses for tensor computation"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total_responses,
                COUNT(DISTINCT model) as unique_models,
                COUNT(DISTINCT prompt_type) as unique_prompts,
                MAX(created_at) as latest_response
            FROM domain_responses 
            WHERE domain_id = %s
        """, (domain_id,))
        
        result = cursor.fetchone()
        cursor.close()
        
        return {
            'total_responses': result[0],
            'unique_models': result[1],
            'unique_prompts': result[2],
            'latest_response': result[3]
        }
        
    except Exception as e:
        print(f"Failed to check domain responses: {e}")
        return {}

def create_tensor_tables(conn):
    """Create tensor system tables if they don't exist"""
    try:
        cursor = conn.cursor()
        
        # Memory Tensor Tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_tensors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                tensor_type TEXT NOT NULL DEFAULT 'memory',
                vector FLOAT[] NOT NULL,
                magnitude FLOAT NOT NULL,
                recency_score FLOAT NOT NULL,
                frequency_score FLOAT NOT NULL,
                significance_score FLOAT NOT NULL,
                persistence_score FLOAT NOT NULL,
                composite_score FLOAT NOT NULL,
                decay_rate FLOAT DEFAULT 0.95,
                last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Sentiment Tensor Tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sentiment_tensors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                tensor_type TEXT NOT NULL DEFAULT 'sentiment',
                vector FLOAT[] NOT NULL,
                positive_score FLOAT NOT NULL,
                negative_score FLOAT NOT NULL,
                neutral_score FLOAT NOT NULL,
                mixed_score FLOAT NOT NULL,
                confidence_emotion FLOAT NOT NULL,
                excitement_emotion FLOAT NOT NULL,
                concern_emotion FLOAT NOT NULL,
                urgency_emotion FLOAT NOT NULL,
                opportunity_emotion FLOAT NOT NULL,
                composite_sentiment FLOAT NOT NULL,
                market_sentiment TEXT NOT NULL,
                volatility_index FLOAT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Grounding Tensor Tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS grounding_tensors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                tensor_type TEXT NOT NULL DEFAULT 'grounding',
                vector FLOAT[] NOT NULL,
                factual_accuracy FLOAT NOT NULL,
                data_consistency FLOAT NOT NULL,
                source_reliability FLOAT NOT NULL,
                temporal_stability FLOAT NOT NULL,
                cross_validation FLOAT NOT NULL,
                composite_grounding FLOAT NOT NULL,
                grounding_strength TEXT NOT NULL,
                high_confidence_ratio FLOAT,
                medium_confidence_ratio FLOAT,
                low_confidence_ratio FLOAT,
                unverified_ratio FLOAT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Drift Detection Tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drift_detection_results (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                drift_score FLOAT NOT NULL,
                drift_type TEXT NOT NULL,
                drift_direction TEXT NOT NULL,
                concept_drift FLOAT NOT NULL,
                data_drift FLOAT NOT NULL,
                model_drift FLOAT NOT NULL,
                temporal_drift FLOAT NOT NULL,
                severity TEXT NOT NULL,
                detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                baseline_snapshot JSONB,
                current_snapshot JSONB
            );
        """)
        
        # Consensus Scoring Tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS consensus_scores (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                consensus_score FLOAT NOT NULL,
                agreement_level TEXT NOT NULL,
                model_agreement FLOAT NOT NULL,
                temporal_consistency FLOAT NOT NULL,
                cross_prompt_alignment FLOAT NOT NULL,
                confidence_alignment FLOAT NOT NULL,
                dissensus_points JSONB,
                computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_memory_tensors_domain ON memory_tensors(domain_id);
            CREATE INDEX IF NOT EXISTS idx_memory_tensors_composite ON memory_tensors(composite_score DESC);
            CREATE INDEX IF NOT EXISTS idx_sentiment_tensors_domain ON sentiment_tensors(domain_id);
            CREATE INDEX IF NOT EXISTS idx_sentiment_tensors_composite ON sentiment_tensors(composite_sentiment DESC);
            CREATE INDEX IF NOT EXISTS idx_grounding_tensors_domain ON grounding_tensors(domain_id);
            CREATE INDEX IF NOT EXISTS idx_grounding_tensors_composite ON grounding_tensors(composite_grounding DESC);
            CREATE INDEX IF NOT EXISTS idx_drift_detection_domain ON drift_detection_results(domain_id, detected_at DESC);
            CREATE INDEX IF NOT EXISTS idx_consensus_scores_domain ON consensus_scores(domain_id, computed_at DESC);
        """)
        
        conn.commit()
        cursor.close()
        print("✅ Tensor database tables created successfully")
        
    except Exception as e:
        print(f"Failed to create tensor tables: {e}")
        conn.rollback()

def create_competitive_memories_table(conn):
    """Create competitive_memories table if it doesn't exist (needed for tensor computations)"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitive_memories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                domain_id UUID REFERENCES domains(id),
                memory_type TEXT NOT NULL,
                content TEXT NOT NULL,
                patterns TEXT[],
                relationships JSONB,
                confidence FLOAT NOT NULL,
                effectiveness FLOAT,
                alert_priority TEXT DEFAULT 'low',
                memory_weight FLOAT DEFAULT 1.0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_competitive_memories_domain ON competitive_memories(domain_id);
            CREATE INDEX IF NOT EXISTS idx_competitive_memories_type ON competitive_memories(memory_type);
        """)
        
        conn.commit()
        cursor.close()
        print("✅ Competitive memories table created successfully")
        
    except Exception as e:
        print(f"Failed to create competitive memories table: {e}")
        conn.rollback()

def insert_sample_competitive_memories(conn, domain_ids: List[str]):
    """Insert sample competitive memories for testing"""
    try:
        cursor = conn.cursor()
        
        sample_memories = [
            {
                'memory_type': 'analysis',
                'content': 'Domain shows strong growth potential with innovative approach',
                'patterns': ['growth', 'innovation', 'potential'],
                'relationships': {'market_position': 'strong', 'competitive_advantage': 'high'},
                'confidence': 0.85,
                'effectiveness': 0.78,
                'alert_priority': 'medium'
            },
            {
                'memory_type': 'synthesis',
                'content': 'Technical analysis reveals robust infrastructure and scalability',
                'patterns': ['technical', 'infrastructure', 'scalability'],
                'relationships': {'technical_score': 'high', 'reliability': 'excellent'},
                'confidence': 0.92,
                'effectiveness': 0.87,
                'alert_priority': 'high'
            },
            {
                'memory_type': 'prediction',
                'content': 'Market sentiment analysis indicates positive trajectory',
                'patterns': ['market', 'sentiment', 'positive'],
                'relationships': {'trend': 'upward', 'confidence_level': 'high'},
                'confidence': 0.76,
                'effectiveness': 0.73,
                'alert_priority': 'low'
            }
        ]
        
        for domain_id in domain_ids[:3]:  # Limit to first 3 domains
            for memory in sample_memories:
                cursor.execute("""
                    INSERT INTO competitive_memories 
                    (domain_id, memory_type, content, patterns, relationships, confidence, effectiveness, alert_priority)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    domain_id,
                    memory['memory_type'],
                    memory['content'],
                    memory['patterns'],
                    json.dumps(memory['relationships']),
                    memory['confidence'],
                    memory['effectiveness'],
                    memory['alert_priority']
                ))
        
        conn.commit()
        cursor.close()
        print("✅ Sample competitive memories inserted")
        
    except Exception as e:
        print(f"Failed to insert sample memories: {e}")
        conn.rollback()

def main():
    print("🧠 Setting up Tensor System Database...")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Create tensor tables
        create_tensor_tables(conn)
        create_competitive_memories_table(conn)
        
        # Get real domain IDs
        domain_ids = get_real_domain_ids(conn, limit=5)
        
        if not domain_ids:
            print("❌ No domains found in database")
            sys.exit(1)
        
        # Insert sample competitive memories for testing
        insert_sample_competitive_memories(conn, domain_ids)
        
        # Check domain responses for tensor computation
        print("\nChecking domain responses for tensor computation:")
        test_domains = []
        
        for domain_id in domain_ids:
            response_info = check_domain_responses(conn, domain_id)
            if response_info.get('total_responses', 0) > 0:
                print(f"✅ Domain {domain_id}: {response_info['total_responses']} responses, {response_info['unique_models']} models")
                test_domains.append(domain_id)
            else:
                print(f"⚠️  Domain {domain_id}: No responses found")
        
        # Save test domain IDs to file
        test_config = {
            'test_domains': test_domains,
            'database_setup': True,
            'tensor_tables_created': True,
            'sample_data_inserted': True
        }
        
        with open('/Users/samkim/domain-runner/tensor_test_config.json', 'w') as f:
            json.dump(test_config, f, indent=2)
        
        print(f"\n✅ Database setup complete!")
        print(f"📊 {len(test_domains)} domains ready for tensor testing")
        print(f"📁 Test configuration saved to: tensor_test_config.json")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()