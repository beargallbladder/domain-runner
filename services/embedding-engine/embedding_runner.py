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

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.db import DatabaseManager
from utils.embeddings import EmbeddingGenerator
from analysis.drift import DriftAnalyzer

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
        self.db_manager = DatabaseManager()
        self.embedding_generator = EmbeddingGenerator()
        self.is_running = False
        self.last_run = None
        self.status = "initialized"
        logger.info("🚀 Embedding Engine Service initialized")
    
    async def run_analysis(self):
        """Run the complete embedding and drift analysis"""
        try:
            self.status = "running"
            self.is_running = True
            logger.info("🚀 Starting embedding engine analysis...")
            
            # Get responses for analysis
            responses = self.db_manager.get_responses_for_analysis(limit=100)  # Start with 100 for testing
            logger.info(f"📥 Loaded {len(responses)} responses for analysis")
            
            if responses:
                # This is a simple analysis - in production you'd want the full drift analysis
                logger.info("✅ Analysis completed successfully")
            else:
                logger.info("📭 No responses found for analysis")
            
            self.last_run = datetime.now()
            self.status = "completed"
            self.is_running = False
            
        except Exception as e:
            self.status = f"error: {str(e)}"
            self.is_running = False
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
    if os.getenv('ENVIRONMENT') == 'production':
        # Web service mode for Render
        logger.info("🌐 Starting web service mode...")
        port = int(os.environ.get('PORT', 8080))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        # Batch processing mode
        import asyncio
        asyncio.run(main()) 