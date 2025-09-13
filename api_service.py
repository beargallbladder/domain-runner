from flask import Flask, jsonify, request
import os
import json
from datetime import datetime
from agents.database_connector.src.connector import DatabaseConnector

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'nexus-api'
    })

@app.route('/api/status')
def status():
    """Get system status"""
    try:
        db = DatabaseConnector()
        coverage = db.get_domain_coverage()
        return jsonify({
            'coverage': coverage['coverage'],
            'expected': coverage['expected'],
            'observed': coverage['observed'],
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics')
def metrics():
    """Get performance metrics"""
    try:
        db = DatabaseConnector()
        stats = db.get_model_performance_stats()
        return jsonify({
            'models': stats,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trigger-pipeline', methods=['POST'])
def trigger_pipeline():
    """Manually trigger the pipeline"""
    try:
        # Import and run the pipeline
        from scripts.hourly_pipeline import main
        result = main()
        return jsonify({
            'status': 'triggered',
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)