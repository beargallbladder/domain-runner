#!/bin/bash

# Comprehensive test runner script for domain-runner project
# This script runs all test suites and generates coverage reports

set -e

echo "🧪 Domain Runner Test Suite"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Clean previous coverage reports
echo "🧹 Cleaning previous coverage reports..."
rm -rf coverage
rm -rf .nyc_output

# Run unit tests
echo ""
echo "🔬 Running Unit Tests..."
echo "----------------------"
npm run test:unit -- --coverage --coverageDirectory=coverage/unit

# Run integration tests
echo ""
echo "🔗 Running Integration Tests..."
echo "-----------------------------"
npm run test:integration -- --coverage --coverageDirectory=coverage/integration

# Run E2E tests (if environment allows)
if [ -n "$TEST_DATABASE_URL" ]; then
    echo ""
    echo "🌐 Running E2E Tests..."
    echo "---------------------"
    npm run test -- tests/e2e --coverage --coverageDirectory=coverage/e2e
else
    echo ""
    echo -e "${YELLOW}⚠️  Skipping E2E tests (TEST_DATABASE_URL not set)${NC}"
fi

# Merge coverage reports
echo ""
echo "📊 Merging Coverage Reports..."
echo "----------------------------"
npx nyc merge coverage coverage/merged/coverage.json
npx nyc report --reporter=html --reporter=text --reporter=lcov --report-dir=coverage/final

# Display coverage summary
echo ""
echo "📈 Coverage Summary"
echo "=================="
npx nyc report --reporter=text-summary

# Check coverage thresholds
echo ""
echo "✅ Checking Coverage Thresholds..."
echo "--------------------------------"
npx nyc check-coverage --lines 80 --functions 80 --branches 80 --statements 80

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All coverage thresholds met!${NC}"
else
    echo -e "${RED}❌ Coverage thresholds not met${NC}"
    exit 1
fi

# Run linting
echo ""
echo "🔍 Running Linter..."
echo "------------------"
npm run lint

# Check TypeScript types
echo ""
echo "📘 Checking TypeScript..."
echo "-----------------------"
npx tsc --noEmit

# Generate test report
echo ""
echo "📝 Generating Test Report..."
echo "--------------------------"
REPORT_FILE="coverage/test-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Test Execution Report
Generated: $(date)

## Summary
- Unit Tests: ✅ Passed
- Integration Tests: ✅ Passed
- E2E Tests: $([ -n "$TEST_DATABASE_URL" ] && echo "✅ Passed" || echo "⏭️  Skipped")
- Code Coverage: $(npx nyc report --reporter=text-summary | grep "All files" | awk '{print $3}')
- Linting: ✅ Passed
- TypeScript: ✅ Passed

## Coverage Details
\`\`\`
$(npx nyc report --reporter=text)
\`\`\`

## Test Files
### Unit Tests
$(find services -name "*.test.ts" -o -name "*.test.js" | grep -E "(unit|spec)" | sort)

### Integration Tests
$(find services tests -name "*.test.ts" -o -name "*.test.js" | grep "integration" | sort)

### E2E Tests
$(find tests -name "*.test.ts" -o -name "*.test.js" | grep "e2e" | sort)

## Next Steps
- Review coverage/final/index.html for detailed coverage report
- Address any uncovered code paths
- Add tests for new features before merging
EOF

echo -e "${GREEN}✅ Test report generated: $REPORT_FILE${NC}"

# Open coverage report in browser (if available)
if command -v open &> /dev/null; then
    echo ""
    echo "📂 Opening coverage report in browser..."
    open coverage/final/index.html
elif command -v xdg-open &> /dev/null; then
    echo ""
    echo "📂 Opening coverage report in browser..."
    xdg-open coverage/final/index.html
fi

echo ""
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
echo ""
echo "📊 Full coverage report: coverage/final/index.html"
echo "📝 Test execution report: $REPORT_FILE"