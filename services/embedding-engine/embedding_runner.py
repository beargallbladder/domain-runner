#!/usr/bin/env python3
"""
Minimal Embedding Engine for Render Deployment
"""

import os
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def root():
    return jsonify({
        "service": "embedding-engine",
        "status": "running", 
        "message": "Minimal Embedding Engine",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "embedding-engine",
        "timestamp": datetime.now().isoformat()
    })

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 