# Knight COI Manager - Deployment Handoff

**Status:** Ready for pilot deployment  
**Date:** March 27, 2026  
**For:** Inatetechnologies / Knight Real Estate pilot

---

## 🔐 Authentication Credentials

**Default login (Railway deployment):**
- **Username:** `admin`
- **Password:** `KnightCOI2026!Secure`

**⚠️ IMPORTANT:** Change this password before sharing with Meredith's team!

---

## 🚀 Deployment Steps

Follow `DEPLOY.md` for complete instructions. Quick summary:

1. **Push code to GitHub** (if not already)
2. **Create Railway account** at https://railway.app
3. **Deploy from GitHub** repo
4. **Add Postgres** database (Railway provisions automatically)
5. **Set environment variables:**
   ```
   NODE_ENV=production
   BASIC_AUTH_ENABLED=true
   BASIC_AUTH_USERNAME=admin
   BASIC_AUTH_PASSWORD=[change this!]
   ```
6. **Load database schema** from `schema.sql`
7. **Test at Railway URL** (e.g., `knight-coi-production.up.railway.app`)

**Total time:** 15-20 minutes

---

## 📍 What's Ready

✅ **Full application:**
- COI email ingestion
- Certificate field extraction
- Entity matching (fuzzy + exact)
- Review queue workflow
- Accept/assign/reject actions
- Postgres persistence
- Roster import (CSV)
- Browser UI with dark theme

✅ **Documentation:**
- `docs/index.html` - Documentation hub
- `docs/quick-start.html` - First session guide
- `docs/user-guide.html` - Complete operator manual
- `DEPLOY.md` - Deployment instructions
- `USER_GUIDE.md` - Markdown version of user guide
- `QUICK_START.md` - Markdown version of quick start

✅ **Security:**
- Basic Auth implemented
- Environment variable configuration
- Disabled by default for local development
- Enabled for production

✅ **Testing:**
- 53 passing unit tests
- Real COI email tested end-to-end
- Postgres writes verified
- Entity matching validated

---

## 🌐 Domain Setup

**Later, when ready:**

1. Point `coi.inatetechnologies.com` (or your chosen subdomain) to Railway
2. Add CNAME record in your DNS
3. Railway auto-provisions SSL
4. Takes ~5-10 minutes

**For now:** Use Railway's auto-generated URL for testing

---

## 📊 What Meredith Will See

1. **Login prompt** (browser Basic Auth popup)
2. **Dashboard** with overview stats
3. **Review Queue** section for pending COIs
4. **Roster Import** panel for CSV uploads
5. **Certificate validity badges** (green/yellow/red)
6. **Accept/Assign/Reject** actions
7. **Documentation links** in footer

---

## 🔧 Configuration Files

### Local Development (`.env`)
```env
NODE_ENV=development
PORT=3030
BASIC_AUTH_ENABLED=false  # Disabled for local dev
DATABASE_URL=postgres://natesimpson@localhost/knight_coi
```

### Production (Railway environment variables)
```env
NODE_ENV=production
PORT=3030
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=KnightCOI2026!Secure  # CHANGE THIS!
DATABASE_URL=[auto-set by Railway]
```

---

## 📝 First Session with Meredith

Follow `docs/quick-start.html` checklist:

1. **Explore demo data** (5 min)
2. **Import roster** (10 min) - Add 3-5 real tenants/vendors
3. **Process first COI** (15 min) - Import, review, accept/assign/reject
4. **Understand validity** (5 min) - Green/yellow/red badges

**Total:** 30-45 minutes

---

## 🛠️ Post-Deployment

**After Railway deployment:**

1. ✅ Test login with default credentials
2. ✅ Change password in Railway environment variables
3. ✅ Load demo data OR import real roster
4. ✅ Test full workflow (import COI → review → accept)
5. ✅ Share URL + new credentials with Meredith
6. ✅ Schedule first session

**Monitor:**
- Railway logs for errors
- Database size (free tier: 512MB)
- Response times
- Meredith's feedback

---

## 💰 Cost

**Railway free tier:**
- $5/month credit (enough for pilot)
- Includes: app hosting + Postgres database
- No credit card required for trial

**Paid tier (if needed):**
- $5/month app + $5/month Postgres = $10/month total

---

## 🚨 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Auth loops | Clear cookies, try incognito |
| Can't connect to DB | Check `DATABASE_URL` is set in Railway |
| Schema missing | Run `psql $DATABASE_URL < schema.sql` |
| App won't start | Check Railway logs, verify env vars |
| Want to disable auth | Set `BASIC_AUTH_ENABLED=false` |

---

## 📞 Support Contacts

**Deployment help:**
- Nate Simpson (project owner)
- Larry (OpenClaw AI assistant)

**Railway support:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

---

## 🎯 Success Criteria

**Pilot is successful when:**

✅ Meredith can log in without help  
✅ She imports her tenant/vendor roster  
✅ She processes 5-10 COIs per day efficiently  
✅ Entity matching works 90%+ of the time  
✅ Team understands accept vs assign vs reject  
✅ System saves 2+ hours per week vs manual tracking  

**Then consider:**
- Custom domain (`coi.inatetechnologies.com`)
- Individual user accounts
- Automatic mailbox sync
- Reminder email system
- Reporting dashboard

---

## 📂 Repository Structure

```
knight-coi-manager/
├── docs/                    # HTML documentation
│   ├── index.html          # Documentation hub
│   ├── quick-start.html    # First session guide
│   └── user-guide.html     # Complete manual
├── src/                     # Application code
│   ├── server.js           # Main server (with Basic Auth)
│   ├── lib/                # Business logic
│   └── cli/                # Import/export tools
├── data/                    # Demo data & imports
├── tests/                   # Unit tests (53 passing)
├── schema.sql              # Database schema
├── DEPLOY.md               # Deployment guide
├── USER_GUIDE.md           # User documentation
├── QUICK_START.md          # Quick start checklist
└── HANDOFF.md              # This file
```

---

## ✨ What's Next

**Immediate (this week):**
1. Deploy to Railway
2. First session with Meredith
3. Collect initial feedback

**Short-term (2-4 weeks):**
1. Import full tenant/vendor roster
2. Process real COI workflow
3. Tune entity matching rules
4. Add custom domain

**Long-term (if pilot succeeds):**
1. Automatic mailbox sync
2. Reminder email system
3. Multi-user accounts
4. Reporting & analytics
5. Mobile-friendly UI

---

**Ready to deploy!** 🚀

Follow `DEPLOY.md` step-by-step, and reach out if you hit any snags.

---

*Created: March 27, 2026*  
*Project: Inatetechnologies COI Manager*  
*Pilot Customer: Knight Real Estate*
