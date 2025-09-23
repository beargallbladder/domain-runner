#!/usr/bin/env python3
"""
Test the API locally before deploying to Render
"""

import os
import sys
import time
import subprocess
import requests
from typing import Dict, Any

def test_local_api():
    """Test the API running locally"""

    print("🧪 Testing Domain Runner API Locally\n")
    print("=" * 50)

    # Check if Docker is running
    print("1. Checking Docker...")
    try:
        subprocess.run(["docker", "version"], capture_output=True, check=True)
        print("   ✅ Docker is running")
    except:
        print("   ❌ Docker is not running. Please start Docker Desktop.")
        return False

    # Build the Docker image
    print("\n2. Building Docker image...")
    try:
        result = subprocess.run(
            ["docker", "build", "-t", "domain-runner-test", "."],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("   ✅ Docker image built successfully")
        else:
            print(f"   ❌ Build failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ Build error: {e}")
        return False

    # Run the container
    print("\n3. Starting container...")
    try:
        # Stop any existing container
        subprocess.run(["docker", "stop", "domain-runner-test"], capture_output=True)
        subprocess.run(["docker", "rm", "domain-runner-test"], capture_output=True)

        # Start new container
        cmd = [
            "docker", "run", "-d",
            "--name", "domain-runner-test",
            "-p", "8080:8080",
            "--env-file", ".env.example",
            "domain-runner-test"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("   ✅ Container started")
            time.sleep(5)  # Wait for startup
        else:
            print(f"   ❌ Failed to start: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ Container error: {e}")
        return False

    # Test endpoints
    print("\n4. Testing endpoints...")
    base_url = "http://localhost:8080"

    endpoints = [
        ("/healthz", "Health Check"),
        ("/status", "System Status"),
        ("/domains", "Domain List"),
        ("/models", "Model Performance"),
        ("/drift/example.com", "Drift Analysis")
    ]

    all_passed = True
    for endpoint, name in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"   ✅ {name}: OK")
                if endpoint == "/healthz":
                    data = response.json()
                    print(f"      Service: {data.get('service')}")
                    print(f"      Environment: {data.get('env')}")
            else:
                print(f"   ⚠️  {name}: {response.status_code}")
                all_passed = False
        except requests.exceptions.ConnectionError:
            print(f"   ❌ {name}: Connection failed")
            all_passed = False
        except Exception as e:
            print(f"   ❌ {name}: {e}")
            all_passed = False

    # Stop container
    print("\n5. Cleaning up...")
    subprocess.run(["docker", "stop", "domain-runner-test"], capture_output=True)
    subprocess.run(["docker", "rm", "domain-runner-test"], capture_output=True)
    print("   ✅ Container stopped and removed")

    print("\n" + "=" * 50)
    if all_passed:
        print("✅ All tests passed! Ready to deploy to Render.")
    else:
        print("⚠️  Some tests failed. Check the errors above.")

    return all_passed

def test_without_docker():
    """Test the API using uvicorn directly"""

    print("🧪 Testing Domain Runner API without Docker\n")
    print("=" * 50)

    print("Starting API server with uvicorn...")
    print("\nRun this in a separate terminal:")
    print("  cd /Users/samsonkim/Dev/domain-run/domain-runner")
    print("  uvicorn src.api_service:app --reload --port 8080")
    print("\nThen run: curl http://localhost:8080/healthz")
    print("\nPress Ctrl+C to stop the server when done testing.")

if __name__ == "__main__":
    # Check if .env.example exists
    if not os.path.exists(".env.example"):
        print("⚠️  Warning: .env.example not found")
        print("   The API will run but database queries may fail")
        print("   Create .env.example with DATABASE_URL to test fully")

    # Try Docker first
    if not test_local_api():
        print("\n" + "=" * 50)
        print("Alternative: Test without Docker")
        print("=" * 50)
        test_without_docker()