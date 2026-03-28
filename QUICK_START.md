# Knight COI Manager - Quick Start Checklist

**For:** Meredith's first session  
**Time needed:** 30-45 minutes  
**Goal:** Get familiar with the system and process your first real COI

---

## Before You Start

✅ **Make sure you have:**
- [ ] Access to http://localhost:3030 (Nate will start the server)
- [ ] A list of current tenants/vendors at your properties
- [ ] 2-3 recent COI emails you've received

---

## Session 1: Getting Started (30 min)

### Step 1: See the Demo Data (5 min)

Open http://localhost:3030 in your browser.

**Explore what's there:**
- [ ] Look at the **Overview Stats** - see entities, certificates, review queue count
- [ ] Scroll to **Review Queue** - see sample items needing review
- [ ] Notice the **validity badges** (green = good, yellow = warnings, red = blocked)

**Try this:** Click "Show Details" on a review item to see extracted certificate data

---

### Step 2: Import Your Roster (10 min)

**Create a simple CSV file with 3-5 entities:**

Example `knight-roster.csv`:
```csv
name,entity_type,property_code,primary_email,notes
Your Tenant Name,tenant,RIVERSOUTH,contact@tenant.com,Suite 200
Another Company,vendor,,vendor@example.com,HVAC contractor
```

**Import it:**
- [ ] Scroll to **Roster Import** section
- [ ] Click "Choose File" and select your CSV
- [ ] Click "Import Roster"
- [ ] Check the summary (should show "created: 2" or similar)
- [ ] Refresh the page - your entities should appear in the stats

**Troubleshooting:**
- If you get errors, check that the CSV has a header row
- Entity names should be unique
- Entity type must be "tenant" or "vendor" (or leave blank for tenant)

---

### Step 3: Process a Real COI (15 min)

**Option A: Import via JSON (easier for first try)**

1. **Find a recent COI email you received**
2. Ask Nate to help create a JSON file with:
   - Email subject
   - Sender email
   - Insured name (from the certificate)
   - Certificate holder (should be Knight Real Estate or your property)
   - Expiration date
   - Policy details

3. **Import it:**
   - [ ] Scroll to **Inbox Import** section
   - [ ] Paste the JSON or use "Import from Provider JSON"
   - [ ] Click "Import Message"

4. **Review it:**
   - [ ] Refresh the page
   - [ ] Check the **Review Queue** - your COI should appear
   - [ ] Click "Show Details" to see extracted data
   - [ ] Verify the extracted information matches the actual certificate

5. **Take action:**
   - [ ] If the entity match looks correct → Click "Accept"
   - [ ] If no match → Use "Assign to Entity" dropdown → Select correct tenant/vendor → Click "Assign + Accept"
   - [ ] If something's wrong → Click "Reject" → Choose reason → Submit

6. **Confirm success:**
   - [ ] Item should disappear from Review Queue
   - [ ] Check Overview Stats - certificate count should increase by 1
   - [ ] In a real system, reminder emails would now be scheduled

---

### Step 4: Understand Validity Checks (5 min)

Look at the **validity display** for certificates in the review queue:

- [ ] **Green badge** = "Acceptable for MVP" - all required fields present
- [ ] **Yellow badge** = "Has Warnings" - missing optional info (carrier details, coverage lines)
- [ ] **Red badge** = "Blocked" - missing required info (insured name, expiration, or no entity match)

**Note:** Red badges must be resolved (fix data or assign entity) before you can accept.

---

## What You Just Learned

✅ How to view the dashboard and understand stats  
✅ How to import your tenant/vendor roster  
✅ How to process an incoming COI  
✅ How to accept, assign, or reject a certificate  
✅ What validity checks mean  

---

## Session 2: Real Workflow (Next Time)

When you're ready to pilot with live data:

1. **Import full roster**
   - [ ] Export tenant list from your property management system
   - [ ] Format as CSV (name, entity_type, property_code, email)
   - [ ] Import all at once

2. **Connect mailbox** (when feature is ready)
   - [ ] System will automatically read COI emails
   - [ ] New certificates appear in review queue daily
   - [ ] You just review and approve

3. **Monitor expirations**
   - [ ] System sends reminder emails automatically (60/30/7/1 days before expiration)
   - [ ] When tenant sends updated COI, system detects renewal
   - [ ] Old reminders are cancelled, new ones scheduled

---

## Quick Reference

### Common Actions

| What You Want | Where to Go | What to Do |
|---------------|-------------|------------|
| See all tenants/vendors | Scroll down to Entities section (if visible) or check Overview Stats | - |
| Add new tenant/vendor | Roster Import section | Prepare CSV → Choose File → Import |
| Process new COI | Review Queue | Click Show Details → Verify info → Accept/Assign/Reject |
| Check certificate details | Click on certificate or review item | Look at extracted fields and validity status |

### Validity Quick Guide

| Status | Badge Color | Meaning | Action Needed |
|--------|-------------|---------|---------------|
| Acceptable for MVP | Green | Good to go | Just accept if entity match is correct |
| Has Warnings | Yellow | Missing optional info | Accept if required fields are OK, verify manually |
| Blocked | Red | Missing required data or no entity match | Fix data or assign entity before accepting |

### Rejection Reasons

Choose the reason that fits:
- **Wrong certificate holder** - Not for your property
- **Duplicate** - Already have this one
- **Expired** - Certificate expired before you received it
- **Wrong document** - Not a COI (invoice, quote, etc.)
- **Incomplete** - Missing too much critical information

---

## Getting Help During Pilot

**Questions about:**
- How the system works → Check `USER_GUIDE.md`
- Import errors or technical issues → Contact Nate
- Feature requests or workflow improvements → Write them down for feedback session

**Common First-Time Issues:**

| Problem | Solution |
|---------|----------|
| CSV import fails | Make sure first row is the header (name,entity_type,etc.) |
| Entity won't match | Check spelling - "ABC Corp" ≠ "ABC Corporation". Use Assign to Entity. |
| Can't accept certificate | Check validity badge - red = fix blocking issues first |
| Lost demo data | Nate can reset the database if needed |

---

## Success Criteria for Pilot

After your first week, you should be able to:

✅ Import/update your roster without help  
✅ Process 5-10 COIs per day efficiently  
✅ Understand when to accept vs assign vs reject  
✅ Know what validity warnings mean and when to worry  
✅ Have confidence in the system's entity matching  

**Then we'll discuss:**
- Automatic mailbox sync (stop manual imports)
- Reminder email templates and timing
- Reporting needs (who's current? who's expired?)
- Multi-user access (if your team will use it)

---

## Next Session Prep

Before your next demo session:

- [ ] Write down 3 questions about the workflow
- [ ] Identify your most common COI scenarios (new tenant? vendor renewal? lease transfer?)
- [ ] Think about what reports you'd want (expiring this month? missing COIs?)
- [ ] Note any confusing terminology in the UI

---

*Ready? Let's process your first COI!*

---

**Created:** March 27, 2026  
**For:** Knight Real Estate pilot with Meredith
