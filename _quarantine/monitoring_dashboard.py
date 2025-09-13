#!/usr/bin/env python3
"""
LLM PROVIDER MONITORING DASHBOARD
Real-time monitoring of all 11 LLM providers
"""

import os
import requests
import time
from datetime import datetime
import psycopg2
from rich.console import Console
from rich.table import Table
from rich.live import Live
from rich.panel import Panel
from rich.layout import Layout
from rich.progress import Progress, SpinnerColumn, TextColumn
import asyncio

# Configuration
API_ENDPOINT = os.getenv("API_ENDPOINT", "https://domain-runner.onrender.com")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db")

console = Console()

class LLMMonitoringDashboard:
    def __init__(self):
        self.providers = [
            'openai', 'anthropic', 'deepseek', 'mistral', 'xai',
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
        ]
        self.last_validation = None
        self.historical_data = []
        
    def get_validation_data(self):
        """Fetch current validation status"""
        try:
            response = requests.get(f"{API_ENDPOINT}/api/validate-providers", timeout=30)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            console.print(f"[red]Error fetching validation: {e}[/red]")
        return None
    
    def get_environment_keys(self):
        """Fetch environment key configuration"""
        try:
            response = requests.get(f"{API_ENDPOINT}/api/environment-keys", timeout=10)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        return None
    
    def get_database_stats(self):
        """Get database statistics"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Get response counts per provider (last hour)
            cur.execute("""
                SELECT 
                    model as provider,
                    COUNT(*) as responses,
                    AVG(CASE WHEN response_time_ms IS NOT NULL THEN response_time_ms ELSE 0 END) as avg_response_time,
                    COUNT(DISTINCT domain_id) as unique_domains
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '1 hour'
                GROUP BY model
                ORDER BY responses DESC
            """)
            
            stats = {}
            for row in cur.fetchall():
                stats[row[0]] = {
                    'responses': row[1],
                    'avg_response_time': row[2],
                    'unique_domains': row[3]
                }
            
            cur.close()
            conn.close()
            return stats
            
        except Exception as e:
            console.print(f"[red]Database error: {e}[/red]")
            return {}
    
    def create_provider_table(self, validation_data, db_stats):
        """Create provider status table"""
        table = Table(title=f"LLM Provider Status - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        table.add_column("Provider", style="cyan", no_wrap=True)
        table.add_column("Status", style="green")
        table.add_column("Model", style="yellow")
        table.add_column("Response Time", style="blue")
        table.add_column("Keys", style="magenta")
        table.add_column("Last Hour", style="white")
        table.add_column("Health", style="green")
        
        if not validation_data:
            return table
        
        providers_data = validation_data.get('providers', {})
        
        for provider in self.providers:
            data = providers_data.get(provider, {})
            db_data = db_stats.get(provider, {})
            
            # Status
            if data.get('working'):
                status = "✅ Working"
                health = "🟢"
            else:
                status = "❌ Failed"
                health = "🔴"
            
            # Model
            model = data.get('model', 'Unknown')
            if data.get('alternativeModels'):
                model += f" (+{len(data['alternativeModels'])} alts)"
            
            # Response time
            response_time = f"{data.get('responseTime', 0)}ms"
            
            # Keys (from environment endpoint)
            keys = "?"
            
            # Last hour stats
            if db_data:
                last_hour = f"{db_data['responses']} reqs"
            else:
                last_hour = "0 reqs"
            
            table.add_row(
                provider.capitalize(),
                status,
                model[:30],
                response_time,
                keys,
                last_hour,
                health
            )
        
        return table
    
    def create_summary_panel(self, validation_data):
        """Create summary statistics panel"""
        if not validation_data:
            return Panel("No data available", title="Summary")
        
        summary = validation_data.get('summary', {})
        
        content = f"""
[green]Working Providers:[/green] {summary.get('working', 0)}/{summary.get('total', 0)}
[yellow]Health Score:[/yellow] {summary.get('health', 'Unknown')}
[blue]Total Response Time:[/blue] {validation_data.get('totalTime', 0)}ms
[magenta]Last Check:[/magenta] {validation_data.get('timestamp', 'Unknown')}
        """
        
        return Panel(content.strip(), title="System Summary")
    
    def create_recommendations_panel(self, validation_data):
        """Create recommendations panel"""
        if not validation_data or 'recommendations' not in validation_data:
            return Panel("No recommendations", title="Recommendations")
        
        recs = validation_data.get('recommendations', [])
        if not recs:
            content = "[green]✅ All providers configured correctly![/green]"
        else:
            content = "\n".join(recs[:5])  # Show top 5 recommendations
        
        return Panel(content, title="Recommendations")
    
    def create_activity_panel(self, db_stats):
        """Create recent activity panel"""
        total_responses = sum(s.get('responses', 0) for s in db_stats.values())
        active_providers = len([p for p in db_stats if db_stats[p].get('responses', 0) > 0])
        
        content = f"""
[cyan]Last Hour Activity:[/cyan]
Total Responses: {total_responses}
Active Providers: {active_providers}/11
Domains Processed: {sum(s.get('unique_domains', 0) for s in db_stats.values())}
        """
        
        return Panel(content.strip(), title="Recent Activity")
    
    def create_dashboard_layout(self):
        """Create the full dashboard layout"""
        layout = Layout()
        
        # Get fresh data
        validation_data = self.get_validation_data()
        db_stats = self.get_database_stats()
        
        # Create components
        provider_table = self.create_provider_table(validation_data, db_stats)
        summary_panel = self.create_summary_panel(validation_data)
        recommendations_panel = self.create_recommendations_panel(validation_data)
        activity_panel = self.create_activity_panel(db_stats)
        
        # Arrange layout
        layout.split_column(
            Layout(summary_panel, size=7),
            Layout(provider_table, size=15),
            Layout(name="bottom", size=10)
        )
        
        layout["bottom"].split_row(
            Layout(activity_panel),
            Layout(recommendations_panel)
        )
        
        return layout
    
    async def run_dashboard(self, refresh_interval=30):
        """Run the live dashboard"""
        with Live(self.create_dashboard_layout(), refresh_per_second=1) as live:
            while True:
                await asyncio.sleep(refresh_interval)
                live.update(self.create_dashboard_layout())

def main():
    """Run the monitoring dashboard"""
    console.print(Panel.fit(
        "[bold cyan]LLM Provider Monitoring Dashboard[/bold cyan]\n" +
        "Real-time monitoring of all 11 LLM providers",
        border_style="cyan"
    ))
    
    dashboard = LLMMonitoringDashboard()
    
    try:
        # Run the dashboard
        asyncio.run(dashboard.run_dashboard(refresh_interval=30))
    except KeyboardInterrupt:
        console.print("\n[yellow]Dashboard stopped by user[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Dashboard error: {e}[/red]")

if __name__ == "__main__":
    # Check if rich is installed
    try:
        import rich
    except ImportError:
        print("Installing required dependency: rich")
        os.system("pip install rich")
    
    main()