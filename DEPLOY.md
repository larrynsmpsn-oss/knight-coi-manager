# Knight COI Manager - Deployment Guide

## Quick Deploy to Railway (15 minutes)

Railway provides free hosting with automatic SSL and is perfect for testing/pilot phase.

---

## Step 1: Prepare the Code

Your code is ready! Just make sure it's pushed to GitHub:

```bash
cd /Users/natesimpson/.openclaw/workspace/Inatetechnologies/knight-coi-manager
git add .
git commit -m "Add Basic Auth and deployment config"
git push origin main
```

---

## Step 2: Create Railway Account

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign in with GitHub (easiest)

---

## Step 3: Deploy from GitHub

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose the `knight-coi-manager` repository
4. Railway will auto-detect Node.js and start building

---

## Step 4: Add Postgres Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway provisions a database and automatically adds `DATABASE_URL` to your app

---

## Step 5: Configure Environment Variables

In Railway project settings → Variables, add:

```
NODE_ENV=production
PORT=3030
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=KnightCOI2026!Secure
```

**Note:** `DATABASE_URL` is already set automatically by Railway when you added Postgres.

---

## Step 6: Load Database Schema

**Option A: Via Railway CLI**
```bash
# Install Railway CLI
brew install railway

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run psql $DATABASE_URL < schema.sql
```

**Option B: Via Railway Web Console**
1. Go to your Postgres service in Railway
2. Click **"Connect"** → **"Query"**
3. Paste contents of `schema.sql`
4. Run

---

## Step 7: Load Demo Data (Optional)

If you want to start with demo entities:

```bash
railway run psql $DATABASE_URL < data/demo/knight-demo-seed.sql
```

Or start fresh and import via the web UI later.

---

## Step 8: Get Your URL

Railway auto-generates a URL like:
```
https://knight-coi-production.up.railway.app
```

1. Go to your app service in Railway
2. Click **"Settings"** → **"Domains"**
3. Railway shows your auto-generated domain
4. Click it to test!

You should see a login prompt:
- **Username:** `admin`
- **Password:** `KnightCOI2026!Secure`

---

## Step 9: Add Custom Domain (Optional)

When ready to use `coi.inatetechnologies.com`:

1. In Railway → your app → **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Enter: `coi.inatetechnologies.com`
4. Railway gives you a CNAME target
5. In your DNS provider (Cloudflare, Namecheap, etc.):
   - Add CNAME record: `coi` → Railway's target
6. Wait 5-10 minutes for DNS propagation
7. Railway auto-provisions SSL certificate

---

## Cost

**Railway Pricing:**
- **Free tier:** $5/month credit (enough for pilot)
- **Starter plan:** $5/month for app + $5/month for Postgres = $10/month
- No credit card required for trial

---

## Monitoring & Logs

**View logs:**
1. Railway dashboard → your app service
2. Click **"Deployments"** → latest deployment
3. Click **"View Logs"**

**Restart service:**
- Railway dashboard → your app → **"Restart"**

**Update code:**
- Just push to GitHub → Railway auto-deploys

---

## Alternative: Deploy to Render

If you prefer Render over Railway:

1. Go to https://render.com
2. **"New +"** → **"Web Service"**
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run dev`
   - **Environment:** Node
5. Add same environment variables as above
6. Add Postgres from Render dashboard
7. Deploy!

Render also provides free SSL and custom domains.

---

## Troubleshooting

### "Authentication required" loops
- Check `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set correctly
- Clear browser cache/cookies
- Try incognito window

### Database connection errors
- Verify `DATABASE_URL` is set in Railway
- Check Postgres service is running
- Verify schema was loaded

### App won't start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Make sure `PORT` is set to `3030` or Railway's `$PORT`

### Want to disable auth for testing?
Add environment variable:
```
BASIC_AUTH_ENABLED=false
```

---

## Security Notes

### Change Default Password!

Before sharing with Meredith, change the password:

1. Railway → your app → **Variables**
2. Update `BASIC_AUTH_PASSWORD` to something secure
3. Service auto-restarts
4. Share new credentials with team

### Better Security Later

For production, consider:
- Individual user accounts (requires custom auth implementation)
- OAuth via Google Workspace
- VPN access requirement
- IP allowlisting

---

## Next Steps After Deployment

1. ✅ Test login at your Railway URL
2. ✅ Import real tenant/vendor roster
3. ✅ Process a test COI
4. ✅ Share URL + credentials with Meredith
5. ✅ Monitor usage and collect feedback

---

## Support

**Deployment issues?**
- Railway docs: https://docs.railway.app
- Contact Nate or Larry (via OpenClaw)

**Need help with:**
- Custom domain setup
- SSL certificate issues
- Database migrations
- Production optimizations

---

*Created: March 27, 2026*  
*For: Inatetechnologies COI Manager pilot deployment*
