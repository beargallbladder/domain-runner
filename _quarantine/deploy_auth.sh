#!/bin/bash
# 🚀 Deploy Authentication System
# Pushes changes to both frontend and backend repositories

set -e  # Exit on any error

echo "🔐 Deploying Authentication System..."

# Check if we're in the right directory
if [ ! -f "services/public-api/production_api.py" ]; then
    echo "❌ Error: Please run this script from the domain-runner directory"
    exit 1
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "1. JWT_SECRET environment variable set on Render? (y/n)"
read -r jwt_check
if [ "$jwt_check" != "y" ]; then
    echo "⚠️  Please set JWT_SECRET on Render before deploying"
    echo "   Go to Render dashboard > llm-pagerank-public-api > Environment"
    echo "   Add: JWT_SECRET=your-super-secure-32-char-secret"
    exit 1
fi

echo "2. Database migration completed? (y/n)"
read -r db_check
if [ "$db_check" != "y" ]; then
    echo "⚠️  Please run database migration first:"
    echo "   python3 run_db_migration.py"
    exit 1
fi

echo ""
echo "🔧 Deploying backend to Render..."

# Add and commit backend changes
git add .
git status
echo ""
echo "Ready to commit backend changes? (y/n)"
read -r commit_backend
if [ "$commit_backend" = "y" ]; then
    git commit -m "🔐 Add authentication system with JWT and user management

- Integrate auth_extensions.py into production_api.py
- Add user registration and login endpoints
- Implement bcrypt password hashing and JWT tokens
- Configure CORS for llmpagerank.com domain
- Add database migration script and deployment docs
- Ready for Stripe integration"
    
    echo "Pushing to backend repository..."
    git push origin main
    echo "✅ Backend deployed to Render!"
else
    echo "❌ Backend deployment cancelled"
    exit 1
fi

echo ""
echo "🎨 Deploying frontend to Vercel..."

# Navigate to frontend directory and deploy
cd ../llmpagerank

# Check if Login.tsx exists
if [ ! -f "src/components/Login.tsx" ]; then
    echo "❌ Error: Login.tsx not found in frontend directory"
    echo "   Please make sure you're running this from the correct location"
    exit 1
fi

# Add and commit frontend changes
git add .
git status
echo ""
echo "Ready to commit frontend changes? (y/n)"
read -r commit_frontend
if [ "$commit_frontend" = "y" ]; then
    git commit -m "🔐 Add authentication UI with login/signup forms

- Create Login component with signup/login forms
- Add auth routes to App.tsx (/login, /signup)
- Implement localStorage-based auth state management
- Add proper form validation and error handling
- Connect to Render backend auth API
- Style auth components with existing CSS"
    
    echo "Pushing to frontend repository..."
    git push origin main
    echo "✅ Frontend deployed to Vercel!"
else
    echo "❌ Frontend deployment cancelled"
    exit 1
fi

cd ../domain-runner

echo ""
echo "🎉 Authentication System Deployed Successfully!"
echo ""
echo "🔗 Test URLs:"
echo "   • Registration: https://llmpagerank.com/signup"
echo "   • Login: https://llmpagerank.com/login"
echo "   • API Health: https://llm-pagerank-public-api.onrender.com/health"
echo ""
echo "📋 Next Steps:"
echo "1. Wait 2-3 minutes for deployments to complete"
echo "2. Test user registration at https://llmpagerank.com/signup"
echo "3. Test login functionality"
echo "4. Verify auth state persistence"
echo "5. Check Render logs for any errors"
echo ""
echo "🔧 If issues occur:"
echo "   • Check Render dashboard for deployment status"
echo "   • Verify JWT_SECRET environment variable is set"
echo "   • Check browser console for frontend errors"
echo "   • Review FINAL_TEST_SCENARIOS.md for troubleshooting"
echo ""
echo "✨ Authentication system is ready for users!" 