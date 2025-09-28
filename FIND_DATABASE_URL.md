# FIND YOUR DATABASE URL - STEP BY STEP

## 1. GO TO RENDER DASHBOARD
👉 **https://dashboard.render.com**

## 2. LOOK IN THE LEFT SIDEBAR
You should see sections like:
- Web Services
- Background Workers
- **PostgreSQL** ← CLICK THIS

## 3. YOU WILL SEE YOUR DATABASE
It will be named something like:
- `domain-runner-db`
- Or any other PostgreSQL database you have

## 4. CLICK ON YOUR DATABASE

## 5. FIND THE CONNECTION INFO
Look for tabs at the top:
- **Info** tab
- **Connect** tab
- **Connections** tab

## 6. COPY THE DATABASE URL
It will be labeled as one of these:
- **External Database URL**
- **External Connection String**
- **Database URL**

It looks like:
```
postgresql://username:password@dpg-xxxxxx-a.region.render.com:5432/database_name
```

## IF YOU CAN'T FIND IT:

### Option A: Check existing services
1. Click on any existing web services or workers
2. Go to "Environment" tab
3. Look for DATABASE_URL variable
4. Copy its value

### Option B: Your database might be named differently
Look for ANY PostgreSQL database in your account - that's the one blocking the new creation

### Option C: Direct link to databases
👉 **https://dashboard.render.com/databases**

## EXAMPLE DATABASE URL FORMAT:
```
postgresql://nexus:YOUR_PASSWORD_HERE@dpg-c1234567890abcdef-a.oregon-postgres.render.com:5432/domain_runner
```

## ONCE YOU HAVE IT:
1. Deploy using: https://render.com/deploy?repo=https://github.com/beargallbladder/domain-runner&blueprint=render-rust-no-db.yaml
2. After services are created, add the DATABASE_URL to each service's environment variables