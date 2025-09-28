#!/usr/bin/env python3
"""Emergency deployment fix - minimal working service"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
import psycopg2
from datetime import datetime
import uvicorn

app = FastAPI()

@app.get("/healthz")
async def health():
    """Health check endpoint"""
    return JSONResponse({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.get("/readyz")
async def ready():
    """Readiness check with database connection"""
    try:
        # Try to connect to database if URL exists
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            conn = psycopg2.connect(db_url)
            conn.close()
            db_status = "connected"
        else:
            db_status = "no_url"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return JSONResponse({
        "ready": True,
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    })

@app.get("/status")
async def status():
    """Status endpoint"""
    return JSONResponse({
        "service": "domain-runner",
        "version": "emergency-fix-1.0",
        "environment": {
            "database_url": bool(os.getenv("DATABASE_URL")),
            "port": os.getenv("PORT", "8080"),
        },
        "timestamp": datetime.now().isoformat()
    })

@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse({
        "message": "Domain Runner Service",
        "endpoints": ["/healthz", "/readyz", "/status"],
        "status": "operational"
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)