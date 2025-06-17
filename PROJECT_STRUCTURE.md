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

#### ACTUAL DEPLOYED FRONTEND
- **Location**: `/Users/samkim/llmpagerank/frontend/src/`
- **Framework**: Vite + TypeScript
- **Status**: ✅ WORKING (auth routes added)
- **Key Files**: 
  - `App.tsx` (routing)
  - `pages/LoginPage.tsx` 
  - `pages/SignupPage.tsx`

#### OLD FRONTEND (NOT DEPLOYED)
- **Location**: `/Users/samkim/llmpagerank/src/`
- **Framework**: React Scripts
- **Status**: ❌ NOT USED (was editing wrong location)

### VERCEL DEPLOYMENT CONFIG:
- **File**: `/Users/samkim/llmpagerank/vercel.json`
- **Framework**: "vite" 
- **Output**: "dist"
- **Source Directory**: `frontend/`

### API ENDPOINTS:
- **Auth**: `POST /api/migrate-timeseries` with action: "register"|"login"
- **Main API**: `https://llm-pagerank-public-api.onrender.com`
- **Frontend**: `https://www.llmpagerank.com`

## WHAT I BROKE DURING CLEANUP:
1. ❌ Removed `cors` dependency from sophisticated-runner (FIXED)
2. ❌ Was editing wrong frontend directory for hours
3. ❌ Confused multiple package.json files

## NEVER AGAIN:
- Always check `pwd` before making changes
- Always verify which repo you're in with `git remote -v`
- Always check if packages build before committing
- Keep this document updated 