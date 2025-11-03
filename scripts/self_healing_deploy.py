#!/usr/bin/env python3
"""
Self-Healing Deployment Loop
Inspired by Agentic Flow v1.90 - continuously iterates until working build

Principles:
1. Study every deployment run and learn what works
2. Automatically apply insights to fix failures
3. Disposable iterations - fast feedback loops
4. Full traceability of every attempt
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

RENDER_API_KEY = os.getenv("RENDER_API_KEY", "rnd_fJ24fhvbmzyWwWoccP6jHMxTiB97")
SERVICE_ID = "srv-d42iaphr0fns739c93sg"
HEALTH_URL = "https://domain-runner-web-jkxk.onrender.com/healthz"

@dataclass
class DeploymentAttempt:
    """Record of each deployment iteration"""
    iteration: int
    timestamp: str
    deploy_id: str
    status: str
    error: Optional[str] = None
    fix_applied: Optional[str] = None
    duration_seconds: float = 0

@dataclass
class LearningState:
    """What we've learned from failures"""
    total_attempts: int = 0
    successful: bool = False
    failed_dependencies: List[str] = None
    known_fixes: Dict[str, str] = None
    performance_map: Dict[str, float] = None

    def __post_init__(self):
        if self.failed_dependencies is None:
            self.failed_dependencies = []
        if self.known_fixes is None:
            self.known_fixes = {}
        if self.performance_map is None:
            self.performance_map = {}

