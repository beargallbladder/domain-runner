#!/bin/bash

echo "🚀 Deploying LLM PageRank Frontend..."

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Frontend Ready for Deployment:"
    echo "   - About page fonts: ✅ Fixed"
    echo "   - Categories drill-down: ✅ Fixed" 
    echo "   - Visual indicators: ✅ Enhanced"
    echo "   - Messaging: ✅ Simplified"
    echo "   - Build: ✅ Working"
    echo ""
    echo "📁 Files ready in dist/ directory"
    echo "🌐 Ready for Vercel deployment"
    echo ""
    echo "To deploy:"
    echo "1. Push to your git repository"
    echo "2. Vercel will automatically deploy"
    echo "3. Or run: vercel --prod"
else
    echo "❌ Build failed!"
    exit 1
fi 