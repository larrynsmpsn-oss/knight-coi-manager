-- Knight COI Manager
-- Initial schema draft

create table clients (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  timezone text not null default 'America/Chicago',
  branding_json jsonb not null default '{}'::jsonb,
  email_settings_json jsonb not null default '{}'::jsonb,
  reminder_policy_json jsonb not null default '{"offset_days":[60,30,7,1]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table properties (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table entity_types (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  key text not null,
  label text not null,
  active boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, key)
);

create table entities (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  entity_type_id uuid not null references entity_types(id) on delete restrict,
  external_id text,
  name text not null,
  normalized_name text not null,
  status text not null default 'active',
  primary_email text,
  alternate_emails jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entities_client_idx on entities(client_id);
create index entities_name_idx on entities(client_id, normalized_name);

create table mailboxes (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  provider text not null,
  address text not null,
  active boolean not null default true,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, address)
);

create table inbound_messages (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  provider_message_id text,
  thread_key text,
  from_email text,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz not null,
  processing_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbound_messages_status_idx on inbound_messages(client_id, processing_status);
create index inbound_messages_received_idx on inbound_messages(client_id, received_at desc);

create table attachments (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  inbound_message_id uuid not null references inbound_messages(id) on delete cascade,
  filename text not null,
  content_type text,
  byte_size bigint,
  storage_key text not null,
  sha256 text,
  is_likely_certificate boolean not null default false,
  extracted_text text,
  extraction_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attachments_message_idx on attachments(inbound_message_id);
create index attachments_sha_idx on attachments(client_id, sha256);

create table certificates (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  entity_id uuid references entities(id) on delete set null,
  inbound_message_id uuid references inbound_messages(id) on delete set null,
  attachment_id uuid references attachments(id) on delete set null,
  status text not null default 'received',
  review_status text not null default 'pending',
  confidence_score numeric(5,2),
  certificate_hash text,
  insured_name text,
  certificate_holder text,
  producer_name text,
  carrier_summary text,
  policy_summary_json jsonb not null default '[]'::jsonb,
  effective_date date,
  expiration_date date,
  received_date date,
  is_active boolean not null default false,
  supersedes_certificate_id uuid references certificates(id) on delete set null,
  raw_extracted_text text,
  parsed_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certificates_entity_idx on certificates(entity_id, expiration_date);
create index certificates_active_idx on certificates(client_id, is_active, expiration_date);
create index certificates_review_idx on certificates(client_id, review_status);

create table reminder_policies (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  entity_type_id uuid references entity_types(id) on delete cascade,
  key text not null,
  active boolean not null default true,
  offsets_json jsonb not null default '[60,30,7,1]'::jsonb,
  template_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, key)
);

create table reminder_events (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  certificate_id uuid references certificates(id) on delete cascade,
  reminder_policy_id uuid references reminder_policies(id) on delete set null,
  reminder_type text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  canceled_at timestamptz,
  delivery_status text not null default 'scheduled',
  email_to jsonb not null default '[]'::jsonb,
  email_cc jsonb not null default '[]'::jsonb,
  template_key text,
  provider_message_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminder_events_schedule_idx on reminder_events(client_id, delivery_status, scheduled_for);
create index reminder_events_entity_idx on reminder_events(entity_id, scheduled_for);

create table review_queue_items (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  inbound_message_id uuid references inbound_messages(id) on delete set null,
  attachment_id uuid references attachments(id) on delete set null,
  certificate_id uuid references certificates(id) on delete set null,
  item_type text not null,
  status text not null default 'open',
  suggested_entity_id uuid references entities(id) on delete set null,
  reason text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index review_queue_status_idx on review_queue_items(client_id, status, created_at);

create table outbound_messages (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  entity_id uuid references entities(id) on delete set null,
  reminder_event_id uuid references reminder_events(id) on delete set null,
  direction text not null default 'outbound',
  channel text not null default 'email',
  to_json jsonb not null default '[]'::jsonb,
  cc_json jsonb not null default '[]'::jsonb,
  subject text,
  body_text text,
  provider_message_id text,
  delivery_status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index outbound_messages_client_idx on outbound_messages(client_id, created_at desc);
