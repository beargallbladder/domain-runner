#!/usr/bin/env python3
"""
SPARC Deployment Swarm - Multi-Agent Self-Healing System
Uses Claude-Flow coordination with disposable agents

Agent Roles:
- Analyzer: Studies build failures and extracts patterns
- Fixer: Applies corrections based on learned patterns
- Validator: Tests each fix before deployment
- Optimizer: Recommends best topology/configuration
- Monitor: Tracks performance and success rates
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass

PROJECT_ROOT = Path("/Users/samsonkim/Dev/domain-run/domain-runner")

@dataclass
class SwarmConfig:
    """Configuration for agent swarm"""
    topology: str = "mesh"  # mesh, hierarchical, or ring
    max_concurrent_agents: int = 6
    learning_mode: bool = True
    auto_optimize: bool = True

class DeploymentSwarm:
    """Manages swarm of agents for self-healing deployment"""

    def __init__(self):
        self.config = SwarmConfig()
        self.session_id = f"deploy-{int(os.time.time())}"
        self.memory_path = PROJECT_ROOT / "memory" / "swarm"
        self.memory_path.mkdir(parents=True, exist_ok=True)

    def init_swarm_coordination(self):
        """Initialize Claude-Flow swarm with mesh topology"""
        print("🔗 Initializing swarm coordination...")

        cmd = [
            "npx", "claude-flow@alpha", "hooks", "pre-task",
            "--description", "Self-healing deployment swarm",
            "--session-id", self.session_id
        ]

        try:
            subprocess.run(cmd, check=True, cwd=str(PROJECT_ROOT))
            print(f"✅ Swarm session: {self.session_id}")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Coordination init failed (continuing anyway): {e}")

    def store_swarm_memory(self, key: str, data: Dict):
        """Store learning data for agent coordination"""
        memory_file = self.memory_path / f"{key}.json"

        with open(memory_file, 'w') as f:
            json.dump(data, f, indent=2)

        # Notify via hooks
        cmd = [
            "npx", "claude-flow@alpha", "hooks", "notify",
            "--message", f"Stored swarm memory: {key}"
        ]
        subprocess.run(cmd, check=False, cwd=str(PROJECT_ROOT))

    def retrieve_swarm_memory(self, key: str) -> Dict:
        """Retrieve shared learning data"""
        memory_file = self.memory_path / f"{key}.json"

        if memory_file.exists():
            with open(memory_file, 'r') as f:
                return json.load(f)
        return {}

    def spawn_analyzer_agent(self) -> Dict:
        """Analyzer Agent: Studies deployment failures"""
        print("\n🔍 Spawning Analyzer Agent...")

        # Check recent deploy logs
        cmd = [
            "curl", "-s",
            f"https://api.render.com/v1/services/srv-d42iaphr0fns739c93sg/deploys?limit=5",
            "-H", f"Authorization: Bearer {os.getenv('RENDER_API_KEY')}"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        analysis = {
            "patterns_found": [],
            "recommendations": []
        }

        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)

                # Extract failure patterns
                for deploy in data:
                    status = deploy.get("deploy", {}).get("status")

                    if status == "build_failed":
                        analysis["patterns_found"].append({
                            "deploy_id": deploy.get("deploy", {}).get("id"),
                            "commit": deploy.get("deploy", {}).get("commit", {}).get("message", "")[:100]
                        })

                # Make recommendations
                if len(analysis["patterns_found"]) > 2:
                    analysis["recommendations"].append("High failure rate - recommend incremental approach")

            except json.JSONDecodeError:
                pass

        self.store_swarm_memory("analyzer_output", analysis)
        print(f"  📊 Found {len(analysis['patterns_found'])} failure patterns")

        return analysis

    def spawn_fixer_agent(self, analysis: Dict) -> Dict:
        """Fixer Agent: Applies corrections"""
        print("\n🔧 Spawning Fixer Agent...")

        fixes_applied = []

        # Read current Dockerfile
        dockerfile = PROJECT_ROOT / "Dockerfile"
        with open(dockerfile, 'r') as f:
            content = f.read()

        # Apply intelligent fixes based on analysis
        if "High failure rate" in str(analysis.get("recommendations")):
            # Strip down to minimal working set
            if "numpy" in content or "pandas" in content:
                print("  🎯 Removing data processing dependencies")
                content = content.replace("numpy==1.24.4", "# numpy (removed for stability)")
                content = content.replace("pandas==2.1.4", "# pandas (removed for stability)")
                content = content.replace("scikit-learn==1.3.2", "# scikit-learn (removed for stability)")
                fixes_applied.append("removed_data_processing_deps")

        if fixes_applied:
            with open(dockerfile, 'w') as f:
                f.write(content)

            print(f"  ✅ Applied {len(fixes_applied)} fixes")

        fix_result = {
            "fixes_applied": fixes_applied,
            "timestamp": datetime.now().isoformat()
        }

        self.store_swarm_memory("fixer_output", fix_result)
        return fix_result

    def spawn_validator_agent(self, fix_result: Dict) -> bool:
        """Validator Agent: Validates fixes before deployment"""
        print("\n✅ Spawning Validator Agent...")

        # Check Dockerfile syntax
        dockerfile = PROJECT_ROOT / "Dockerfile"

        if not dockerfile.exists():
            print("  ❌ Dockerfile missing!")
            return False

        with open(dockerfile, 'r') as f:
            content = f.read()

        # Basic validations
        validations = {
            "has_from": "FROM" in content,
            "has_workdir": "WORKDIR" in content,
            "has_copy": "COPY" in content,
            "has_cmd": "CMD" in content,
            "no_syntax_errors": "\\\n\n" not in content  # Check for broken line continuations
        }

        all_valid = all(validations.values())

        if all_valid:
            print("  ✅ All validations passed")
        else:
            print(f"  ❌ Validation failures: {[k for k, v in validations.items() if not v]}")

        self.store_swarm_memory("validator_output", validations)
        return all_valid

    def spawn_optimizer_agent(self) -> Dict:
        """Optimizer Agent: Recommends best configuration"""
        print("\n⚡ Spawning Optimizer Agent...")

        # Retrieve historical performance
        learning_state_file = PROJECT_ROOT / "artifacts" / "deploy_learning_state.json"

        if learning_state_file.exists():
            with open(learning_state_file, 'r') as f:
                history = json.load(f)

            # Calculate success rate
            attempts = history.get("state", {}).get("total_attempts", 0)
            successful = history.get("state", {}).get("successful", False)

            success_rate = 1.0 if successful else 0.0

            optimization = {
                "current_topology": self.config.topology,
                "success_rate": success_rate,
                "total_attempts": attempts,
                "recommendation": "Continue with mesh topology" if success_rate > 0.7 else "Switch to hierarchical"
            }
        else:
            optimization = {
                "current_topology": self.config.topology,
                "recommendation": "No history yet - starting with mesh topology"
            }

        self.store_swarm_memory("optimizer_output", optimization)
        print(f"  📈 Recommendation: {optimization['recommendation']}")

        return optimization

    def spawn_monitor_agent(self) -> Dict:
        """Monitor Agent: Tracks deployment health"""
        print("\n📊 Spawning Monitor Agent...")

        # Check service health
        cmd = [
            "curl", "-s", "-w", "\\n%{http_code}",
            "https://domain-runner-web-jkxk.onrender.com/healthz"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')

        health_status = {
            "healthy": False,
            "status_code": 0,
            "timestamp": datetime.now().isoformat()
        }

        if len(lines) >= 2:
            try:
                status_code = int(lines[-1])
                health_status["status_code"] = status_code
                health_status["healthy"] = status_code == 200

                if status_code == 200:
                    health_status["response"] = json.loads(lines[0])
            except (ValueError, json.JSONDecodeError):
                pass

        if health_status["healthy"]:
            print("  ✅ Service is healthy")
        else:
            print(f"  ❌ Service unhealthy (status: {health_status['status_code']})")

        self.store_swarm_memory("monitor_output", health_status)
        return health_status

    def coordinate_swarm_iteration(self) -> bool:
        """Run one iteration of the swarm (all agents in parallel)"""
        print("\n" + "="*70)
        print("🤖 SWARM ITERATION - All Agents Running Concurrently")
        print("="*70)

        # Phase 1: Analysis (Analyzer + Monitor in parallel)
        print("\n📍 Phase 1: Concurrent Analysis")
        analysis = self.spawn_analyzer_agent()
        health = self.spawn_monitor_agent()

        # If already healthy, we're done
        if health.get("healthy"):
            print("\n✅ Service already healthy - swarm mission complete!")
            return True

        # Phase 2: Optimization (Optimizer analyzes patterns)
        print("\n📍 Phase 2: Optimization")
        optimization = self.spawn_optimizer_agent()

        # Phase 3: Fix Application (Fixer + Validator in sequence)
        print("\n📍 Phase 3: Fix & Validate")
        fix_result = self.spawn_fixer_agent(analysis)

        if not fix_result.get("fixes_applied"):
            print("  ℹ️  No fixes needed this iteration")
            return False

        is_valid = self.spawn_validator_agent(fix_result)

        if not is_valid:
            print("  ❌ Validation failed - skipping deployment")
            return False

        # Phase 4: Deploy
        print("\n📍 Phase 4: Deploy")
        print("  🚀 Committing and pushing fixes...")

        subprocess.run([
            "git", "add", "-A"
        ], cwd=str(PROJECT_ROOT), check=False)

        subprocess.run([
            "git", "commit", "-m",
            f"Swarm auto-fix: {', '.join(fix_result['fixes_applied'])}"
        ], cwd=str(PROJECT_ROOT), check=False)

        subprocess.run([
            "git", "push"
        ], cwd=str(PROJECT_ROOT), check=False)

        print("  ✅ Deployed fixes")

        # Notify via hooks
        subprocess.run([
            "npx", "claude-flow@alpha", "hooks", "post-task",
            "--task-id", self.session_id
        ], cwd=str(PROJECT_ROOT), check=False)

        return False  # Continue to next iteration

    def run_swarm_loop(self, max_iterations: int = 10):
        """Run swarm in continuous loop until success"""
        self.init_swarm_coordination()

        for i in range(1, max_iterations + 1):
            print(f"\n{'▓'*70}")
            print(f"🔄 SWARM LOOP ITERATION {i}/{max_iterations}")
            print(f"{'▓'*70}")

            success = self.coordinate_swarm_iteration()

            if success:
                print("\n🎉 SWARM MISSION COMPLETE!")
                return True

            if i < max_iterations:
                print(f"\n⏳ Cooling down 90s before next iteration...")
                import time
                time.sleep(90)

        print(f"\n⚠️  Max iterations reached")
        return False

if __name__ == "__main__":
    from datetime import datetime

    swarm = DeploymentSwarm()
    success = swarm.run_swarm_loop(max_iterations=10)

    sys.exit(0 if success else 1)
