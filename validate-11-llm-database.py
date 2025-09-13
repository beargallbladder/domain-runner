#!/usr/bin/env python3
"""
DATABASE VALIDATION FOR 11 LLM TENSOR SYSTEM
This validates actual database entries to ensure all 11 LLMs are working
"""

import psycopg2
import os
from datetime import datetime, timedelta
import time
import json

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')

REQUIRED_PROVIDERS = [
    'openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
    'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
]

class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'

def log(message, color=Colors.RESET):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"{color}[{timestamp}] {message}{Colors.RESET}")

def alert(message):
    print('\a')  # System beep
    log(f"🚨 ALERT: {message}", Colors.RED)
    log(f"🚨 {message} 🚨", Colors.BOLD)
    
    # Try to send system notification (macOS)
    try:
        os.system(f"""osascript -e 'display notification "{message}" with title "11 LLM FAILURE" sound name "Basso"'""")
    except:
        pass

def connect_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        log(f"Database connection failed: {e}", Colors.RED)
        return None

def check_recent_responses(conn, minutes=60):
    """Check LLM responses in the last N minutes"""
    cursor = conn.cursor()
    
    # Get response counts by provider
    query = """
    SELECT 
        provider,
        COUNT(*) as response_count,
        COUNT(DISTINCT domain_id) as domains_processed,
        AVG(response_time_ms) as avg_response_time,
        MAX(created_at) as last_success,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time
    FROM llm_responses 
    WHERE created_at > NOW() - INTERVAL '%s minutes'
        AND response IS NOT NULL
        AND response != ''
        AND error_message IS NULL
    GROUP BY provider
    ORDER BY response_count DESC;
    """
    
    cursor.execute(query, (minutes,))
    results = cursor.fetchall()
    
    provider_stats = {}
    for row in results:
        provider_stats[row[0]] = {
            'count': row[1],
            'domains': row[2],
            'avg_time': row[3],
            'last_success': row[4],
            'min_time': row[5],
            'max_time': row[6]
        }
    
    # Check for missing providers
    working_providers = list(provider_stats.keys())
    missing_providers = [p for p in REQUIRED_PROVIDERS if p not in working_providers]
    
    # Get error counts
    error_query = """
    SELECT 
        provider,
        COUNT(*) as error_count,
        MAX(error_message) as sample_error,
        MAX(created_at) as last_error
    FROM llm_responses
    WHERE created_at > NOW() - INTERVAL '%s minutes'
        AND (response IS NULL OR response = '' OR error_message IS NOT NULL)
    GROUP BY provider
    ORDER BY error_count DESC;
    """
    
    cursor.execute(error_query, (minutes,))
    error_results = cursor.fetchall()
    
    error_stats = {}
    for row in error_results:
        error_stats[row[0]] = {
            'count': row[1],
            'sample_error': row[2],
            'last_error': row[3]
        }
    
    cursor.close()
    
    return {
        'working': working_providers,
        'missing': missing_providers,
        'provider_stats': provider_stats,
        'error_stats': error_stats,
        'total_working': len(working_providers),
        'total_missing': len(missing_providers)
    }

