# 🔧 RENDER ENVIRONMENT VARIABLES
## For Cohort Intelligence Service Deployment

When deploying to Render, add these **exact** environment variables:

### Required Environment Variables:

**1. DATABASE_URL**
```
postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db
```

**2. OPENAI_API_KEY**
```
[Your actual OpenAI API key - starts with sk-]
```

**3. NODE_ENV**
```
production
```

**4. PORT** (Optional - Render sets this automatically)
```
3000
```

---

## 📋 How to Add in Render Dashboard:

1. Go to your service settings
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Add each variable:
   - **Key:** DATABASE_URL
   - **Value:** postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db
   
   - **Key:** OPENAI_API_KEY  
   - **Value:** [Your OpenAI API key]
   
   - **Key:** NODE_ENV
   - **Value:** production

5. Click "Save Changes"

---

## ✅ Expected Result:
- Service will connect to your existing production database
- Database tables will be created automatically on first run
- API endpoints will be available at: https://cohort-intelligence-service.onrender.com

## 🔥 No more local database loops! 