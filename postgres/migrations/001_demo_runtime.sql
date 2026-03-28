-- Knight COI Manager
-- Phase 2 demo-runtime Postgres schema
-- Compatible with the current postgres seed export helper.

BEGIN;

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  timezone text NOT NULL
);

CREATE TABLE IF NOT EXISTS mailboxes (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label text NOT NULL,
  provider text NOT NULL,
  address text NOT NULL
);

CREATE TABLE IF NOT EXISTS entity_types (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text
);

CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entity_type_id uuid NOT NULL REFERENCES entity_types(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  external_id text,
  name text NOT NULL,
  normalized_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  primary_email text,
  alternate_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS inbound_messages (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  provider_message_id text,
  thread_key text,
  from_email text,
  from_name text,
  subject text,
  body_text text,
  received_at timestamptz,
  processing_status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  inbound_message_id uuid NOT NULL REFERENCES inbound_messages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text,
  byte_size bigint,
  storage_key text NOT NULL,
  sha256 text,
  is_likely_certificate boolean NOT NULL DEFAULT false,
  extracted_text text,
  extraction_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
  inbound_message_id uuid REFERENCES inbound_messages(id) ON DELETE SET NULL,
  attachment_id uuid REFERENCES attachments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  review_status text NOT NULL DEFAULT 'pending',
  confidence_score numeric(5,2),
  insured_name text,
  certificate_holder text,
  producer_name text,
  carrier_summary text,
  policy_summary_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_date date,
  expiration_date date,
  received_date date,
  is_active boolean NOT NULL DEFAULT false,
  supersedes_certificate_id uuid REFERENCES certificates(id) ON DELETE SET NULL,
  parsed_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS review_queue_items (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reason text,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMIT;
