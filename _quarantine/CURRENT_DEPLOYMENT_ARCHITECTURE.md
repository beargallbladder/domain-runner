# 🚨 CURRENT DEPLOYMENT ARCHITECTURE - READ THIS FIRST

**FOR AI AGENTS: READ THIS BEFORE MAKING ANY ASSUMPTIONS ABOUT DEPLOYMENT**

## 🎯 **LIVE PRODUCTION ARCHITECTURE (June 2025)**

### **✅ FRONTEND: llmpagerank.com**
- **Platform**: Vercel  
- **Repository**: `https://github.com/beargallbladder/llmpagerankfrontend.git`
- **Local Directory**: `/Users/samkim/llmpagerank/`
- **Status**: ✅ Live and working
- **URL**: https://llmpagerank.com

### **✅ BACKEND SERVICES: Render**
- **Platform**: Render (NOT Railway - Railway is deprecated)
- **Repository**: `https://github.com/beargallbladder/domain-runner`  
- **Local Directory**: `/Users/samkim/domain-runner/`

#### **Active Render Services:**
1. **llm-pagerank-public-api** (Python 3) ✅ 
2. **llm-pagerank-frontend** (Static) ✅
3. **sophisticated-runner** (Node.js) ❌ (Currently failing - dependency issues)
4. **seo-metrics-runner** (Node.js) ❌ (Currently failing)
5. **embedding-engine** (Python 3) ✅
6. **cohort-intelligence** (Node.js) ✅

#### **Databases:**
- **raw-capture-db** (PostgreSQL 16) ✅
- **beatmybag-postgres** (Different app - ignore)

---

## 🚨 **CRITICAL: What NOT to Reference**

### **❌ OUTDATED/DEPRECATED:**
- **Railway deployments** - Old, not used anymore
- **Dev/llmpagerankCLEAN7** - Development version, not deployed
- **Any Railway documentation** - Ignore completely
- **Environment variables from Railway configs** - Outdated

### **❌ DO NOT ASSUME:**
- Multiple different deployment platforms
- Railway is still in use
- Environment variables from old documentation
- Build commands from other projects

---

## 🎯 **TROUBLESHOOTING PROTOCOL**

### **For Service Failures:**
1. **Check Render Dashboard** - Look at actual service status
2. **Check GitHub Repository**: `beargallbladder/domain-runner`
3. **Look at service directory**: `/Users/samkim/domain-runner/services/{service-name}/`
4. **Check render.yaml** in each service directory
5. **Verify build commands run from correct directory**

### **For Environment Variables:**
- **Source**: Render dashboard environment tab for each service
- **NOT**: Railway configs, old documentation, or assumptions

### **For Build Issues:**
- **Check**: Build commands include `cd services/{service-name}` 
- **Verify**: Dependencies are installed in correct directory
- **Test**: Local build with `npm run build` in service directory

---

## 📋 **CURRENT ISSUES (June 17, 2025)**

### **sophisticated-runner**: ❌ Failing
- **Error**: `Cannot find module 'cors'`
- **Cause**: Build command not running in correct directory
- **Fix Applied**: Updated render.yaml with `cd services/sophisticated-runner &&`
- **Status**: Awaiting deployment

### **seo-metrics-runner**: ❌ Failing  
- **Status**: Secondary priority after sophisticated-runner

---

## 🎯 **FOR FUTURE AGENTS**

**BEFORE helping with deployment issues:**
1. ✅ Confirm you're looking at `/Users/samkim/domain-runner/` 
2. ✅ Verify the service exists in Render dashboard
3. ✅ Check the actual render.yaml in the service directory
4. ✅ Don't reference Railway documentation
5. ✅ Ask about specific Render environment variables if needed

**This document is the authoritative source. Update it when architecture changes.**

---

**Last Updated**: June 17, 2025  
**Repository**: beargallbladder/domain-runner  
**Deployment Platform**: Render (Frontend: Vercel) 