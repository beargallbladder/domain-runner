# PROJECT STRUCTURE - CRITICAL REFERENCE

## NEVER LOSE TRACK OF THESE LOCATIONS AGAIN

### MAIN REPOSITORIES:
- **BACKEND** (domain-runner): `/Users/samkim/domain-runner/` 
  - Git: `https://github.com/beargallbladder/domain-runner`
  - Deployed: Render.com multiple services

- **FRONTEND** (llmpagerank): `/Users/samkim/llmpagerank/`  
  - Git: `https://github.com/beargallbladder/llmpagerankfrontend`
  - Deployed: Vercel.com

### CRITICAL SERVICES IN BACKEND:

#### 1. PUBLIC API (Main API)
- **Location**: `/Users/samkim/domain-runner/services/public-api/`
- **Deployed**: `https://llm-pagerank-public-api.onrender.com`
- **Status**: ✅ WORKING
- **Key Files**: `app.py`, `auth_extensions.py`

#### 2. Sophisticated Runner (Caching System)  
- **Location**: `/Users/samkim/domain-runner/services/sophisticated-runner/`
- **Status**: 🔧 JUST FIXED (missing cors dependency)
- **Dependencies**: cors, express, axios, openai, pg, winston

#### 3. Raw Capture Runner
- **Location**: `/Users/samkim/domain-runner/services/raw-capture-runner/`
- **Status**: ❓ NEEDS CHECK

#### 4. Embedding Engine
- **Location**: `/Users/samkim/domain-runner/services/embedding-engine/`
- **Status**: ❓ NEEDS CHECK

### FRONTEND STRUCTURE:

#### ⚠️ CRITICAL: ACTUAL DEPLOYED FRONTEND
- **Location**: `/Users/samkim/llmpagerank/frontend/src/`
- **Framework**: Vite + TypeScript (.tsx files)
- **Status**: ✅ DEPLOYED TO VERCEL
- **Key Files**: 
  - `frontend/src/App.tsx` (routing)
  - `frontend/src/pages/LoginPage.tsx` 
  - `frontend/src/pages/SignupPage.tsx`
- **Environment Variable**: `VITE_API_BASE_URL`
- **Build Command**: `npm run build` (from frontend/ directory)

#### ❌ DECOY FRONTEND (NOT DEPLOYED - DO NOT EDIT)
- **Location**: `/Users/samkim/llmpagerank/src/`
- **Framework**: React (.jsx files)
- **Status**: ❌ ABANDONED - EDITING THIS WASTES HOURS
- **Warning**: THIS IS THE WRONG DIRECTORY - ANY CHANGES HERE ARE IGNORED

### VERCEL DEPLOYMENT CONFIG:
- **File**: `/Users/samkim/llmpagerank/frontend/vercel.json`
- **Framework**: "vite" 
- **Output**: "frontend/dist"
- **Source Directory**: `frontend/src/`
- **Environment**: `VITE_API_BASE_URL=https://llm-pagerank-public-api.onrender.com`
- **Deploy Process**: Git push → Vercel auto-builds from `frontend/` directory

### API ENDPOINTS:
- **Auth Register**: `GET /api/simple-register?email=&password=&full_name=`
- **Auth Login**: `GET /api/simple-login?email=&password=`
- **Health Check**: `GET /health` (returns monitoring stats for homepage)
- **Main API**: `https://llm-pagerank-public-api.onrender.com`
- **Frontend**: `https://www.llmpagerank.com`

## 🚨 CRITICAL MISTAKES TO NEVER REPEAT:

### THE BIG ONE: WRONG FRONTEND DIRECTORY
1. ❌ **SPENT HOURS EDITING**: `/Users/samkim/llmpagerank/src/` (WRONG - unused .jsx files)
2. ✅ **SHOULD EDIT**: `/Users/samkim/llmpagerank/frontend/src/` (CORRECT - deployed .tsx files)
3. ❌ **RESULT**: All frontend changes were ignored, black screen persisted
4. ❌ **COST**: Hours of debugging, hundreds of dollars in tool calls

### THE VERCEL REPOSITORY NIGHTMARE:
1. ❌ **VERCEL CONNECTED TO WRONG REPO**: `beargallbladder/domain-runner` (backend)
2. ✅ **SHOULD BE CONNECTED TO**: `beargallbladder/llmpagerankfrontend` (frontend)
3. ❌ **RESULT**: 48 hours of frontend fixes never deployed (deployed wrong code)
4. ❌ **SYMPTOM**: JavaScript bundle still had old `/api/auth/register` instead of `/api/simple-register`
5. ✅ **FIX**: Created new Vercel project with correct repository + root directory

### THE API ENDPOINT CONFUSION:
1. ❌ **OLD ENDPOINTS**: `/api/auth/register`, `/api/migrate-timeseries` (don't exist)
2. ✅ **CORRECT ENDPOINTS**: `/api/simple-register`, `/api/simple-login` (working)
3. ❌ **RESULT**: 422 errors, registration failed, black screen on submit
4. ✅ **FIX**: Updated SignupPage.tsx and LoginPage.tsx to use correct endpoints

### THE TYPESCRIPT BUILD BLOCKER:
1. ❌ **BUILD FAILING**: TypeScript errors in BrandDetailPage, LeaderboardPage, StatusPage
2. ❌ **RESULT**: Even with correct repo, deployment blocked by compilation errors
3. ✅ **FIX**: Added null safety checks (`brand.score || 0`, `brand.brandName || brand.domain`)

### OTHER MISTAKES:
1. ❌ Removed `cors` dependency from sophisticated-runner (FIXED)
2. ❌ Used wrong environment variable (`REACT_APP_API_URL` vs `VITE_API_BASE_URL`)
3. ❌ Confused multiple package.json files
4. ❌ Homepage calling non-existent API endpoints (caused crashes after login)

## 🛡️ NEVER AGAIN PROTOCOL:

### MANDATORY COMMANDS BEFORE ANY WORK:
```bash
# 1. Confirm location
pwd
git remote -v

# 2. For FRONTEND work, confirm you're in the RIGHT directory:
ls -la frontend/src/    # Should show .tsx files
ls -la src/            # Should show .jsx files (WRONG - don't edit these)

# 3. For FRONTEND changes, work in frontend/ directory:
cd frontend/
npm run build          # Test build before pushing

# 4. VERIFY DEPLOYMENT (after pushing):
curl -s "https://www.llmpagerank.com/register" | grep -o "index-[a-z0-9]*.js"
curl -s "https://www.llmpagerank.com/assets/[FILENAME].js" | grep -o "simple-register\|auth/register"
# Should show "simple-register" NOT "auth/register"
```

### CHECKLIST:
- ✅ Always check `pwd` before making changes
- ✅ Always verify which repo you're in with `git remote -v`
- ✅ For frontend: Confirm you're editing `.tsx` files in `frontend/src/` NOT `.jsx` files in `src/`
- ✅ **VERCEL CHECK**: Verify Vercel project connected to `llmpagerankfrontend` NOT `domain-runner`
- ✅ **VERCEL CHECK**: Verify Root Directory set to `frontend` NOT `.`
- ✅ **DEPLOYMENT CHECK**: Verify JavaScript bundle has `/api/simple-register` NOT `/api/auth/register`
- ✅ **TYPESCRIPT CHECK**: Run `npm run build` locally before pushing to catch compilation errors
- ✅ Always test builds before committing
- ✅ Keep this document updated
- ✅ Use correct environment variables (`VITE_API_BASE_URL` for Vite projects) 