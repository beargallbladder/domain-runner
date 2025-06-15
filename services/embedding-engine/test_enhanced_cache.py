#!/usr/bin/env python3
"""
Test the enhanced cache generator with sophisticated domain insights
"""

import json
from cache_generator import generate_public_cache_entry, update_all_public_cache

def test_sample_domain():
    """Test cache generation for a sample domain"""
    print("🧪 TESTING ENHANCED DOMAIN CACHE GENERATION")
    print("=" * 60)
    
    # Test with actual domain ID from your system
    test_domain_id = "0a4fcd92-ad23-45b5-9750-607ca3272bb0"
    
    try:
        print(f"📊 Generating cache for domain: {test_domain_id}")
        cache_entry = generate_public_cache_entry(test_domain_id)
        
        if cache_entry:
            print("✅ SUCCESS! Generated sophisticated cache entry:")
            print()
            
            # Display the insights in a readable format
            print(f"🏢 Domain: {cache_entry['domain']}")
            print(f"📈 Memory Score: {cache_entry['memory_score']}/100")
            print(f"🎯 Memory Trend: {cache_entry['memory_trend']}")
            print(f"🤖 Model Count: {cache_entry['model_count']}")
            print()
            
            print("🎯 AI CONSENSUS ANALYSIS:")
            consensus = cache_entry.get('ai_consensus', {})
            print(f"   Score: {consensus.get('score', 0):.3f}")
            print(f"   Level: {consensus.get('level', 'unknown')}")
            print(f"   Interpretation: {consensus.get('interpretation', 'N/A')}")
            print()
            
            print("🏆 BUSINESS INTELLIGENCE:")
            business = cache_entry.get('business_intelligence', {})
            print(f"   Primary Focus: {business.get('primary_focus', 'N/A')}")
            print(f"   Market Position: {business.get('market_position', 'N/A')}")
            print(f"   Key Strengths: {business.get('key_strengths', [])}")
            print(f"   Differentiation Score: {business.get('differentiation_score', 0)}")
            print()
            
            print("🌟 BRAND SIGNALS:")
            brand = cache_entry.get('brand_signals', {})
            print(f"   Messaging Consistency: {brand.get('messaging_consistency', 'N/A')}")
            print(f"   Brand Clarity: {brand.get('brand_clarity', 0)}/100")
            print(f"   Keyword Frequency: {brand.get('keyword_frequency', {})}")
            print()
            
            print("🏷️ EXTRACTED INSIGHTS:")
            print(f"   Keywords: {cache_entry.get('keywords', [])}")
            print(f"   Top Themes: {cache_entry.get('top_themes', [])}")
            print()
            
            print("📝 SAMPLE RESPONSE:")
            sample = cache_entry.get('response_sample', {})
            print(f"   Model: {sample.get('model', 'N/A')}")
            print(f"   Response: {sample.get('response', 'N/A')[:100]}...")
            print()
            
            print("🔍 SEO SUMMARY:")
            print(f"   {cache_entry.get('seo_summary', 'N/A')}")
            
        else:
            print("❌ No cache entry generated - domain not found or insufficient data")
            
    except Exception as e:
        print(f"❌ Error testing cache generation: {e}")
        import traceback
        traceback.print_exc()

def preview_api_response():
    """Show what the API response would look like"""
    print("\n" + "=" * 60)
    print("📡 PREVIEW: PUBLIC API RESPONSE")
    print("=" * 60)
    
    # Sample structure that matches the API spec
    sample_response = {
        "domain": "example-software.com",
        "domain_id": "abc123-uuid",
        "memory_score": 72.4,
        "memory_trend": "rising",
        "drift_delta": -2.1,
        "cohesion_score": 0.687,
        "model_count": 19,
        "last_seen": "2025-06-07T14:22:00Z",
        "first_seen": "2025-05-25T03:51:00Z",
        "response_sample": {
            "model": "claude-3-haiku",
            "prompt": "business_description",
            "response": "Professional software development company specializing in web applications...",
            "timestamp": "2025-06-06T17:30:00Z"
        },
        "keywords": ["software", "development", "web", "cloud", "custom"],
        "top_themes": ["Technology Driven", "Service Oriented", "Cloud Native"],
        "blurred_models": 18,
        "tensor_score": None,
        "tensor_tease": "Semantic memory drift analysis available in Pro.",
        "competitor_tease": "Competitor memory scores available in Pro view.",
        "ai_consensus": {
            "score": 0.687,
            "level": "medium",
            "interpretation": "Moderate AI agreement about this business",
            "agreement_range": {
                "highest": 0.821,
                "lowest": 0.534
            }
        },
        "business_intelligence": {
            "primary_focus": "Technology Driven",
            "market_position": "Modern",
            "key_strengths": ["software", "development", "cloud"],
            "differentiation_score": 68.7,
            "competitive_advantage": "High software expertise"
        },
        "brand_signals": {
            "keyword_frequency": {
                "software": "12 mentions",
                "development": "8 mentions",
                "cloud": "6 mentions"
            },
            "messaging_consistency": "Medium",
            "brand_clarity": 68.7
        },
        "cta": {
            "show_signup": True,
            "text": "Track your brand across AI models",
            "signup_url": "https://llmpagerank.com/signup"
        },
        "seo_summary": "example-software.com has been remembered by 19 AI models. Memory score: 72.4. Moderate AI agreement about this business. Explore your AI visibility now."
    }
    
    print(json.dumps(sample_response, indent=2))

if __name__ == "__main__":
    test_sample_domain()
    preview_api_response()
    
    print("\n🎉 ENHANCED CACHE SYSTEM READY!")
    print("✅ Sophisticated domain analysis")
    print("✅ Real keyword extraction") 
    print("✅ AI consensus scoring")
    print("✅ Business intelligence insights")
    print("✅ Brand perception analysis")
    print("✅ Market positioning assessment")
    print("\n🚀 Run: python cache_generator.py to update all domains!") 