class SelfHealingDeployer:
    """Autonomous deployment system with self-learning"""

    def __init__(self):
        self.state = LearningState()
        self.history: List[DeploymentAttempt] = []
        self.max_iterations = 20

    def get_deploy_status(self, deploy_id: str) -> Dict:
        """Check deployment status via Render API"""
        headers = {"Authorization": f"Bearer {RENDER_API_KEY}"}
        url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys/{deploy_id}"

        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            return {"error": f"API returned {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    def check_health(self) -> Dict:
        """Check if service is healthy"""
        try:
            response = requests.get(HEALTH_URL, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return {"healthy": True, "data": data}
            return {"healthy": False, "status_code": response.status_code}
        except Exception as e:
            return {"healthy": False, "error": str(e)}

    def analyze_failure(self, deploy_data: Dict) -> Optional[str]:
        """Learn from failure and determine fix"""
        # Extract error patterns
        reason = deploy_data.get("reason", {})

        # Check for known patterns
        if "buildFailed" in str(reason):
            # Dependency conflict
            if "numpy" in str(reason) or "pandas" in str(reason):
                self.state.failed_dependencies.extend(["numpy", "pandas", "scikit-learn"])
                return "remove_heavy_deps"

            # Cohere/Google provider issues
            if "cohere" in str(reason).lower() or "google" in str(reason).lower():
                self.state.failed_dependencies.extend(["cohere", "google-generativeai", "replicate"])
                return "remove_secondary_llm_providers"

        # Check if imports failing
        if "import" in str(reason).lower() or "module" in str(reason).lower():
            return "add_missing_init_files"

        return None

    def apply_fix(self, fix_type: str) -> bool:
        """Apply learned fix to Dockerfile"""
        print(f"\n🔧 Applying fix: {fix_type}")

        dockerfile_path = "/Users/samsonkim/Dev/domain-run/domain-runner/Dockerfile"

        with open(dockerfile_path, 'r') as f:
            content = f.read()

        if fix_type == "remove_heavy_deps":
            # Remove numpy, pandas, scikit-learn
            content = content.replace("numpy==1.24.4 \\", "")
            content = content.replace("pandas==2.1.4 \\", "")
            content = content.replace("scikit-learn==1.3.2 \\", "")

        elif fix_type == "remove_secondary_llm_providers":
            # Keep only OpenAI, Anthropic, Together
            content = content.replace("cohere==4.40.0 \\", "")
            content = content.replace("google-generativeai==0.3.2 \\", "")
            content = content.replace("replicate==0.22.0 \\", "")

        elif fix_type == "add_missing_init_files":
            # Ensure Python package structure
            os.system("find /Users/samsonkim/Dev/domain-run/domain-runner/src -type d -exec touch {}/__init__.py \\;")

        # Write fixed Dockerfile
        with open(dockerfile_path, 'w') as f:
            f.write(content)

        # Commit fix
        os.system(f'cd /Users/samsonkim/Dev/domain-run/domain-runner && git add -A && git commit -m "Auto-fix [{fix_type}]: Self-healing loop iteration" && git push')

        return True

    def trigger_deploy(self) -> Optional[str]:
        """Trigger new deployment"""
        headers = {"Authorization": f"Bearer {RENDER_API_KEY}"}
        url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys"

        try:
            response = requests.post(url, headers=headers, json={"clearCache": "do_not_clear"}, timeout=30)
            if response.status_code in [200, 201]:
                data = response.json()
                return data.get("id")
            return None
        except Exception as e:
            print(f"Deploy trigger error: {e}")
            return None

    def wait_for_deploy(self, deploy_id: str, timeout: int = 300) -> Dict:
        """Wait for deployment to complete"""
        start = time.time()

        while time.time() - start < timeout:
            status_data = self.get_deploy_status(deploy_id)
            status = status_data.get("status", "unknown")

            print(f"  Status: {status}", end="\r")

            if status == "live":
                return {"status": "success", "duration": time.time() - start}
            elif status == "build_failed":
                return {"status": "failed", "data": status_data, "duration": time.time() - start}

            time.sleep(10)

        return {"status": "timeout", "duration": time.time() - start}

    def run_iteration(self, iteration: int) -> DeploymentAttempt:
        """Execute one deployment iteration"""
        print(f"\n{'='*60}")
        print(f"🔄 Iteration {iteration}/{self.max_iterations}")
        print(f"{'='*60}")

        start_time = time.time()

        # Check current health first
        health = self.check_health()
        if health.get("healthy"):
            print("✅ Service already healthy!")
            return DeploymentAttempt(
                iteration=iteration,
                timestamp=datetime.now().isoformat(),
                deploy_id="current",
                status="already_healthy",
                duration_seconds=time.time() - start_time
            )

        # Trigger deployment
        print("🚀 Triggering deployment...")
        deploy_id = self.trigger_deploy()

        if not deploy_id:
            print("❌ Failed to trigger deployment")
            return DeploymentAttempt(
                iteration=iteration,
                timestamp=datetime.now().isoformat(),
                deploy_id="none",
                status="trigger_failed",
                error="Could not trigger deployment",
                duration_seconds=time.time() - start_time
            )

        print(f"📦 Deploy ID: {deploy_id}")

        # Wait for result
        result = self.wait_for_deploy(deploy_id)

        if result["status"] == "success":
            print(f"\n✅ Success! ({result['duration']:.1f}s)")
            return DeploymentAttempt(
                iteration=iteration,
                timestamp=datetime.now().isoformat(),
                deploy_id=deploy_id,
                status="success",
                duration_seconds=result["duration"]
            )

        # Failed - analyze and learn
        print(f"\n❌ Failed ({result['duration']:.1f}s)")

        fix_type = self.analyze_failure(result.get("data", {}))

        if fix_type:
            print(f"🧠 Learned: {fix_type}")
            self.apply_fix(fix_type)

            return DeploymentAttempt(
                iteration=iteration,
                timestamp=datetime.now().isoformat(),
                deploy_id=deploy_id,
                status="failed_fixed",
                error=str(result.get("data")),
                fix_applied=fix_type,
                duration_seconds=result["duration"]
            )
        else:
            print("🤔 Unknown failure - manual review needed")
            return DeploymentAttempt(
                iteration=iteration,
                timestamp=datetime.now().isoformat(),
                deploy_id=deploy_id,
                status="failed_unknown",
                error=str(result.get("data")),
                duration_seconds=result["duration"]
            )

    def run(self):
        """Run self-healing loop until success"""
        print("\n" + "="*60)
        print("🤖 SELF-HEALING DEPLOYMENT LOOP")
        print("Inspired by Agentic Flow v1.90")
        print("="*60)

        for i in range(1, self.max_iterations + 1):
            attempt = self.run_iteration(i)
            self.history.append(attempt)
            self.state.total_attempts = i

            # Success criteria
            if attempt.status in ["success", "already_healthy"]:
                self.state.successful = True
                print("\n" + "="*60)
                print("🎉 DEPLOYMENT SUCCESSFUL!")
                print(f"Total iterations: {i}")
                print(f"Total time: {sum(a.duration_seconds for a in self.history):.1f}s")
                print("="*60)
                self.save_learning_state()
                return True

            # Continue if we applied a fix
            if attempt.fix_applied:
                print(f"\n⏳ Waiting 60s for next iteration...")
                time.sleep(60)
                continue

            # Unknown failure - stop for manual review
            if attempt.status == "failed_unknown":
                print("\n⚠️  Unknown failure - stopping for manual review")
                self.save_learning_state()
                return False

        print(f"\n❌ Max iterations ({self.max_iterations}) reached")
        self.save_learning_state()
        return False

    def save_learning_state(self):
        """Save what we learned for next time"""
        state_file = "/Users/samsonkim/Dev/domain-run/domain-runner/artifacts/deploy_learning_state.json"
        os.makedirs(os.path.dirname(state_file), exist_ok=True)

        data = {
            "state": asdict(self.state),
            "history": [asdict(a) for a in self.history],
            "timestamp": datetime.now().isoformat()
        }

        with open(state_file, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"\n💾 Learning state saved: {state_file}")

if __name__ == "__main__":
    deployer = SelfHealingDeployer()
    success = deployer.run()
    sys.exit(0 if success else 1)
