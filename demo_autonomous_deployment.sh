#!/bin/bash

# Demonstration of Autonomous Render Deployment
# This script demonstrates all the autonomous deployment capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}   AUTONOMOUS RENDER DEPLOYMENT${NC}"
echo -e "${CYAN}   Domain Runner Rust Services${NC}"
echo -e "${CYAN}================================${NC}"
echo

echo -e "${BLUE}This demonstration shows how to deploy the domain-runner Rust services${NC}"
echo -e "${BLUE}to Render with full automation and monitoring.${NC}"
echo

echo -e "${YELLOW}📋 Available Deployment Methods:${NC}"
echo "1. 🚀 Autonomous deployment (GitHub integration)"
echo "2. 🔗 Direct Blueprint URL"
echo "3. 🛠️  API deployment (requires credentials)"
echo "4. 📊 Monitoring only"
echo

read -p "Select deployment method (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}🚀 Running Autonomous Deployment...${NC}"
        echo -e "${BLUE}This will:${NC}"
        echo "  • Validate the repository and Blueprint"
        echo "  • Commit and push changes to GitHub"
        echo "  • Trigger auto-deployment via GitHub integration"
        echo "  • Start monitoring the deployment"
        echo

        read -p "Continue? (y/N): " confirm
        if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
            ./deploy_to_render.sh auto
        else
            echo "Deployment cancelled."
        fi
        ;;

    2)
        echo -e "${GREEN}🔗 Generating Direct Blueprint URL...${NC}"
        ./deploy_to_render.sh blueprint
        echo
        echo -e "${YELLOW}📋 Manual Steps:${NC}"
        echo "1. Copy the URL above"
        echo "2. Open it in your browser"
        echo "3. Click 'Apply' to deploy both services"
        echo "4. Run: ./deployment_monitor.sh monitor"
        ;;

    3)
        echo -e "${GREEN}🛠️  API Deployment...${NC}"

        if [[ -z "${RENDER_API_KEY:-}" ]]; then
            echo -e "${RED}❌ RENDER_API_KEY environment variable is required${NC}"
            echo
            echo -e "${YELLOW}📋 Setup Instructions:${NC}"
            echo "1. Get your API key from https://dashboard.render.com/account/api-keys"
            echo "2. Get service IDs from your Render services"
            echo "3. Set environment variables:"
            echo "   export RENDER_API_KEY='your_api_key'"
            echo "   export RENDER_WEB_SERVICE_ID='your_web_service_id'"
            echo "   export RENDER_WORKER_SERVICE_ID='your_worker_service_id'"
            echo "4. Run this script again"
            exit 1
        fi

        echo -e "${BLUE}API credentials found, deploying...${NC}"
        ./deploy_to_render.sh api
        ;;

    4)
        echo -e "${GREEN}📊 Starting Deployment Monitoring...${NC}"
        echo -e "${BLUE}This will monitor the health endpoint every 30 seconds${NC}"
        echo -e "${BLUE}URL: https://domain-runner-rust-web.onrender.com/healthz${NC}"
        echo

        echo -e "${YELLOW}Available monitoring modes:${NC}"
        echo "a) Single health check"
        echo "b) Wait for deployment completion"
        echo "c) Continuous monitoring"
        echo

        read -p "Select monitoring mode (a-c): " monitor_choice

        case $monitor_choice in
            a)
                echo -e "${BLUE}Running single health check...${NC}"
                ./deployment_monitor.sh health
                ;;
            b)
                echo -e "${BLUE}Waiting for deployment completion...${NC}"
                ./deployment_monitor.sh deploy
                ;;
            c)
                echo -e "${BLUE}Starting continuous monitoring (Ctrl+C to stop)...${NC}"
                ./deployment_monitor.sh monitor
                ;;
            *)
                echo "Invalid choice, running single health check..."
                ./deployment_monitor.sh health
                ;;
        esac
        ;;

    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo
echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}      DEPLOYMENT COMPLETE${NC}"
echo -e "${CYAN}================================${NC}"
echo

echo -e "${GREEN}✅ Service URLs:${NC}"
echo "🌐 Web Service: https://domain-runner-rust-web.onrender.com"
echo "❤️  Health Check: https://domain-runner-rust-web.onrender.com/healthz"
echo

echo -e "${GREEN}📊 Monitoring Commands:${NC}"
echo "Single check:     ./deployment_monitor.sh health"
echo "Wait for deploy:  ./deployment_monitor.sh deploy"
echo "Continuous:       ./deployment_monitor.sh monitor"
echo

echo -e "${GREEN}🛠️  Management Commands:${NC}"
echo "Re-deploy:        ./deploy_to_render.sh auto"
echo "Blueprint URL:    ./deploy_to_render.sh blueprint"
echo "API deploy:       ./deploy_to_render.sh api"
echo

echo -e "${BLUE}📋 For detailed instructions, see: RENDER_DEPLOYMENT_INSTRUCTIONS.md${NC}"