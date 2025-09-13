#!/bin/bash

# Enterprise Crawler Runner Script
# Handles environment setup and monitoring

echo "🚀 Enterprise Domain Crawler"
echo "================================="

# Set Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create logs directory
mkdir -p logs

# Function to check if crawler is already running
check_running() {
    if pgrep -f "enterprise_crawler_system.py" > /dev/null; then
        echo "⚠️  Crawler is already running!"
        echo "Run './run_enterprise_crawler.sh stop' to stop it"
        exit 1
    fi
}

# Function to start crawler
start_crawler() {
    echo "🔍 Checking system..."
    
    # Check database connection
    python3 -c "
import psycopg2
import os
DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
try:
    conn = psycopg2.connect(DATABASE_URL)
    print('✅ Database connection OK')
    conn.close()
except Exception as e:
    print('❌ Database connection failed:', str(e))
    exit(1)
"
    
    # Check for API keys (at least one)
    if [[ -z "${OPENAI_API_KEY_1}" && -z "${ANTHROPIC_API_KEY_1}" && -z "${GROQ_API_KEY_1}" ]]; then
        echo "⚠️  No API keys found in environment"
        echo "Set at least one API key to continue"
        echo "Example: export OPENAI_API_KEY_1='your-key-here'"
        exit 1
    fi
    
    echo "✅ Environment checks passed"
    echo ""
    echo "🚀 Starting Enterprise Crawler..."
    
    # Run the deployment script
    nohup python3 deploy_enterprise_crawler.py > logs/crawler_$(date +%Y%m%d_%H%M%S).log 2>&1 &
    crawler_pid=$!
    
    echo "✅ Crawler started (PID: $crawler_pid)"
    echo "📄 Logs: tail -f logs/crawler_*.log"
    echo ""
    
    # Wait a bit and check if it's still running
    sleep 5
    if ps -p $crawler_pid > /dev/null; then
        echo "✅ Crawler is running successfully"
        
        # Show initial stats
        python3 -c "
import psycopg2
import time
time.sleep(2)
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    cur.execute('''
        SELECT COUNT(DISTINCT provider), COUNT(*) 
        FROM crawler_health 
        WHERE timestamp > NOW() - INTERVAL '1 minute'
    ''')
    providers, checks = cur.fetchone() or (0, 0)
    print(f'📊 Active providers: {providers}')
    print(f'🔍 Health checks: {checks}')
    conn.close()
except:
    pass
"
    else
        echo "❌ Crawler failed to start"
        echo "Check logs for details"
        exit 1
    fi
}

# Function to stop crawler
stop_crawler() {
    echo "🛑 Stopping crawler..."
    
    # Kill the process
    pkill -f "enterprise_crawler_system.py"
    pkill -f "deploy_enterprise_crawler.py"
    
    echo "✅ Crawler stopped"
}

# Function to show status
show_status() {
    echo "📊 Crawler Status"
    echo "=================="
    
    # Check if running
    if pgrep -f "enterprise_crawler_system.py" > /dev/null; then
        echo "✅ Status: RUNNING"
        
        # Get stats from database
        python3 -c "
import psycopg2
from datetime import datetime

try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    
    # Get recent activity
    cur.execute('''
        SELECT 
            COUNT(DISTINCT domain_id) as domains,
            COUNT(DISTINCT model) as models,
            COUNT(*) as responses,
            AVG(response_time_ms) as avg_time
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '10 minutes'
    ''')
    
    domains, models, responses, avg_time = cur.fetchone() or (0, 0, 0, 0)
    
    print(f'')
    print(f'Last 10 minutes:')
    print(f'  - Domains processed: {domains}')
    print(f'  - Active models: {models}')
    print(f'  - Total responses: {responses}')
    print(f'  - Avg response time: {int(avg_time or 0)}ms')
    
    # Get provider breakdown
    cur.execute('''
        SELECT 
            SPLIT_PART(model, '/', 1) as provider,
            COUNT(*) as count
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '10 minutes'
        GROUP BY SPLIT_PART(model, '/', 1)
        ORDER BY count DESC
    ''')
    
    print(f'')
    print(f'Provider breakdown:')
    for provider, count in cur.fetchall():
        print(f'  - {provider}: {count} responses')
    
    # Get queue status
    cur.execute('''
        SELECT COUNT(*) FROM domains WHERE status = 'pending'
    ''')
    pending = cur.fetchone()[0]
    
    print(f'')
    print(f'Queue status:')
    print(f'  - Pending domains: {pending}')
    
    conn.close()
    
except Exception as e:
    print(f'Error getting stats: {str(e)}')
"
    else
        echo "❌ Status: NOT RUNNING"
    fi
}

# Function to monitor in real-time
monitor_crawler() {
    echo "📊 Real-time Monitoring (Ctrl+C to exit)"
    echo "========================================"
    
    watch -n 5 "python3 -c \"
import psycopg2
from datetime import datetime

try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    
    print('🕒', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print('')
    
    # Get current activity
    cur.execute('''
        SELECT 
            SPLIT_PART(model, '/', 1) as provider,
            COUNT(*) as responses,
            AVG(response_time_ms) as avg_time,
            MAX(created_at) as last_response
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY SPLIT_PART(model, '/', 1)
        ORDER BY responses DESC
    ''')
    
    print('Provider Activity (last 5 min):')
    print('-' * 50)
    print(f'{'Provider':<15} {'Responses':<12} {'Avg Time':<12} {'Last Response'}')
    print('-' * 50)
    
    for provider, count, avg_time, last in cur.fetchall():
        time_ago = (datetime.now() - last).total_seconds() if last else 999
        print(f'{provider:<15} {count:<12} {int(avg_time or 0):<12}ms {int(time_ago)}s ago')
    
    # Get health status
    cur.execute('''
        SELECT status, COUNT(*) 
        FROM crawler_health 
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
        GROUP BY status
    ''')
    
    print('')
    print('Health Status:')
    for status, count in cur.fetchall():
        print(f'  - {status}: {count}')
    
    conn.close()
    
except Exception as e:
    print(f'Monitoring error: {str(e)}')
\""
}

# Parse command line arguments
case "$1" in
    start)
        check_running
        start_crawler
        ;;
    stop)
        stop_crawler
        ;;
    restart)
        stop_crawler
        sleep 2
        start_crawler
        ;;
    status)
        show_status
        ;;
    monitor)
        monitor_crawler
        ;;
    logs)
        tail -f logs/crawler_*.log
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the enterprise crawler"
        echo "  stop    - Stop the crawler"
        echo "  restart - Restart the crawler"
        echo "  status  - Show crawler status and stats"
        echo "  monitor - Real-time monitoring"
        echo "  logs    - Show crawler logs"
        exit 1
        ;;
esac