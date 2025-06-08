#!/usr/bin/env python3
"""
Embedding Engine Runner
Production entry point for drift analysis system
"""

import os
import sys
import time
import logging
import threading
from datetime import datetime
from flask import Flask, jsonify
from typing import List, Dict, Any
from dotenv import load_dotenv

# Add the current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.db import EmbeddingDB, DatabaseManager
from utils.embeddings import EmbeddingGenerator
from analysis.drift import DriftAnalyzer
from analysis.similarity import SimilarityAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flask app for health checks
app = Flask(__name__)

class EmbeddingEngineService:
    def __init__(self):
        """Initialize the embedding engine service"""
        load_dotenv()
        
        self.db = EmbeddingDB()
        self.embedding_generator = EmbeddingGenerator()
        self.drift_analyzer = DriftAnalyzer(self.db, self.embedding_generator)
        self.is_running = False
        self.last_run = None
        self.status = "initialized"
        
        print("🚀 Embedding Engine initialized")
        print(f"   Database: {'✓ Connected' if self._test_db_connection() else '✗ Failed'}")
        print(f"   Embedding Model: {self.embedding_generator.model_name}")
        print(f"   Drift Weights: Self={self.drift_analyzer.self_weight}, Peer={self.drift_analyzer.peer_weight}, Canonical={self.drift_analyzer.canonical_weight}")
    
    def _test_db_connection(self) -> bool:
        """Test database connections"""
        try:
            with self.db.get_read_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
            return True
        except Exception as e:
            print(f"Database connection error: {e}")
            return False
    
    def setup_database(self):
        """Create necessary database tables"""
        print("📊 Setting up database tables...")
        self.db.create_drift_scores_table()
        print("   ✓ drift_scores table ready")
    
    async def run_analysis(self):
        """Run the complete embedding and drift analysis"""
        try:
            self.status = "running"
            logger.info("🚀 Starting embedding engine analysis...")
            
            # Run drift analysis
            await self.drift_analyzer.analyze_all_domains()
            
            self.last_run = datetime.now()
            self.status = "completed"
            logger.info("✅ Analysis completed successfully")
            
        except Exception as e:
            self.status = f"error: {str(e)}"
            logger.error(f"❌ Analysis failed: {e}")
            raise
    
    def get_status(self):
        """Get current service status"""
        return {
            "status": self.status,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "is_running": self.is_running
        }

# Global service instance
service = EmbeddingEngineService()

@app.route('/health')
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        "status": "healthy",
        "service": "embedding-engine",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/status')
def status():
    """Service status endpoint"""
    return jsonify(service.get_status())

@app.route('/run', methods=['POST'])
def trigger_run():
    """Trigger a drift analysis run"""
    if service.is_running:
        return jsonify({"error": "Analysis already running"}), 400
    
    # Run analysis in background thread
    def run_async():
        import asyncio
        asyncio.run(service.run_analysis())
    
    thread = threading.Thread(target=run_async)
    thread.start()
    
    return jsonify({"message": "Analysis started"})

async def main():
    """Main function for batch processing mode"""
    logger.info("🎯 Embedding Engine - Batch Mode")
    await service.run_analysis()

if __name__ == "__main__":
    # Check if we're running in web service mode or batch mode
    if os.getenv('ENVIRONMENT') == 'production' and 'render' in os.getenv('RENDER_SERVICE_NAME', '').lower():
        # Web service mode for Render
        logger.info("🌐 Starting web service mode...")
        port = int(os.environ.get('PORT', 8080))
        app.run(host='0.0.0.0', port=port)
    else:
        # Batch processing mode
        import asyncio
        asyncio.run(main()) 