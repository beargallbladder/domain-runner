#!/usr/bin/env python3
"""
DRIFT MONITORING DASHBOARD - Real-time Quality Monitoring
Interactive dashboard for monitoring data quality, drift detection,
and system health in the domain intelligence pipeline.
"""

import asyncio
import asyncpg
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import streamlit as st
import numpy as np
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DashboardConfig:
    """Configuration for the drift monitoring dashboard"""
    database_url: str
    refresh_interval: int = 30  # seconds
    max_domains_display: int = 100
    alert_retention_days: int = 7
    
class DriftMonitoringDashboard:
    """Real-time dashboard for drift monitoring"""
    
    def __init__(self, config: DashboardConfig):
        self.config = config
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize database connection"""
        self.pool = await asyncpg.create_pool(
            self.config.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30
        )
        logger.info("✅ Dashboard database connection initialized")
    
    async def get_system_overview(self) -> Dict[str, Any]:
        """Get high-level system health metrics"""
        async with self.pool.acquire() as conn:
            # Last 24 hours overview
            overview = await conn.fetchrow("""
                SELECT 
                    COUNT(DISTINCT batch_id) as total_batches,
                    SUM(CASE WHEN quality_gate_passed THEN 1 ELSE 0 END) as passed_batches,
                    AVG((report_data->>'avg_drift_score')::float) as avg_drift_score,
                    MAX((report_data->>'drift_percentage')::float) as max_drift_percentage,
                    MIN(created_at) as earliest_batch,
                    MAX(created_at) as latest_batch
                FROM drift_reports
                WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            
            # Active alerts
            active_alerts = await conn.fetchval("""
                SELECT COUNT(*) FROM quality_alerts 
                WHERE resolved = false
                AND created_at > NOW() - INTERVAL '24 hours'
            """)
            
            # Domain coverage
            domain_stats = await conn.fetchrow("""
                SELECT 
                    COUNT(DISTINCT domain) as total_domains,
                    COUNT(*) as total_measurements,
                    AVG(drift_score) as avg_drift_score,
                    COUNT(*) FILTER (WHERE drift_score > 0.1) as high_drift_count
                FROM domain_quality_metrics
                WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
            """)
            
            # Processing rate
            processing_rate = await conn.fetchval("""
                SELECT COUNT(*) / 24.0 as domains_per_hour
                FROM domain_quality_metrics
                WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
            """)
            
            return {
                'total_batches': overview['total_batches'] or 0,
                'passed_batches': overview['passed_batches'] or 0,
                'pass_rate': (overview['passed_batches'] or 0) / max(1, overview['total_batches'] or 1),
                'avg_drift_score': overview['avg_drift_score'] or 0,
                'max_drift_percentage': overview['max_drift_percentage'] or 0,
                'active_alerts': active_alerts or 0,
                'total_domains': domain_stats['total_domains'] or 0,
                'total_measurements': domain_stats['total_measurements'] or 0,
                'domain_avg_drift': domain_stats['avg_drift_score'] or 0,
                'high_drift_domains': domain_stats['high_drift_count'] or 0,
                'processing_rate': processing_rate or 0,
                'earliest_batch': overview['earliest_batch'],
                'latest_batch': overview['latest_batch'],
                'system_health': self._calculate_system_health(overview, active_alerts, domain_stats)
            }
    
    def _calculate_system_health(self, overview, active_alerts, domain_stats) -> str:
        """Calculate overall system health status"""
        pass_rate = (overview['passed_batches'] or 0) / max(1, overview['total_batches'] or 1)
        avg_drift = overview['avg_drift_score'] or 0
        alerts = active_alerts or 0
        
        if pass_rate > 0.95 and avg_drift < 0.05 and alerts == 0:
            return "EXCELLENT"
        elif pass_rate > 0.9 and avg_drift < 0.1 and alerts < 3:
            return "GOOD"
        elif pass_rate > 0.8 and avg_drift < 0.15 and alerts < 5:
            return "WARNING"
        else:
            return "CRITICAL"
    
    async def get_drift_trends(self, hours: int = 24) -> pd.DataFrame:
        """Get drift trends over time"""
        async with self.pool.acquire() as conn:
            trends = await conn.fetch("""
                SELECT 
                    DATE_TRUNC('hour', created_at) as hour_bucket,
                    COUNT(*) as batch_count,
                    AVG((report_data->>'avg_drift_score')::float) as avg_drift_score,
                    AVG((report_data->>'drift_percentage')::float) as avg_drift_percentage,
                    SUM(CASE WHEN quality_gate_passed THEN 1 ELSE 0 END) as passed_count,
                    SUM(CASE WHEN NOT quality_gate_passed THEN 1 ELSE 0 END) as failed_count,
                    MAX((report_data->>'high_drift_count')::int) as max_high_drift_count
                FROM drift_reports 
                WHERE created_at > NOW() - INTERVAL '%d hours'
                GROUP BY DATE_TRUNC('hour', created_at)
                ORDER BY hour_bucket
            """ % hours)
            
            return pd.DataFrame([dict(row) for row in trends])
    
    async def get_top_drifting_domains(self, limit: int = 20) -> pd.DataFrame:
        """Get domains with highest drift scores"""
        async with self.pool.acquire() as conn:
            domains = await conn.fetch("""
                SELECT 
                    domain,
                    AVG(drift_score) as avg_drift_score,
                    MAX(drift_score) as max_drift_score,
                    COUNT(*) as measurement_count,
                    MAX(metric_timestamp) as last_measured,
                    AVG(memory_score) as avg_memory_score,
                    SUM(error_count) as total_errors,
                    array_agg(DISTINCT unnest(quality_flags)) FILTER (WHERE quality_flags IS NOT NULL) as issues
                FROM domain_quality_metrics 
                WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY domain
                HAVING AVG(drift_score) > 0.05
                ORDER BY avg_drift_score DESC
                LIMIT %d
            """ % limit)
            
            return pd.DataFrame([dict(row) for row in domains])
    
    async def get_quality_distribution(self) -> Dict[str, Any]:
        """Get distribution of quality metrics"""
        async with self.pool.acquire() as conn:
            distribution = await conn.fetch("""
                SELECT 
                    CASE 
                        WHEN drift_score < 0.05 THEN 'Excellent'
                        WHEN drift_score < 0.1 THEN 'Good'
                        WHEN drift_score < 0.2 THEN 'Warning'
                        ELSE 'Critical'
                    END as quality_category,
                    COUNT(*) as count,
                    AVG(memory_score) as avg_memory_score
                FROM domain_quality_metrics
                WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY 1
                ORDER BY 1
            """)
            
            return {
                'categories': [row['quality_category'] for row in distribution],
                'counts': [row['count'] for row in distribution],
                'avg_scores': [row['avg_memory_score'] for row in distribution]
            }
    
    async def get_recent_alerts(self, limit: int = 10) -> pd.DataFrame:
        """Get recent quality alerts"""
        async with self.pool.acquire() as conn:
            alerts = await conn.fetch("""
                SELECT 
                    batch_id,
                    alert_type,
                    severity,
                    details,
                    resolved,
                    created_at,
                    resolved_at
                FROM quality_alerts
                WHERE created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT %d
            """ % limit)
            
            return pd.DataFrame([dict(row) for row in alerts])
    
    async def get_processing_performance(self) -> Dict[str, Any]:
        """Get processing performance metrics"""
        async with self.pool.acquire() as conn:
            performance = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(*) / EXTRACT(EPOCH FROM (MAX(metric_timestamp) - MIN(metric_timestamp))) * 3600 as hourly_rate,
                    AVG(EXTRACT(EPOCH FROM (metric_timestamp - LAG(metric_timestamp) OVER (ORDER BY metric_timestamp)))) as avg_interval_seconds,
                    MIN(metric_timestamp) as start_time,
                    MAX(metric_timestamp) as end_time
                FROM domain_quality_metrics
                WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
            """)
            
            # Batch processing stats
            batch_stats = await conn.fetchrow("""
                SELECT 
                    AVG((report_data->>'total_domains')::int) as avg_batch_size,
                    MAX((report_data->>'total_domains')::int) as max_batch_size,
                    MIN((report_data->>'total_domains')::int) as min_batch_size,
                    COUNT(*) as total_batches
                FROM drift_reports
                WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            
            return {
                'total_processed': performance['total_processed'] or 0,
                'hourly_rate': performance['hourly_rate'] or 0,
                'avg_interval_seconds': performance['avg_interval_seconds'] or 0,
                'start_time': performance['start_time'],
                'end_time': performance['end_time'],
                'avg_batch_size': batch_stats['avg_batch_size'] or 0,
                'max_batch_size': batch_stats['max_batch_size'] or 0,
                'min_batch_size': batch_stats['min_batch_size'] or 0,
                'total_batches': batch_stats['total_batches'] or 0
            }
    
    def create_drift_trend_chart(self, trends_df: pd.DataFrame) -> go.Figure:
        """Create drift trend visualization"""
        fig = make_subplots(
            rows=3, cols=1,
            subplot_titles=('Drift Score Over Time', 'Batch Success Rate', 'Processing Volume'),
            vertical_spacing=0.1,
            specs=[[{"secondary_y": True}], [{"secondary_y": False}], [{"secondary_y": True}]]
        )
        
        if not trends_df.empty:
            # Drift score trend
            fig.add_trace(
                go.Scatter(
                    x=trends_df['hour_bucket'],
                    y=trends_df['avg_drift_score'],
                    mode='lines+markers',
                    name='Avg Drift Score',
                    line=dict(color='red', width=2)
                ),
                row=1, col=1
            )
            
            # Success rate
            success_rate = trends_df['passed_count'] / (trends_df['passed_count'] + trends_df['failed_count'])
            fig.add_trace(
                go.Scatter(
                    x=trends_df['hour_bucket'],
                    y=success_rate,
                    mode='lines+markers',
                    name='Success Rate',
                    line=dict(color='green', width=2),
                    fill='tonexty'
                ),
                row=2, col=1
            )
            
            # Processing volume
            fig.add_trace(
                go.Bar(
                    x=trends_df['hour_bucket'],
                    y=trends_df['batch_count'],
                    name='Batch Count',
                    marker_color='blue',
                    opacity=0.7
                ),
                row=3, col=1
            )
        
        fig.update_layout(
            height=800,
            title_text="Drift Monitoring Trends (24 Hours)",
            showlegend=True
        )
        
        return fig
    
    def create_quality_distribution_chart(self, distribution: Dict[str, Any]) -> go.Figure:
        """Create quality distribution pie chart"""
        colors = ['#2ecc71', '#f39c12', '#e67e22', '#e74c3c']  # Green, Yellow, Orange, Red
        
        fig = go.Figure(data=[go.Pie(
            labels=distribution['categories'],
            values=distribution['counts'],
            marker_colors=colors[:len(distribution['categories'])],
            textinfo='label+percent+value',
            hovertemplate='<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percent}<extra></extra>'
        )])
        
        fig.update_layout(
            title="Quality Distribution (Last 24 Hours)",
            height=400
        )
        
        return fig
    
    def create_top_domains_chart(self, domains_df: pd.DataFrame) -> go.Figure:
        """Create top drifting domains chart"""
        if domains_df.empty:
            return go.Figure()
        
        fig = go.Figure()
        
        # Bar chart for drift scores
        fig.add_trace(go.Bar(
            x=domains_df['domain'][:20],
            y=domains_df['avg_drift_score'],
            name='Avg Drift Score',
            marker_color='red',
            opacity=0.7,
            text=domains_df['measurement_count'],
            texttemplate='%{text} measurements',
            textposition='outside'
        ))
        
        fig.update_layout(
            title="Top 20 Drifting Domains",
            xaxis_title="Domain",
            yaxis_title="Average Drift Score",
            height=500,
            xaxis_tickangle=-45
        )
        
        return fig
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.pool:
            await self.pool.close()

