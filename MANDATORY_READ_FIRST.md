# 🚨 MANDATORY READ FIRST - NO EXCEPTIONS

## BEFORE ANY DEBUGGING OR CODE CHANGES:

### ✅ REQUIRED STEPS (CHECK EACH):
- [ ] **Read PROJECT_STRUCTURE.md completely**
- [ ] **Read WAKE_UP_STATUS.md completely** 
- [ ] **Run `pwd` and confirm working directory**
- [ ] **Run `git remote -v` and confirm repository**
- [ ] **Identify deployment method (Vercel/Render)**

### 🎯 CURRENT ARCHITECTURE:
- **Frontend (DEPLOYED)**: `/Users/samkim/llmpagerank/frontend/src/` (.tsx files, Vercel)
- **Frontend (DECOY)**: `/Users/samkim/llmpagerank/src/` (.jsx files, UNUSED - DO NOT EDIT)
- **Backend**: `/Users/samkim/domain-runner/` (Render deployment)
- **Main API**: `https://llm-pagerank-public-api.onrender.com`

### ⚠️ KNOWN TRAPS:
1. **BIGGEST TRAP - Wrong Frontend Directory**: 
   - ❌ Do NOT edit `/Users/samkim/llmpagerank/src/` (.jsx files - UNUSED)
   - ✅ DO edit `/Users/samkim/llmpagerank/frontend/src/` (.tsx files - DEPLOYED)
2. **Wrong Backend Directory**: Do NOT edit `/Users/samkim/domain-runner/src/` (not deployed)
3. **Broken Auth Endpoints**: `/api/auth/*` endpoints are broken, use `/api/simple-*`
4. **Environment Variables**: Use `VITE_API_BASE_URL` not `REACT_APP_API_URL`
5. **Deployment Required**: Vercel deploys from git - changes must be committed & pushed

### 💰 COST OPTIMIZATION:
**EVERY TOOL CALL COSTS MONEY. READ DOCS FIRST.**

### 🔒 MANDATORY ACKNOWLEDGMENT:
Before proceeding, state: "I have read all documentation and confirmed the working directory and repository."

**Failure to follow this checklist just cost 3+ hours debugging the wrong frontend directory.**
**The black screen issue persisted because I was editing unused .jsx files instead of deployed .tsx files.**
**COST: Hundreds of dollars in tool calls, missed launch deadlines.** 