#!/usr/bin/env python3
"""
Memory Guardian - Real-time memory monitoring and circuit breaker
Protects against memory overload with multi-tier response system
"""

import psutil
import json
import time
import gc
import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple

class MemoryGuardian:
    def __init__(self):
        self.WARNING_THRESHOLD_GB = 1.2
        self.CLEANUP_THRESHOLD_GB = 1.3
        self.EMERGENCY_STOP_GB = 1.5
        self.MAX_ALLOWED_GB = 2.0
        
        self.monitoring_interval = 30  # seconds
        self.memory_history = []
        self.last_gc_time = time.time()
        self.alerts_sent = set()
        
    def get_memory_stats(self) -> Dict:
        """Get current memory statistics"""
        mem = psutil.virtual_memory()
        process = psutil.Process()
        
        # Get project-specific memory usage
        project_memory_mb = 0
        for proc in psutil.process_iter(['pid', 'name', 'memory_info']):
            try:
                if any(name in proc.info['name'] for name in ['node', 'python', 'npm']):
                    project_memory_mb += proc.info['memory_info'].rss / 1024 / 1024
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        return {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'total_gb': mem.total / 1024 / 1024 / 1024,
                'used_gb': mem.used / 1024 / 1024 / 1024,
                'available_gb': mem.available / 1024 / 1024 / 1024,
                'percent': mem.percent
            },
            'project': {
                'memory_mb': project_memory_mb,
                'memory_gb': project_memory_mb / 1024
            },
            'process': {
                'current_mb': process.memory_info().rss / 1024 / 1024
            }
        }
    
    def predict_memory_trend(self) -> Tuple[float, str]:
        """Predict memory usage trend based on history"""
        if len(self.memory_history) < 3:
            return 0.0, "insufficient_data"
        
        # Calculate rate of change
        recent = self.memory_history[-3:]
        deltas = []
        for i in range(1, len(recent)):
            time_diff = (recent[i]['timestamp'] - recent[i-1]['timestamp']).total_seconds()
            mem_diff = recent[i]['project']['memory_gb'] - recent[i-1]['project']['memory_gb']
            if time_diff > 0:
                deltas.append(mem_diff / time_diff * 3600)  # GB per hour
        
        if not deltas:
            return 0.0, "stable"
        
        avg_rate = sum(deltas) / len(deltas)
        
        if avg_rate > 0.1:
            return avg_rate, "increasing_rapidly"
        elif avg_rate > 0.05:
            return avg_rate, "increasing"
        elif avg_rate < -0.05:
            return avg_rate, "decreasing"
        else:
            return avg_rate, "stable"
    
    def trigger_cleanup(self, level: str) -> Dict:
        """Trigger memory cleanup based on severity level"""
        actions_taken = []
        
        if level in ["warning", "cleanup", "emergency"]:
            # Force garbage collection
            gc.collect()
            actions_taken.append("forced_gc")
            
        if level in ["cleanup", "emergency"]:
            # Clear caches
            if hasattr(sys, 'getsizeof'):
                # Clear module caches
                for module in list(sys.modules.values()):
                    if hasattr(module, '__dict__'):
                        for attr in ['_cache', 'cache', '_tensor_cache']:
                            if hasattr(module, attr):
                                setattr(module, attr, {})
                                actions_taken.append(f"cleared_{attr}")
            
        if level == "emergency":
            # Emergency measures
            actions_taken.append("emergency_stop_initiated")
            # Write emergency state
            with open('/tmp/memory_emergency.json', 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'memory_gb': self.get_memory_stats()['project']['memory_gb'],
                    'action': 'emergency_stop'
                }, f)
        
        return {
            'level': level,
            'actions': actions_taken,
            'timestamp': datetime.now().isoformat()
        }
    
    def check_circuit_breaker(self, stats: Dict) -> Tuple[str, Dict]:
        """Check memory against circuit breaker thresholds"""
        project_gb = stats['project']['memory_gb']
        
        if project_gb >= self.EMERGENCY_STOP_GB:
            return "emergency", self.trigger_cleanup("emergency")
        elif project_gb >= self.CLEANUP_THRESHOLD_GB:
            return "cleanup", self.trigger_cleanup("cleanup")
        elif project_gb >= self.WARNING_THRESHOLD_GB:
            return "warning", self.trigger_cleanup("warning")
        else:
            return "healthy", {"status": "healthy", "memory_gb": project_gb}
    
    def monitor_loop(self):
        """Main monitoring loop"""
        print("🛡️ Memory Guardian activated")
        print(f"⚡ Circuit breaker thresholds: Warning={self.WARNING_THRESHOLD_GB}GB, Cleanup={self.CLEANUP_THRESHOLD_GB}GB, Emergency={self.EMERGENCY_STOP_GB}GB")
        
        while True:
            try:
                # Get current stats
                stats = self.get_memory_stats()
                self.memory_history.append({
                    'timestamp': datetime.fromisoformat(stats['timestamp']),
                    'project': stats['project']
                })
                
                # Keep only last hour of history
                cutoff = datetime.now().timestamp() - 3600
                self.memory_history = [h for h in self.memory_history 
                                     if h['timestamp'].timestamp() > cutoff]
                
                # Check circuit breaker
                status, action = self.check_circuit_breaker(stats)
                
                # Predict trend
                rate, trend = self.predict_memory_trend()
                
                # Report status
                report = {
                    'timestamp': stats['timestamp'],
                    'status': status,
                    'memory': {
                        'project_gb': stats['project']['memory_gb'],
                        'available_gb': stats['system']['available_gb']
                    },
                    'trend': {
                        'direction': trend,
                        'rate_gb_per_hour': rate
                    },
                    'action': action
                }
                
                # Output report
                print(f"\n{'='*60}")
                print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"📊 Project Memory: {stats['project']['memory_gb']:.3f}GB ({status.upper()})")
                print(f"💾 System Available: {stats['system']['available_gb']:.2f}GB")
                print(f"📈 Trend: {trend} ({rate:+.3f}GB/hr)")
                
                if status != "healthy":
                    print(f"🚨 ALERT: {status.upper()} - Actions: {action.get('actions', [])}")
                
                # Send alert if needed
                if status != "healthy" and status not in self.alerts_sent:
                    alert_msg = f"MEMORY_{status.upper()}: {stats['project']['memory_gb']:.3f}GB used"
                    os.system(f'npx claude-flow hooks notification --message "{alert_msg}" --telemetry true')
                    self.alerts_sent.add(status)
                elif status == "healthy":
                    self.alerts_sent.clear()
                
                # Save state
                with open('/tmp/memory_guardian_state.json', 'w') as f:
                    json.dump(report, f, indent=2)
                
                # Sleep until next check
                time.sleep(self.monitoring_interval)
                
            except KeyboardInterrupt:
                print("\n👋 Memory Guardian shutting down")
                break
            except Exception as e:
                print(f"❌ Error in monitoring: {e}")
                time.sleep(5)  # Brief pause before retry

if __name__ == "__main__":
    guardian = MemoryGuardian()
    guardian.monitor_loop()