#!/bin/bash

# IMMEDIATE FIX FOR RENDER CRAWLER ISSUE
# This script will deploy the working Python crawler to Render

echo "🚀 DEPLOYING WORKING PYTHON CRAWLER TO RENDER"
echo "=============================================="

# 1. Copy working Python crawler to service directory
echo "1️⃣ Copying working enterprise crawler..."
cp ../../hardened_production_crawler.py ./render-crawler.py

# 2. Create Python requirements.txt for Render
echo "2️⃣ Creating Python requirements..."
cat > requirements.txt << EOF
asyncio
psycopg2-binary
aiohttp
python-dotenv
EOF

# 3. Create Render-compatible start script
echo "3️⃣ Creating start script..."
cat > start-render-crawler.py << 'EOF'
#!/usr/bin/env python3
"""
Render-compatible crawler startup script
Uses the working hardened production crawler
"""
import os
import sys
import asyncio
import logging
from datetime import datetime

# Set up logging for Render
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger('RenderCrawler')

# Import the working crawler
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def run_crawler():
    """Run crawler in Render environment"""
    logger.info("🚀 Starting Render Crawler Service")
    
    # Check environment
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'unknown')}")
    
    # Import and run the working crawler
    from render_crawler import HardenedProductionCrawler
    
    crawler = HardenedProductionCrawler()
    await crawler.run()

if __name__ == "__main__":
    asyncio.run(run_crawler())
EOF

# 4. Update render.yaml to use Python
echo "4️⃣ Creating Python-compatible render.yaml..."
cat > render-python.yaml << EOF
services:
  - type: web
    name: domain-crawler-python
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python start-render-crawler.py
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.16
      - key: CRAWLER_BATCH_SIZE
        value: 50
      - key: CRAWLER_CONCURRENT_LIMIT
        value: 25
      - key: CRAWLER_DEMO_MODE
        value: true
EOF

echo "✅ DEPLOYMENT FILES READY"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. In Render dashboard, update service to use Python runtime"
echo "2. Set start command to: python start-render-crawler.py"
echo "3. Verify all API keys are set in Render environment variables"
echo "4. Deploy and monitor logs"
echo ""
echo "📝 If you want to keep using Node.js, use Option 2 below..."