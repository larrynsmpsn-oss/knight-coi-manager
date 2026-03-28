# Knight COI Manager - User Guide

**For:** Knight Real Estate property management team  
**Version:** MVP Demo (March 2026)

---

## What This Does

The COI Manager automatically processes incoming Certificate of Insurance (COI) emails:

1. **Reads** COI emails and attachments from your mailbox
2. **Extracts** key information (insured name, expiration date, coverage amounts, etc.)
3. **Matches** certificates to your tenants and vendors
4. **Tracks** expiration dates
5. **Sends** automatic reminder emails at 60, 30, 7, and 1 days before expiration
6. **Alerts** you when something needs your attention

---

## Accessing the System

**Local Demo:** http://localhost:3030  
*(Production URL will be provided when deployed)*

---

## Main Dashboard

When you open the system, you'll see:

### Overview Stats (Top)
- **Entities:** Total tenants and vendors being tracked
- **Certificates:** Active COIs on file
- **Needs Review:** Items requiring your attention
- **Validity Issues:** Certificates with missing or incorrect information

### Review Queue (Middle)
This is your action center. Items appear here when:
- A COI arrives for an unknown tenant/vendor
- A certificate is missing required information
- Something needs manual verification

### Import Tools (Bottom)
- **Roster Import:** Add/update tenants and vendors in bulk
- **Inbox Import:** Manually import COI emails for testing

---

## Daily Workflow

### 1. Check the Review Queue

**When an item appears:**
1. Click to expand the details
2. Review the extracted certificate information:
   - Insured name
   - Certificate holder (should be Knight Real Estate or your property)
   - Expiration date
   - Coverage amounts
   - Policy number

**Three actions you can take:**

#### ✅ **Accept** (when everything looks correct)
- The system matched the certificate to the right tenant/vendor
- Certificate holder is correct
- Expiration date is reasonable
- Click "Accept" → Certificate becomes active, reminders are scheduled

#### 👤 **Assign to Entity** (when the match is wrong or missing)
- The system couldn't match automatically, OR
- It matched to the wrong tenant/vendor
- Select the correct entity from the dropdown
- Click "Assign + Accept" → Certificate is linked to that entity

#### ❌ **Reject** (when the certificate is invalid)
- Wrong certificate holder (not your property)
- Duplicate email
- Wrong file attached
- Select a rejection reason and click "Reject"

### 2. Monitor Expiring Certificates

The system automatically sends reminder emails:
- **60 days** before expiration: "Please provide updated COI"
- **30 days** before expiration: Follow-up reminder
- **7 days** before expiration: Urgent reminder
- **1 day** before expiration: Final notice

**When a replacement certificate arrives:**
- The system detects it's a renewal (same policy/entity, newer expiration)
- Cancels old reminders
- Schedules new reminders for the updated expiration

### 3. Keep Your Roster Current

**Add new tenants or vendors:**
1. Prepare a CSV file with these columns:
   - `name` (required) - Company name
   - `entity_type` (tenant or vendor)
   - `property_code` (optional) - Which building/property
   - `primary_email` (optional) - Main contact email
   - `alternate_emails` (optional) - Additional emails, semicolon-separated
   - `external_id` (optional) - Your internal ID/code
   - `notes` (optional)

**Example CSV:**
```csv
name,entity_type,property_code,primary_email,alternate_emails,external_id,notes
Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,ops@aurorawealth.com,,Suite 200
River City Janitorial,vendor,,dispatch@rivercity.com,,,Building-wide contract
```

2. Go to **Roster Import** section
3. Click "Choose File" and select your CSV
4. Click "Import Roster"
5. Review the summary (created/updated/errors)

**The system will:**
- Create new entities if the name doesn't match anything existing
- Update existing entities if it finds a match (by name or external_id)

---

## Understanding Certificate Validity

Each certificate is checked for:

### ✅ **Acceptable** (green)
- Has insured name
- Has certificate holder
- Has expiration date
- Expiration date is in the future

### ⚠️ **Warnings** (yellow)
These won't block acceptance, but you should verify:
- Missing carrier information
- Missing coverage details
- Certificate holder name doesn't exactly match expected

### 🛑 **Blocked** (red)
These MUST be fixed before acceptance:
- Missing insured name
- Missing expiration date
- Expiration date is in the past
- Expiration date is before effective date
- No matching tenant/vendor (use "Assign to Entity")

---

## Common Scenarios

### Scenario 1: New Tenant Moves In
1. Add them to the roster via CSV import
2. Request COI from tenant
3. When COI email arrives, system processes it automatically
4. Check review queue, accept if everything looks good

### Scenario 2: Unknown Company Sends COI
1. COI appears in review queue with reason "no_entity_match"
2. **Option A:** Add them to roster first, then accept
3. **Option B:** Use "Assign to Entity" dropdown to manually match

### Scenario 3: Certificate About to Expire
1. System sends automatic reminders (60/30/7/1 days)
2. Tenant/vendor sends updated COI
3. System detects it's a renewal
4. Old certificate is superseded, new reminders are scheduled
5. You may need to review/accept if anything looks unusual

### Scenario 4: Wrong Certificate Arrives
1. Certificate holder is a different property
2. Or it's for a different entity entirely
3. Click "Reject" → Select reason → Submit
4. Contact sender to request correct certificate

---

## Tips for Success

### Best Practices
- **Import your full tenant/vendor roster first** before processing COIs
- **Check the review queue daily** (or set up email notifications when available)
- **Use external_id** in your roster for easy matching with your property management system
- **Keep email addresses current** so reminders reach the right people

### When to Manually Assign
- Tenant name on COI doesn't exactly match your records (e.g., "ABC Corp" vs "ABC Corporation")
- COI is for a parent company but should be linked to a subsidiary in your roster
- Vendor changes names but it's the same company

### When to Reject
- Certificate holder is not Knight Real Estate or one of your properties
- COI is a duplicate (already on file)
- Certificate is expired before you even receive it
- Wrong document attached (invoice, proposal, etc. instead of COI)

---

## Roster Import Reference

### Required Fields
- `name` - Must be unique per entity type

### Valid Entity Types
- `tenant` (default if blank)
- `vendor`

### Valid Property Codes
Currently configured properties:
- `RIVERSOUTH` - Riversouth Building
- `WESTGATE` - Westgate Office Center

*(Contact support to add new properties)*

### Email Format
- Single email: `john@example.com`
- Multiple emails: `john@example.com;jane@example.com`

---

## Getting Help

### Current Status
This is the **MVP demo version** running locally. Features being developed:
- Live mailbox sync (automatic COI ingestion)
- Email notification system for expiring certificates
- Advanced reporting and export
- Multi-user access controls

### Support Contact
For questions, issues, or feature requests during pilot:
- Nate Simpson (project sponsor)
- Larry (AI assistant via OpenClaw)

---

## Glossary

**COI** - Certificate of Insurance (also called "Evidence of Coverage")

**ACORD** - Standard insurance form format (ACORD 25 is most common for liability certificates)

**Certificate Holder** - The party protected by the insurance (should be Knight Real Estate or your property)

**Insured** - The party who holds the insurance policy (your tenant or vendor)

**Additional Insured** - When the certificate holder is explicitly named on the policy (preferred)

**Occurrence Policy** - Coverage applies to incidents that occur during the policy period (most common)

**Claims-Made Policy** - Coverage applies to claims filed during the policy period (less common, requires tail coverage)

**Aggregate** - Total maximum the policy will pay for all claims during the policy period

**Per Occurrence** - Maximum the policy will pay for a single incident

---

*Last updated: March 27, 2026*