# Streamlit Dashboard UI
def main():
    """Main Streamlit dashboard"""
    st.set_page_config(
        page_title="Drift Monitoring Dashboard",
        page_icon="📊",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    st.title("🔍 Domain Intelligence - Drift Monitoring Dashboard")
    st.markdown("Real-time monitoring of data quality and drift detection")
    
    # Initialize dashboard
    @st.cache_resource
    def init_dashboard():
        database_url = os.environ.get(
            'DATABASE_URL',
            'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
        )
        config = DashboardConfig(database_url=database_url)
        dashboard = DriftMonitoringDashboard(config)
        return dashboard
    
    dashboard = init_dashboard()
    
    # Sidebar controls
    st.sidebar.header("⚙️ Controls")
    auto_refresh = st.sidebar.checkbox("Auto Refresh", value=True)
    refresh_interval = st.sidebar.slider("Refresh Interval (seconds)", 10, 300, 30)
    hours_back = st.sidebar.slider("Hours of History", 1, 168, 24)
    
    # Manual refresh button
    if st.sidebar.button("🔄 Refresh Now"):
        st.rerun()
    
    # Auto refresh
    if auto_refresh:
        time.sleep(refresh_interval)
        st.rerun()
    
    try:
        # Initialize connection
        asyncio.run(dashboard.initialize())
        
        # Get data
        overview = asyncio.run(dashboard.get_system_overview())
        trends_df = asyncio.run(dashboard.get_drift_trends(hours_back))
        top_domains_df = asyncio.run(dashboard.get_top_drifting_domains())
        quality_dist = asyncio.run(dashboard.get_quality_distribution())
        alerts_df = asyncio.run(dashboard.get_recent_alerts())
        performance = asyncio.run(dashboard.get_processing_performance())
        
        # System Overview
        st.header("📈 System Overview")
        
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            health_color = {
                'EXCELLENT': '🟢',
                'GOOD': '🟡', 
                'WARNING': '🟠',
                'CRITICAL': '🔴'
            }.get(overview['system_health'], '⚪')
            st.metric(
                "System Health",
                f"{health_color} {overview['system_health']}",
                delta=f"{overview['pass_rate']:.1%} pass rate"
            )
        
        with col2:
            st.metric(
                "Total Domains",
                f"{overview['total_domains']:,}",
                delta=f"{overview['high_drift_domains']} high drift"
            )
        
        with col3:
            st.metric(
                "Avg Drift Score",
                f"{overview['avg_drift_score']:.3f}",
                delta=f"{overview['domain_avg_drift']:.3f} domains avg"
            )
        
        with col4:
            st.metric(
                "Active Alerts",
                overview['active_alerts'],
                delta="0 resolved" if overview['active_alerts'] == 0 else f"{overview['active_alerts']} pending"
            )
        
        with col5:
            st.metric(
                "Processing Rate",
                f"{overview['processing_rate']:.1f}/hr",
                delta=f"{performance['total_batches']} batches"
            )
        
        # Charts row
        st.header("📊 Trends & Analysis")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            # Drift trends
            trend_chart = dashboard.create_drift_trend_chart(trends_df)
            st.plotly_chart(trend_chart, use_container_width=True)
        
        with col2:
            # Quality distribution
            quality_chart = dashboard.create_quality_distribution_chart(quality_dist)
            st.plotly_chart(quality_chart, use_container_width=True)
        
        # Top drifting domains
        st.header("🚨 Top Drifting Domains")
        if not top_domains_df.empty:
            domains_chart = dashboard.create_top_domains_chart(top_domains_df)
            st.plotly_chart(domains_chart, use_container_width=True)
            
            # Detailed table
            st.subheader("Detailed Domain Analysis")
            display_df = top_domains_df.copy()
            display_df['last_measured'] = pd.to_datetime(display_df['last_measured'])
            display_df['avg_drift_score'] = display_df['avg_drift_score'].round(4)
            display_df['avg_memory_score'] = display_df['avg_memory_score'].round(2)
            
            st.dataframe(
                display_df[['domain', 'avg_drift_score', 'max_drift_score', 'measurement_count', 
                           'avg_memory_score', 'total_errors', 'last_measured']],
                use_container_width=True
            )
        else:
            st.info("No domains with significant drift detected in the last 24 hours")
        
        # Recent alerts
        st.header("🚨 Recent Quality Alerts")
        if not alerts_df.empty:
            # Color code by severity
            def color_severity(val):
                colors = {'high': 'background-color: #ffebee', 
                         'medium': 'background-color: #fff3e0',
                         'low': 'background-color: #e8f5e8'}
                return colors.get(val, '')
            
            styled_alerts = alerts_df.style.applymap(color_severity, subset=['severity'])
            st.dataframe(styled_alerts, use_container_width=True)
        else:
            st.success("No recent quality alerts - system is running smoothly!")
        
        # Performance metrics
        st.header("⚡ Performance Metrics")
        
        perf_col1, perf_col2, perf_col3, perf_col4 = st.columns(4)
        
        with perf_col1:
            st.metric(
                "Processing Rate",
                f"{performance['hourly_rate']:.1f} domains/hr",
                delta=f"{performance['total_processed']} total"
            )
        
        with perf_col2:
            st.metric(
                "Avg Batch Size",
                f"{performance['avg_batch_size']:.0f} domains",
                delta=f"Max: {performance['max_batch_size']}"
            )
        
        with perf_col3:
            st.metric(
                "Avg Processing Interval",
                f"{performance['avg_interval_seconds']:.1f}s",
                delta="Between measurements"
            )
        
        with perf_col4:
            if performance['end_time']:
                time_since = datetime.utcnow() - performance['end_time'].replace(tzinfo=None)
                st.metric(
                    "Last Activity",
                    f"{time_since.seconds // 60}m ago",
                    delta="Minutes since last measurement"
                )
        
        # Footer
        st.markdown("---")
        st.markdown(f"**Last Updated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
    except Exception as e:
        st.error(f"Dashboard Error: {str(e)}")
        logger.error(f"Dashboard error: {e}")
    
    finally:
        # Cleanup
        asyncio.run(dashboard.cleanup())

if __name__ == "__main__":
    main()