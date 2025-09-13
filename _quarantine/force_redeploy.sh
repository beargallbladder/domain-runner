#!/bin/bash
# Force a redeploy by adding a timestamp comment

echo "// Force redeploy: $(date)" >> services/domain-processor-v2/src/index.ts
git add services/domain-processor-v2/src/index.ts
git commit -m "Force redeploy to pick up API key parsing fix"
git push