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
        self.is_running = False
        self.last_run = None
        self.status = "initialized"
        logger.info("🚀 Embedding Engine Service initialized")
    
    def run_simple_analysis(self):
        """Run a simple analysis without heavy imports for initial deployment"""
        try:
            self.status = "running"
            self.is_running = True
            logger.info("🚀 Starting simple analysis...")
            
            # Simple placeholder analysis
            time.sleep(2)  # Simulate work
            logger.info("✅ Simple analysis completed successfully")
            
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
            "is_running": self.is_running,
            "message": "Embedding Engine - Simple Mode"
        }

# Global service instance
service = EmbeddingEngineService()

@app.route('/')
def root():
    """Root endpoint"""
    return jsonify({
        "service": "embedding-engine",
        "status": "healthy", 
        "message": "Embedding Engine is running",
        "timestamp": datetime.now().isoformat()
    })

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
    """Trigger a simple analysis run"""
    if service.is_running:
        return jsonify({"error": "Analysis already running"}), 400
    
    # Run analysis in background thread
    def run_async():
        service.run_simple_analysis()
    
    thread = threading.Thread(target=run_async)
    thread.start()
    
    return jsonify({"message": "Simple analysis started"})

if __name__ == "__main__":
    # Web service mode for Render - ensure proper port binding
    logger.info("🌐 Starting Embedding Engine web service...")
    port = int(os.environ.get('PORT', 10000))  # Render uses PORT env var
    logger.info(f"🌐 Binding to port {port}")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
    except Exception as e:
        logger.error(f"❌ Failed to start Flask app: {e}")
        sys.exit(1) 