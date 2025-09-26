#!/bin/bash
# Enable production features gradually

echo "🚀 Enabling Production Features"
echo ""
echo "This script will help you gradually enable write features"
echo ""
echo "Current phase options:"
echo "1. Enable drift writes only (DB_READONLY=false, FEATURE_WRITE_DRIFT=true)"
echo "2. Enable worker writes (FEATURE_WORKER_WRITES=true)"
echo "3. Enable cron jobs (FEATURE_CRON=true)"
echo "4. Full production (all features enabled)"
echo ""
echo "Which phase? (1-4): "
read phase

case $phase in
  1)
    echo "Update these in Render Environment:"
    echo "  DB_READONLY=false"
    echo "  FEATURE_WRITE_DRIFT=true"
    ;;
  2)
    echo "Update these in Render Environment:"
    echo "  FEATURE_WORKER_WRITES=true"
    ;;
  3)
    echo "Update these in Render Environment:"
    echo "  FEATURE_CRON=true"
    ;;
  4)
    echo "Update these in Render Environment:"
    echo "  DB_READONLY=false"
    echo "  FEATURE_WRITE_DRIFT=true"
    echo "  FEATURE_WORKER_WRITES=true"
    echo "  FEATURE_CRON=true"
    ;;
esac
