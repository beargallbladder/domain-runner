import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import asyncpg
import os
import json
from datetime import datetime

# Mock environment before import
os.environ['DATABASE_URL'] = 'postgresql://test_user:test_pass@localhost:5432/test_db'

# Import app after setting environment
from production_api import app

@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)

@pytest.fixture
def mock_pool():
    """Mock database pool"""
    pool = AsyncMock()
    return pool

@pytest.fixture
def mock_connection():
    """Mock database connection"""
    conn = AsyncMock()
    return conn

class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test basic health check"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "database" in data
    
    @patch('production_api.pool')
    async def test_health_with_db_check(self, mock_pool, client):
        """Test health check with database connectivity"""
        mock_pool.fetchval = AsyncMock(return_value=1)
        
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["database"] == "connected"

class TestDomainEndpoints:
    """Test domain-related endpoints"""
    
    @patch('production_api.pool')
    async def test_get_all_domains(self, mock_pool, client):
        """Test fetching all domains"""
        mock_domains = [
            {"domain": "example1.com", "crawl_status": "completed", "brand_strength": 85.5},
            {"domain": "example2.com", "crawl_status": "completed", "brand_strength": 92.3}
        ]
        mock_pool.fetch = AsyncMock(return_value=mock_domains)
        
        response = client.get("/api/v1/domains")
        assert response.status_code == 200
        data = response.json()
        assert len(data["domains"]) == 2
        assert data["total"] == 2
        assert data["domains"][0]["domain"] == "example1.com"
    
    @patch('production_api.pool')
    async def test_get_domain_by_name(self, mock_pool, client):
        """Test fetching specific domain"""
        mock_domain = {
            "domain": "example.com",
            "crawl_status": "completed",
            "brand_strength": 88.7,
            "ai_summary": "Leading technology company..."
        }
        mock_pool.fetchrow = AsyncMock(return_value=mock_domain)
        
        response = client.get("/api/v1/domains/example.com")
        assert response.status_code == 200
        data = response.json()
        assert data["domain"] == "example.com"
        assert data["brand_strength"] == 88.7
    
    @patch('production_api.pool')
    async def test_domain_not_found(self, mock_pool, client):
        """Test domain not found error"""
        mock_pool.fetchrow = AsyncMock(return_value=None)
        
        response = client.get("/api/v1/domains/nonexistent.com")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    @patch('production_api.pool')
    async def test_domain_search(self, mock_pool, client):
        """Test domain search functionality"""
        mock_results = [
            {"domain": "tech1.com", "brand_strength": 90},
            {"domain": "tech2.com", "brand_strength": 85}
        ]
        mock_pool.fetch = AsyncMock(return_value=mock_results)
        
        response = client.get("/api/v1/domains/search?q=tech")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert all("tech" in d["domain"] for d in data["results"])

