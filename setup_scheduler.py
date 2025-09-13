#!/usr/bin/env python3
"""
🔧 SCHEDULER SETUP & API KEY VERIFICATION
==========================================
Install dependencies and verify API keys before running real calls
"""

import subprocess
import sys
import os
import asyncio
from weekly_domain_scheduler import APIConfig, BrandIntelligenceScheduler

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def verify_api_keys():
    """Verify API keys are configured"""
    print("\n🔑 Verifying API keys...")
    
    api_config = APIConfig()
    
    # Test basic connectivity (without making actual calls)
    available_providers = []
    
    if api_config.openai_api_key:
        available_providers.append("OpenAI (GPT models)")
    
    if api_config.anthropic_api_key:
        available_providers.append("Anthropic (Claude models)")
        
    if api_config.google_api_key:
        available_providers.append("Google (Gemini models)")
        
    if api_config.deepseek_api_key:
        available_providers.append("DeepSeek (DeepSeek models)")
    
    if available_providers:
        print("✅ Available providers:")
        for provider in available_providers:
            print(f"   • {provider}")
    else:
        print("❌ No API keys configured!")
        print("\n💡 Set environment variables:")
        print("   export OPENAI_API_KEY='your-key-here'")
        print("   export ANTHROPIC_API_KEY='your-key-here'")
        print("   export GOOGLE_API_KEY='your-key-here'")
        print("   export DEEPSEEK_API_KEY='your-key-here'")
        return False
    
    return True

async def test_api_connection():
    """Test a single API call to verify connectivity"""
    print("\n🧪 Testing API connection...")
    
    try:
        scheduler = BrandIntelligenceScheduler()
        
        # Run a tiny test with 1 domain
        print("🚀 Running 1-domain test...")
        result = await scheduler.test_run(domain_count=1)
        
        if result['success_count'] > 0:
            print("✅ API connection test successful!")
            print(f"   • Successful calls: {result['success_count']}")
            print(f"   • Failed calls: {result['error_count']}")
            return True
        else:
            print("❌ API connection test failed!")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    """Main setup process"""
    print("🚀 BRAND INTELLIGENCE SCHEDULER SETUP")
    print("=" * 50)
    
    # Step 1: Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Step 2: Verify API keys
    if not verify_api_keys():
        print("\n⚠️  WARNING: No API keys configured!")
        print("The scheduler can still run in test mode, but won't make real API calls.")
        
        response = input("\nContinue anyway? (y/N): ").lower().strip()
        if response != 'y':
            print("Setup cancelled.")
            sys.exit(1)
    
    # Step 3: Test API connection (optional)
    print("\n🧪 Would you like to test API connectivity?")
    test_response = input("This will make 3 real API calls (~$0.01): (y/N): ").lower().strip()
    
    if test_response == 'y':
        try:
            asyncio.run(test_api_connection())
        except Exception as e:
            print(f"❌ Test failed: {e}")
            print("You can still run the scheduler, but check your API keys.")
    
    # Setup complete
    print("\n🎉 SETUP COMPLETE!")
    print("=" * 50)
    print("🚀 You can now run:")
    print("   python3 weekly_domain_scheduler.py test 5      # Small test")
    print("   python3 weekly_domain_scheduler.py weekly      # Full weekly run")
    print("   python3 weekly_domain_scheduler.py status      # Check status")
    print("\n💡 The scheduler will make REAL API calls with real costs!")

if __name__ == "__main__":
    main() 