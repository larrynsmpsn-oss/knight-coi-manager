# Knight COI Manager

## Working Name
Knight COI Manager

## Goal
Build a multi-client certificate-of-insurance management system that can ingest incoming email + attachment traffic, understand which entity a certificate belongs to, track expiration expectations, and automatically chase renewals before coverage lapses.

## Current Prototype Capabilities
- demo Knight dataset with tenants + vendors
- mock attachment extraction for likely COIs
- ACORD-style field parsing for carrier summary, coverage lines, and additional-insured hints
- entity matching suggestion
- duplicate vs renewal vs new classification
- reminder schedule generation
- review routing for low-confidence / unmatched intake
- review queue item generation for unresolved intake
- review action flows (accept, assign + accept, reject)
- explicit MVP certificate validity checks
- CSV roster import service for tenant/vendor onboarding
- thin browser UI for review actions, validity visibility, reset, and roster import

Initial use case:
- Client: Knight Real Estate
- Modules: Tenants, Vendors

Future direction:
- Add more modules later without changing the core engine
- Support multiple clients/portfolios from the same product

## Local Commands
```bash
npm test
npm run demo
npm run dev
npm run export:postgres-seed -- data/demo/knight-demo-seed.sql
npm run export:apple-mail-json -- --subject COI --sender broker.com --limit 10 tmp/apple-mail-coi.json
```

Helpful runbooks:
- `LOCAL_DEMO.md`
- `REAL_MAIL_IMPORT.md`
- `POSTGRES_EXPORT.md`
- `NEXT_STEPS.md`

---

## Product Direction

### Delivery Model
- Web app + inbox-driven intake
- Shared processing engine underneath
- Human-review queue for low-confidence cases

### Design Principles
- Start practical, not overbuilt
- Make tenant/vendor first-class modules, but model them as configurable entity types
- Build for multi-client operation from day one
- Keep email/document ingestion centralized and reusable
- Favor auditability over hidden automation

---

## Core Product Shape

### Shared Engine
One backend should power all modules.

Common capabilities:
- intake mailbox processing
- email threading and message history
- PDF/image/OCR extraction
- COI field extraction
- entity matching
- certificate versioning
- expiration tracking
- reminder scheduling
- outbound email logging
- review queue
- audit trail

### Modules
Initial modules:
- Tenant COIs
- Vendor COIs

Future modules might include:
- Contractor insurance
- Property-level compliance
- Franchise/license documents
- W-9 / onboarding document tracking
- Additional client-specific document classes

Recommendation: treat modules as `entity_type` + rules instead of hardcoding two separate products.

---

## Recommended Architecture

### Multi-Client (important)
Build as a multi-tenant SaaS-style app even if only Knight uses it first.

Top-level hierarchy:
- Client Account (ex: Knight Real Estate)
- Portfolio / Property Group (optional)
- Property (optional but useful later)
- Entity (tenant/vendor/future type)
- Certificate
- Reminder Policy

This allows future duplication across multiple clients without cloning codebases.

### Why this matters
If the first version is built only for Knight, expansion gets messy fast. If client scoping is built in now, then future rollout mostly becomes:
- create new client account
- configure branding and reminder templates
- import entity roster
- connect mailbox

---

## Key Data Concepts

### Client
Represents a customer using the software.

Fields:
- id
- name
- slug
- status
- timezone
- branding settings
- outbound email settings
- reminder policy defaults

### Module / Entity Type
Represents the category being tracked.

Initial values:
- tenant
- vendor

Future-safe values:
- contractor
- other

Fields:
- id
- client_id
- key
- label
- active
- config_json

### Entity
Represents the real-world insured party or tracked party.

Fields:
- id
- client_id
- entity_type
- external_id
- name
- normalized_name
- contact_email
- alternate_emails
- property_id (nullable)
- status
- notes

### Certificate
Represents one received COI / version.

Fields:
- id
- client_id
- entity_id
- source_email_id
- source_attachment_id
- certificate_hash
- insured_name
- certificate_holder
- producer_name
- carrier_summary
- policy_summary_json
- effective_date
- expiration_date
- received_date
- status
- confidence_score
- needs_review
- supersedes_certificate_id
- raw_extracted_text
- parsed_json

### Coverage Requirement (later)
Optional rules per entity type or client.

Examples:
- general liability required
- workers comp required for vendors
- minimum coverage thresholds
- additional insured wording requirement

### Reminder Event
Tracks outbound chase notices.

Fields:
- id
- client_id
- entity_id
- certificate_id
- reminder_type
- scheduled_for
- sent_at
- delivery_status
- template_key
- email_to

### Inbox Message / Attachment
Persist source communications for auditability.