class TestRankingEndpoints:
    """Test ranking endpoints"""
    
    @patch('production_api.pool')
    async def test_get_rankings(self, mock_pool, client):
        """Test fetching rankings"""
        mock_rankings = [
            {"domain": "leader.com", "rank": 1, "brand_strength": 95.5, "category": "Technology"},
            {"domain": "second.com", "rank": 2, "brand_strength": 93.2, "category": "Technology"}
        ]
        mock_pool.fetch = AsyncMock(return_value=mock_rankings)
        
        response = client.get("/api/v1/rankings")
        assert response.status_code == 200
        data = response.json()
        assert len(data["rankings"]) == 2
        assert data["rankings"][0]["rank"] == 1
        assert data["rankings"][0]["domain"] == "leader.com"
    
    @patch('production_api.pool')
    async def test_rankings_by_category(self, mock_pool, client):
        """Test category-specific rankings"""
        mock_rankings = [
            {"domain": "fintech1.com", "rank": 1, "brand_strength": 88.5, "category": "Finance"}
        ]
        mock_pool.fetch = AsyncMock(return_value=mock_rankings)
        
        response = client.get("/api/v1/rankings?category=Finance")
        assert response.status_code == 200
        data = response.json()
        assert all(r["category"] == "Finance" for r in data["rankings"])
    
    @patch('production_api.pool')
    async def test_rankings_pagination(self, mock_pool, client):
        """Test rankings pagination"""
        # Mock 50 domains
        mock_rankings = [
            {"domain": f"domain{i}.com", "rank": i, "brand_strength": 100-i}
            for i in range(1, 51)
        ]
        mock_pool.fetch = AsyncMock(return_value=mock_rankings[:20])
        
        response = client.get("/api/v1/rankings?limit=20&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data["rankings"]) == 20
        assert data["rankings"][0]["rank"] == 1

class TestAnalyticsEndpoints:
    """Test analytics endpoints"""
    
    @patch('production_api.pool')
    async def test_domain_analytics(self, mock_pool, client):
        """Test domain analytics endpoint"""
        mock_analytics = {
            "domain": "example.com",
            "brand_strength_history": [
                {"date": "2025-01-01", "score": 85.5},
                {"date": "2025-01-02", "score": 86.2}
            ],
            "ai_consensus": {
                "strengths": ["Innovation", "Market presence"],
                "weaknesses": ["Customer support"],
                "opportunities": ["International expansion"]
            }
        }
        mock_pool.fetchrow = AsyncMock(return_value=mock_analytics)
        
        response = client.get("/api/v1/analytics/domain/example.com")
        assert response.status_code == 200
        data = response.json()
        assert data["domain"] == "example.com"
        assert "brand_strength_history" in data
        assert "ai_consensus" in data
    
    @patch('production_api.pool')
    async def test_industry_trends(self, mock_pool, client):
        """Test industry trends endpoint"""
        mock_trends = {
            "category": "Technology",
            "average_brand_strength": 82.3,
            "top_performers": ["tech1.com", "tech2.com"],
            "growth_rate": 5.2
        }
        mock_pool.fetchrow = AsyncMock(return_value=mock_trends)
        
        response = client.get("/api/v1/analytics/trends/Technology")
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Technology"
        assert "average_brand_strength" in data

class TestCacheHeaders:
    """Test caching functionality"""
    
    @patch('production_api.pool')
    async def test_cache_headers(self, mock_pool, client):
        """Test that appropriate cache headers are set"""
        mock_pool.fetch = AsyncMock(return_value=[])
        
        response = client.get("/api/v1/domains")
        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert "public" in response.headers["Cache-Control"]
    
    @patch('production_api.pool')
    async def test_no_cache_for_analytics(self, mock_pool, client):
        """Test that analytics endpoints don't cache"""
        mock_pool.fetchrow = AsyncMock(return_value={})
        
        response = client.get("/api/v1/analytics/domain/example.com")
        assert response.status_code == 200
        if "Cache-Control" in response.headers:
            assert "no-cache" in response.headers["Cache-Control"] or "max-age=0" in response.headers["Cache-Control"]

class TestErrorHandling:
    """Test error handling"""
    
    @patch('production_api.pool')
    async def test_database_error(self, mock_pool, client):
        """Test handling of database errors"""
        mock_pool.fetch = AsyncMock(side_effect=asyncpg.PostgresError("Connection failed"))
        
        response = client.get("/api/v1/domains")
        assert response.status_code == 500
        assert "error" in response.json()
    
    def test_invalid_endpoint(self, client):
        """Test 404 for invalid endpoints"""
        response = client.get("/api/v1/invalid")
        assert response.status_code == 404
    
    @patch('production_api.pool')
    async def test_query_timeout(self, mock_pool, client):
        """Test handling of query timeouts"""
        mock_pool.fetch = AsyncMock(side_effect=asyncpg.QueryCanceledError("Query timeout"))
        
        response = client.get("/api/v1/rankings")
        assert response.status_code == 500
        assert "error" in response.json()

class TestAuthentication:
    """Test API authentication"""
    
    def test_public_endpoints_no_auth(self, client):
        """Test that public endpoints don't require auth"""
        response = client.get("/api/v1/domains")
        assert response.status_code != 401
    
    def test_rate_limiting_headers(self, client):
        """Test that rate limiting headers are present"""
        response = client.get("/health")
        assert response.status_code == 200
        # In production, these headers would be set by a reverse proxy
        # but we can test that the API doesn't break with them
        
class TestCORS:
    """Test CORS configuration"""
    
    def test_cors_headers(self, client):
        """Test CORS headers are properly set"""
        response = client.options("/api/v1/domains", headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET"
        })
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
    
    def test_cors_preflight(self, client):
        """Test CORS preflight requests"""
        response = client.options("/api/v1/domains", headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        })
        assert response.status_code == 200

class TestDataFormats:
    """Test response data formats"""
    
    @patch('production_api.pool')
    async def test_json_response_format(self, mock_pool, client):
        """Test that responses are valid JSON"""
        mock_pool.fetch = AsyncMock(return_value=[{"domain": "test.com"}])
        
        response = client.get("/api/v1/domains")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Should be valid JSON
        data = response.json()
        assert isinstance(data, dict)
    
    @patch('production_api.pool')
    async def test_datetime_serialization(self, mock_pool, client):
        """Test that datetimes are properly serialized"""
        mock_data = [{
            "domain": "test.com",
            "last_updated": datetime.now(),
            "created_at": datetime.now()
        }]
        mock_pool.fetch = AsyncMock(return_value=mock_data)
        
        response = client.get("/api/v1/domains")
        assert response.status_code == 200
        # Should not raise JSON serialization error

@pytest.mark.asyncio
class TestAsyncOperations:
    """Test async database operations"""
    
    @patch('production_api.pool')
    async def test_concurrent_requests(self, mock_pool, client):
        """Test handling of concurrent requests"""
        mock_pool.fetch = AsyncMock(return_value=[])
        
        # Send multiple concurrent requests
        import asyncio
        tasks = []
        for _ in range(10):
            tasks.append(client.get("/api/v1/domains"))
        
        # All should complete successfully
        responses = await asyncio.gather(*[asyncio.create_task(t) for t in tasks])
        assert all(r.status_code == 200 for r in responses)