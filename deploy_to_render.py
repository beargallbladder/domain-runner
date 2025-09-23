#!/usr/bin/env python3
"""
Deploy domain-runner application to Render.com

This script helps deploy the domain-runner application to Render using the
render.yaml blueprint configuration. It includes service creation, environment
variable setup, and deployment monitoring.

Usage:
    python deploy_to_render.py

Prerequisites:
1. GitHub repository: https://github.com/beargallbladder/domain-runner
2. Render account with CLI access
3. Environment variables ready for LLM API keys
"""

import subprocess
import sys
import json
import time
import requests
from typing import Dict, List, Optional
import os
from pathlib import Path


class RenderDeployer:
    def __init__(self):
        self.github_repo = "https://github.com/beargallbladder/domain-runner"
        self.services = {
            "database": "domain-runner-db",
            "web": "domain-runner-web",
            "worker": "domain-runner-worker"
        }
        self.required_env_vars = [
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "DEEPSEEK_API_KEY",
            "MISTRAL_API_KEY",
            "COHERE_API_KEY",
            "AI21_API_KEY",
            "GOOGLE_API_KEY",
            "GROQ_API_KEY",
            "TOGETHER_API_KEY",
            "PERPLEXITY_API_KEY",
            "XAI_API_KEY"
        ]

    def run_command(self, cmd: List[str], check=True) -> subprocess.CompletedProcess:
        """Run a command and return the result"""
        print(f"🔄 Running: {' '.join(cmd)}")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=check)
            if result.stdout:
                print(f"✅ Output: {result.stdout}")
            return result
        except subprocess.CalledProcessError as e:
            print(f"❌ Error: {e}")
            if e.stderr:
                print(f"❌ Stderr: {e.stderr}")
            if check:
                raise
            return e

    def check_render_cli(self) -> bool:
        """Check if Render CLI is installed and authenticated"""
        try:
            # Check if render CLI is installed
            result = self.run_command(["which", "render"], check=False)
            if result.returncode != 0:
                print("❌ Render CLI not found. Install it with:")
                print("   npm install -g @render-com/cli")
                return False

            # Check if authenticated
            result = self.run_command(["render", "whoami", "-o", "json"], check=False)
            if result.returncode != 0:
                print("❌ Not authenticated with Render. Run: render login")
                return False

            user_info = json.loads(result.stdout)
            print(f"✅ Authenticated as: {user_info.get('email', 'unknown')}")
            return True

        except Exception as e:
            print(f"❌ Error checking Render CLI: {e}")
            return False

    def list_existing_services(self) -> Dict:
        """List existing Render services"""
        try:
            result = self.run_command(["render", "services", "list", "-o", "json"])
            services = json.loads(result.stdout)

            existing = {}
            for service in services:
                name = service.get('name', '')
                if name in self.services.values():
                    existing[name] = service

            return existing
        except Exception as e:
            print(f"❌ Error listing services: {e}")
            return {}

    def create_from_blueprint(self) -> bool:
        """Create services from render.yaml blueprint"""
        try:
            print("🚀 Creating services from render.yaml blueprint...")

            # Use render blueprint command to create services
            result = self.run_command([
                "render", "blueprint", "create",
                "--repo", self.github_repo,
                "--branch", "main",
                "--blueprint-path", "render.yaml"
            ])

            if result.returncode == 0:
                print("✅ Services created successfully from blueprint!")
                return True
            else:
                print("❌ Failed to create services from blueprint")
                return False

        except Exception as e:
            print(f"❌ Error creating from blueprint: {e}")
            return False

    def update_environment_variables(self, service_name: str) -> bool:
        """Update environment variables for a service"""
        try:
            print(f"🔧 Setting up environment variables for {service_name}...")

            # Get current environment variables
            result = self.run_command([
                "render", "service", "env", "list",
                "--service", service_name,
                "-o", "json"
            ])

            current_env = json.loads(result.stdout)
            current_keys = {env['key'] for env in current_env}

            # Set missing environment variables
            missing_vars = []
            for var in self.required_env_vars:
                if var not in current_keys:
                    missing_vars.append(var)

            if missing_vars:
                print(f"⚠️  Missing environment variables for {service_name}: {missing_vars}")
                print("   You'll need to set these manually in the Render dashboard")
                print("   Or provide them as command line arguments")

                # Try to set them if provided as environment variables
                for var in missing_vars:
                    value = os.getenv(var)
                    if value:
                        print(f"🔑 Setting {var}...")
                        self.run_command([
                            "render", "service", "env", "set",
                            "--service", service_name,
                            f"{var}={value}"
                        ])
                    else:
                        print(f"⚠️  {var} not found in local environment")

            return True

        except Exception as e:
            print(f"❌ Error updating environment variables: {e}")
            return False

    def wait_for_deployment(self, service_name: str, timeout_minutes: int = 15) -> bool:
        """Wait for service deployment to complete"""
        try:
            print(f"⏳ Waiting for {service_name} deployment to complete...")

            start_time = time.time()
            timeout_seconds = timeout_minutes * 60

            while time.time() - start_time < timeout_seconds:
                # Get deployment status
                result = self.run_command([
                    "render", "service", "get",
                    "--service", service_name,
                    "-o", "json"
                ], check=False)

                if result.returncode == 0:
                    service_info = json.loads(result.stdout)
                    status = service_info.get('status', 'unknown')

                    print(f"📊 {service_name} status: {status}")

                    if status == 'active':
                        print(f"✅ {service_name} deployed successfully!")
                        return True
                    elif status in ['failed', 'cancelled']:
                        print(f"❌ {service_name} deployment failed with status: {status}")
                        return False

                time.sleep(30)  # Check every 30 seconds

            print(f"⏰ Timeout waiting for {service_name} deployment")
            return False

        except Exception as e:
            print(f"❌ Error waiting for deployment: {e}")
            return False

    def test_health_endpoint(self, service_url: str) -> bool:
        """Test the health endpoint of deployed service"""
        try:
            print(f"🏥 Testing health endpoint: {service_url}/healthz")

            response = requests.get(f"{service_url}/healthz", timeout=30)

            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Health check passed: {health_data}")
                return True
            else:
                print(f"❌ Health check failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error testing health endpoint: {e}")
            return False

    def get_service_url(self, service_name: str) -> Optional[str]:
        """Get the URL for a deployed service"""
        try:
            result = self.run_command([
                "render", "service", "get",
                "--service", service_name,
                "-o", "json"
            ])

            service_info = json.loads(result.stdout)
            url = service_info.get('serviceUrl')

            if url:
                print(f"🌐 {service_name} URL: {url}")
                return url
            else:
                print(f"⚠️  No URL found for {service_name}")
                return None

        except Exception as e:
            print(f"❌ Error getting service URL: {e}")
            return None

    def deploy(self) -> bool:
        """Main deployment process"""
        print("🚀 Starting domain-runner deployment to Render...")
        print("=" * 60)

        # Step 1: Check prerequisites
        if not self.check_render_cli():
            return False

        # Step 2: List existing services
        existing_services = self.list_existing_services()
        if existing_services:
            print(f"📋 Found existing services: {list(existing_services.keys())}")
        else:
            print("📋 No existing services found")

        # Step 3: Create from blueprint
        if not self.create_from_blueprint():
            print("❌ Failed to create services from blueprint")
            return False

        # Step 4: Set up environment variables for web service
        if not self.update_environment_variables(self.services["web"]):
            print("⚠️  Environment variable setup had issues")

        # Step 5: Wait for deployments
        web_deployed = self.wait_for_deployment(self.services["web"])
        worker_deployed = self.wait_for_deployment(self.services["worker"])

        if not (web_deployed and worker_deployed):
            print("❌ Some services failed to deploy")
            return False

        # Step 6: Test health endpoint
        web_url = self.get_service_url(self.services["web"])
        if web_url:
            health_ok = self.test_health_endpoint(web_url)
            if not health_ok:
                print("⚠️  Health check failed, but services may still be starting")

        print("=" * 60)
        print("🎉 Deployment completed!")
        print(f"🌐 Web service: {web_url}")
        print(f"🔄 Worker service: {self.services['worker']}")
        print(f"🗄️  Database: {self.services['database']}")

        return True


def main():
    """Main function to run deployment"""
    deployer = RenderDeployer()

    print("Domain Runner - Render Deployment Tool")
    print("=====================================")
    print()
    print("This script will deploy your domain-runner application to Render using")
    print("the render.yaml blueprint configuration.")
    print()
    print("Prerequisites:")
    print("1. Render CLI installed and authenticated (render login)")
    print("2. GitHub repository accessible at:")
    print(f"   {deployer.github_repo}")
    print("3. LLM API keys available for environment variables")
    print()

    if input("Continue with deployment? (y/N): ").lower() != 'y':
        print("Deployment cancelled.")
        return

    success = deployer.deploy()

    if success:
        print("\n✅ Deployment successful!")
        print("\nNext steps:")
        print("1. Verify all services are running in Render dashboard")
        print("2. Set any missing environment variables")
        print("3. Monitor logs for any errors")
        print("4. Test the API endpoints")
    else:
        print("\n❌ Deployment failed!")
        print("\nTroubleshooting:")
        print("1. Check Render dashboard for error details")
        print("2. Verify GitHub repository access")
        print("3. Check render.yaml configuration")
        print("4. Ensure all required environment variables are set")


if __name__ == "__main__":
    main()