Fields:
- message id
- mailbox id
- sender
- subject
- received_at
- thread id
- attachment metadata
- parse status

---

## MVP Workflow

### 1. Intake
- Monitor dedicated mailbox
- Pull inbound emails and attachments
- Detect likely COI attachments (PDF/image)
- Store originals and metadata

### 2. Extraction
- Parse attachment text
- OCR if needed
- Extract likely fields:
  - insured name
  - certificate holder
  - policy dates
  - carriers
  - policy numbers
  - coverage types

### 3. Matching
Try to match the COI to an existing entity using:
- sender email
- insured name similarity
- known aliases
- subject/body clues
- property references

Outcomes:
- confident match → auto-link
- ambiguous → review queue
- no match → create intake exception

### 4. New vs Updated
Rules should decide whether this is:
- a first certificate for that entity
- a renewal/update replacing prior certificate
- a duplicate already received

Likely methods:
- date comparison
- policy number comparison
- document hash
- named insured similarity

### 5. Tracking
Once accepted:
- set active certificate
- track expiration
- schedule reminders for 60 / 30 / 7 / 1 day offsets

### 6. Reminder Suppression
When a new valid updated certificate is received:
- supersede the old one
- cancel future reminders tied to the old active cert

### 7. Human Review
If confidence is low or data is incomplete:
- park item in review queue
- show suggested entity + extracted data
- allow quick approve/correct actions

---

## Product Decisions (current)

### Chosen direction
- One product
- Two initial modules: tenants and vendors
- Keep architecture open for a third/fourth module later
- Build for multiple clients from the beginning

### Recommendations
- Dedicated compliance mailbox per client
- Shared reminder engine
- Client-specific email branding/templates
- Separate review queue from automated pipeline

---

## Reminder Strategy
Default schedule:
- 60 days before expiration
- 30 days before expiration
- 7 days before expiration
- 1 day before expiration

Important behavior:
- do not resend the same interval twice unless manually triggered
- stop reminders when a valid replacement certificate is active
- log every outbound reminder
- allow client-specific reminder copy and escalation rules later

Future options:
- reminder to tenant/vendor contact
- CC internal property manager
- escalate overdue items after expiration

---

## Dashboard / Screens
MVP screens:
- overview dashboard
- expiring soon list
- overdue / missing COIs list
- entity detail page
- certificate history page
- review queue
- inbox processing log
- settings (client + reminder templates)

---

## Technical Recommendation
Suggested stack for MVP:
- Next.js app router web app
- Postgres database
- background jobs for inbox sync + reminders
- object storage for PDF/image originals
- OCR / extraction pipeline with deterministic parsing + AI assist

Could also be built with:
- Rails + Postgres
- Django + Postgres

But for speed and future admin UI flexibility, Next.js + Postgres is reasonable.

---

## MVP Boundaries
Do now:
- inbox ingestion
- certificate storage
- extraction
- matching
- renewal reminder workflow
- review queue
- tenant/vendor support
- multi-client data model

Do later:
- advanced compliance rule validation
- policy limit validation against lease/contract language
- broker portal integrations
- customer-facing portal uploads
- property-specific workflows
- analytics/reporting suite

---

## Open Questions (can default for now)
- Which mailbox provider should be used first?
- Does Knight already have tenant/vendor rosters to import?
- Do reminders go only to external contacts or also internal staff?
- Should certificates be tracked per property from day one or added later?
- What exact fields are mandatory for a COI to count as valid?

---

## Documentation

### For End Users
- **`USER_GUIDE.md`** — complete operator manual for property management teams
- **`QUICK_START.md`** — first-session checklist for new users (30-45 min)

### For Developers
- `BUILD_PLAN.md` — initial MVP build strategy
- `IMPLEMENTATION_NOTES.md` — early architecture decisions
- `INTAKE_PIPELINE.md` — how inbound messages become certificates
- `MVP_ACCEPTANCE_RULES.md` — certificate validity criteria for MVP
- `STATUS.md` — current progress and verified features
- `TASKS.md` — task log
- `LOCAL_DEMO.md` — how to run the demo server
- `POSTGRES_SETUP.md` — how to set up Postgres backend
- `POSTGRES_EXPORT.md` — how to export demo state to Postgres seed SQL
- `REAL_MAIL_IMPORT.md` — how to import real mailbox data
- `NEXT_STEPS.md` — recommended next build slice
- `MVP_HANDOFF.md` — context for the next builder

---

## Immediate Next Build Artifacts
1. product requirements doc
2. database schema
3. intake pipeline design
4. reminder engine design
5. first-pass UI wireframe / route map
6. MVP implementation scaffold