def display_results(results, test_domain=None):
    """Display results in a clear format"""
    print('\n' + '='*80)
    log('🧠 11 LLM TENSOR DATABASE VALIDATION', Colors.BOLD)
    print('='*80)
    
    if test_domain:
        log(f"Test Domain: {test_domain}", Colors.BLUE)
    
    log(f"Time Window: Last 60 minutes", Colors.BLUE)
    print('')
    
    # Display provider status
    print('📊 PROVIDER STATUS:')
    print('-'*60)
    
    for i, provider in enumerate(REQUIRED_PROVIDERS, 1):
        num = str(i).rjust(2)
        
        if provider in results['working']:
            stats = results['provider_stats'][provider]
            status = '✅'
            color = Colors.GREEN
            details = f"OK - {stats['count']} responses, {stats['domains']} domains, {int(stats['avg_time'])}ms avg"
        elif provider in results['error_stats']:
            stats = results['error_stats'][provider]
            status = '❌'
            color = Colors.RED
            error_msg = stats['sample_error'][:50] if stats['sample_error'] else 'Unknown error'
            details = f"FAILED - {stats['count']} errors: {error_msg}"
        else:
            status = '❌'
            color = Colors.RED
            details = 'NO DATA - Provider not responding'
        
        log(f"{num}. {status} {provider.ljust(12)} - {details}", color)
    
    print('')
    print('📈 SUMMARY:')
    print('-'*60)
    
    working_count = results['total_working']
    success_rate = (working_count / 11) * 100
    
    color = Colors.GREEN if working_count == 11 else Colors.YELLOW if working_count >= 8 else Colors.RED
    log(f"Working: {working_count}/11 ({success_rate:.1f}%)", color)
    log(f"Failed: {results['total_missing']}/11", Colors.RED if results['total_missing'] > 0 else Colors.GREEN)
    
    if working_count == 11:
        print('')
        log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', Colors.GREEN)
        log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', Colors.BOLD)
        log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', Colors.GREEN)
    elif working_count < 8:
        print('')
        alert(f'CRITICAL: Only {working_count}/11 LLMs working! Tensor integrity compromised!')
    
    # Show detailed stats
    if results['provider_stats']:
        print('\n📊 PERFORMANCE METRICS:')
        print('-'*60)
        
        total_responses = sum(s['count'] for s in results['provider_stats'].values())
        total_domains = sum(s['domains'] for s in results['provider_stats'].values())
        
        log(f"Total Responses: {total_responses}", Colors.CYAN)
        log(f"Unique Domains: {total_domains}", Colors.CYAN)
        log(f"Providers Active: {working_count}/11", Colors.CYAN)
    
    print('='*80)

def monitor_continuously():
    """Monitor database continuously"""
    log('🚀 Starting continuous database monitoring...', Colors.BOLD)
    log('This will check the database every 2 minutes', Colors.CYAN)
    log('Press Ctrl+C to stop', Colors.BLUE)
    
    check_count = 0
    last_alert_time = {}
    
    while True:
        check_count += 1
        log(f'\n🔍 Check #{check_count}', Colors.CYAN)
        
        conn = connect_db()
        if not conn:
            alert("Cannot connect to database!")
            time.sleep(120)
            continue
        
        try:
            results = check_recent_responses(conn)
            display_results(results)
            
            # Alert logic
            for provider in results['missing']:
                now = datetime.now()
                last_alert = last_alert_time.get(provider)
                
                # Alert every 10 minutes for missing providers
                if not last_alert or (now - last_alert).seconds > 600:
                    alert(f"{provider} has not responded in the last hour!")
                    last_alert_time[provider] = now
            
            # Save results to file
            with open('11-llm-status.json', 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'working_count': results['total_working'],
                    'working_providers': results['working'],
                    'missing_providers': results['missing'],
                    'check_number': check_count
                }, f, indent=2)
            
        except Exception as e:
            log(f"Error during check: {e}", Colors.RED)
        finally:
            conn.close()
        
        # Wait 2 minutes before next check
        log('\n⏳ Waiting 2 minutes before next check...', Colors.YELLOW)
        time.sleep(120)

def test_specific_domain(domain_id):
    """Test a specific domain to see which LLMs processed it"""
    conn = connect_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    query = """
    SELECT 
        provider,
        response IS NOT NULL AND response != '' as success,
        response_time_ms,
        error_message,
        created_at
    FROM llm_responses
    WHERE domain_id = %s
    ORDER BY provider;
    """
    
    cursor.execute(query, (domain_id,))
    results = cursor.fetchall()
    
    log(f"\n🔍 Results for domain {domain_id}:", Colors.CYAN)
    log(f"Found {len(results)} provider responses", Colors.BLUE)
    
    for provider, success, response_time, error, created_at in results:
        status = '✅' if success else '❌'
        color = Colors.GREEN if success else Colors.RED
        details = f"{response_time}ms" if success else f"Error: {error[:50] if error else 'No response'}"
        log(f"  {status} {provider}: {details}", color)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test-domain':
            test_specific_domain(sys.argv[2])
        elif sys.argv[1] == '--once':
            conn = connect_db()
            if conn:
                results = check_recent_responses(conn)
                display_results(results)
                conn.close()
    else:
        try:
            monitor_continuously()
        except KeyboardInterrupt:
            log('\n👋 Monitoring stopped', Colors.YELLOW)