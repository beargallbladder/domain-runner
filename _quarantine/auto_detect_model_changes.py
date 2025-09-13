#!/usr/bin/env python3
"""
AUTO-DETECT MODEL CHANGES
Run this weekly to detect when LLM providers change their models
"""

import os
import requests
import json
from datetime import datetime
import psycopg2
from typing import Dict, List, Tuple

# Configuration
API_ENDPOINT = "https://domain-runner.onrender.com"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db")

# Current known models (update this as we discover changes)
KNOWN_MODELS = {
    'openai': ['gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
    'anthropic': ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    'deepseek': ['deepseek-chat', 'deepseek-coder'],
    'mistral': ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
    'xai': ['grok-2', 'grok-beta', 'grok-2-mini'],
    'together': ['meta-llama/Llama-3-8b-chat-hf', 'meta-llama/Llama-3-70b-chat-hf'],
    'perplexity': ['sonar', 'sonar-small-chat', 'sonar-medium-chat'],
    'google': ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    'cohere': ['command-r-plus', 'command-r', 'command'],
    'ai21': ['jamba-mini', 'jamba-large', 'j2-ultra', 'j2-mid'],
    'groq': ['llama3-8b-8192', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
}

def check_provider_validation():
    """Call the validation endpoint to check all providers"""
    try:
        response = requests.get(f"{API_ENDPOINT}/api/validate-providers", timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Validation endpoint returned {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error calling validation endpoint: {e}")
        return None

def detect_model_changes(validation_data: Dict) -> List[Dict]:
    """Detect which models have changed"""
    changes = []
    
    if not validation_data or 'providers' not in validation_data:
        return changes
    
    for provider, data in validation_data['providers'].items():
        if not data['working']:
            # Provider is broken
            if 'decommissioned' in data.get('error', '') or 'does not exist' in data.get('error', ''):
                changes.append({
                    'provider': provider,
                    'type': 'model_deprecated',
                    'current_model': data['model'],
                    'error': data.get('error', ''),
                    'recommendation': f"Model {data['model']} is deprecated. Check alternativeModels or update to a newer model."
                })
            elif 'API key' in data.get('error', ''):
                changes.append({
                    'provider': provider,
                    'type': 'api_key_issue',
                    'current_model': data['model'],
                    'error': data.get('error', ''),
                    'recommendation': f"API key issue for {provider}. Check key validity and format."
                })
        elif data.get('alternativeModels'):
            # Provider works but has alternative models
            if data['model'] != data.get('originalModel'):
                changes.append({
                    'provider': provider,
                    'type': 'model_fallback',
                    'current_model': data.get('originalModel'),
                    'working_model': data['model'],
                    'alternatives': data['alternativeModels'],
                    'recommendation': f"Update {provider} configuration to use {data['model']} as primary model."
                })
    
    return changes

def save_detection_results(changes: List[Dict], validation_data: Dict):
    """Save detection results to database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Create table if not exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS model_change_detection (
                id SERIAL PRIMARY KEY,
                detection_date TIMESTAMP DEFAULT NOW(),
                provider VARCHAR(50),
                change_type VARCHAR(50),
                current_model VARCHAR(100),
                new_model VARCHAR(100),
                details JSONB,
                resolved BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Insert changes
        for change in changes:
            cur.execute("""
                INSERT INTO model_change_detection 
                (provider, change_type, current_model, new_model, details)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                change['provider'],
                change['type'],
                change.get('current_model'),
                change.get('working_model'),
                json.dumps(change)
            ))
        
        # Store full validation results
        cur.execute("""
            CREATE TABLE IF NOT EXISTS validation_history (
                id SERIAL PRIMARY KEY,
                validation_date TIMESTAMP DEFAULT NOW(),
                working_providers INT,
                total_providers INT,
                full_results JSONB
            )
        """)
        
        summary = validation_data.get('summary', {})
        cur.execute("""
            INSERT INTO validation_history (working_providers, total_providers, full_results)
            VALUES (%s, %s, %s)
        """, (
            summary.get('working', 0),
            summary.get('total', 0),
            json.dumps(validation_data)
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("✅ Results saved to database")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

def generate_update_script(changes: List[Dict]) -> str:
    """Generate TypeScript update code for model changes"""
    if not changes:
        return ""
    
    script = "// AUTO-GENERATED MODEL UPDATES\n"
    script += f"// Generated on {datetime.now().isoformat()}\n\n"
    
    for change in changes:
        if change['type'] == 'model_fallback' or change['type'] == 'model_deprecated':
            provider = change['provider']
            new_model = change.get('working_model', 'UPDATE_NEEDED')
            
            script += f"// Update {provider}: {change.get('current_model')} → {new_model}\n"
            script += f"// {change['recommendation']}\n"
            script += f"providers.find(p => p.name === '{provider}').model = '{new_model}';\n\n"
    
    return script

def send_alert(changes: List[Dict], validation_data: Dict):
    """Send alert about model changes"""
    if not changes:
        return
    
    webhook_url = os.getenv('ALERT_WEBHOOK_URL')
    if webhook_url:
        try:
            message = f"🚨 LLM Model Changes Detected\n\n"
            message += f"Working: {validation_data['summary']['working']}/{validation_data['summary']['total']}\n\n"
            
            for change in changes:
                message += f"• {change['provider']}: {change['recommendation']}\n"
            
            requests.post(webhook_url, json={"text": message})
            print("✅ Alert sent")
        except Exception as e:
            print(f"❌ Failed to send alert: {e}")

def main():
    """Main detection flow"""
    print("🔍 AUTO-DETECTING LLM MODEL CHANGES")
    print("=" * 60)
    print(f"Time: {datetime.now()}")
    print(f"Endpoint: {API_ENDPOINT}")
    
    # Step 1: Check current provider status
    print("\n1️⃣ Checking provider validation...")
    validation_data = check_provider_validation()
    
    if not validation_data:
        print("❌ Could not get validation data")
        return
    
    # Show summary
    summary = validation_data.get('summary', {})
    print(f"\n📊 Provider Status: {summary.get('working', 0)}/{summary.get('total', 0)} working")
    print(f"   Health: {summary.get('health', 'Unknown')}")
    
    # Step 2: Detect changes
    print("\n2️⃣ Detecting model changes...")
    changes = detect_model_changes(validation_data)
    
    if not changes:
        print("✅ No model changes detected - all providers stable!")
    else:
        print(f"⚠️  Found {len(changes)} issues:")
        for change in changes:
            print(f"\n   Provider: {change['provider']}")
            print(f"   Type: {change['type']}")
            print(f"   Recommendation: {change['recommendation']}")
    
    # Step 3: Save results
    print("\n3️⃣ Saving detection results...")
    save_detection_results(changes, validation_data)
    
    # Step 4: Generate update script
    if changes:
        print("\n4️⃣ Generating update script...")
        update_script = generate_update_script(changes)
        
        if update_script:
            with open('model_updates.ts', 'w') as f:
                f.write(update_script)
            print("✅ Update script saved to model_updates.ts")
    
    # Step 5: Send alerts
    if changes:
        print("\n5️⃣ Sending alerts...")
        send_alert(changes, validation_data)
    
    # Show recommendations
    if 'recommendations' in validation_data:
        print("\n📋 RECOMMENDATIONS:")
        for rec in validation_data['recommendations']:
            print(f"   {rec}")
    
    print("\n✅ Detection complete!")

if __name__ == "__main__":
    main()