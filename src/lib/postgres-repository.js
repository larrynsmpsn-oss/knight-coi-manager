import crypto from 'node:crypto';
import { addWriteMethods } from './postgres-repository-write.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rows(result) {
  return result?.rows || [];
}

function deterministicUuid(input) {
  const hex = crypto.createHash('md5').update(String(input)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export function createPostgresRepository(db) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('A db client with query(sql, params) is required');
  }

  const readMethods = {
    async getClientBySlug(slug) {
      const result = await db.query(
        `select id, name, slug, timezone
         from clients
         where slug = $1
         limit 1`,
        [slug]
      );
      const row = rows(result)[0] || null;
      return row ? clone(row) : null;
    },

    async getEntityTypes(clientId) {
      const result = await db.query(
        `select id, client_id as "clientId", key, label
         from entity_types
         where client_id = $1
         order by key asc`,
        [clientId]
      );
      return clone(rows(result));
    },

    async getProperties(clientId) {
      const result = await db.query(
        `select id, client_id as "clientId", name, code
         from properties
         where client_id = $1
         order by name asc`,
        [clientId]
      );
      return clone(rows(result));
    },

    async getEntities(clientId) {
      const result = await db.query(
        `select
           id,
           client_id as "clientId",
           entity_type_id as "entityTypeId",
           property_id as "propertyId",
           external_id as "externalId",
           name,
           normalized_name as "normalizedName",
           status,
           primary_email as "primaryEmail",
           alternate_emails as "alternateEmails",
           metadata_json as "metadataJson"
         from entities
         where client_id = $1
         order by name asc`,
        [clientId]
      );
      return clone(rows(result));
    },

    async getCertificates(clientId) {
      const result = await db.query(
        `select
           id,
           client_id as "clientId",
           entity_id as "entityId",
           inbound_message_id as "sourceEmailId",
           attachment_id as "sourceAttachmentId",
           status,
           review_status as "reviewStatus",
           confidence_score as "confidenceScore",
           insured_name as "insuredName",
           certificate_holder as "certificateHolder",
           producer_name as "producerName",
           carrier_summary as "carrierSummary",
           policy_summary_json as "policySummary",
           effective_date as "effectiveDate",
           expiration_date as "expirationDate",
           received_date as "receivedDate",
           is_active as "isActive",
           supersedes_certificate_id as "supersedesCertificateId",
           parsed_json as "parsedJson"
         from certificates
         where client_id = $1
         order by expiration_date desc nulls last, id asc`,
        [clientId]
      );
      return clone(rows(result));
    },

    async getMessages(clientId) {
      const messages = await db.query(
        `select
           id,
           from_email as "fromEmail",
           from_name as "fromName",
           subject,
           body_text as "bodyText",
           received_at as "receivedAt"
         from inbound_messages
         where client_id = $1
         order by received_at asc nulls last, id asc`,
        [clientId]
      );

      // Fetch attachments for each message
      const result = [];
      for (const msg of rows(messages)) {
        const attachmentsResult = await db.query(
          `select
             id,
             filename,
             content_type as "contentType",
             byte_size as "byteSize",
             extracted_text as "text"
           from attachments
           where inbound_message_id = $1`,
          [msg.id]
        );
        result.push({
          ...msg,
          attachments: rows(attachmentsResult),
        });
      }
      return clone(result);
    },

    async getReviewOverrides(clientId) {
      const result = await db.query(
        `select id, details_json as payload
         from review_queue_items
         where client_id = $1
           and status <> 'open'`,
        [clientId]
      );

      const overrides = {};
      for (const row of rows(result)) {
        const payload = row.payload || {};
        const key = payload.reviewItemId || row.id;
        overrides[key] = payload;
      }
      return overrides;
    },

    async appendImportedMessage({ clientId, mailboxId, message }) {
      const inboundMessageId = deterministicUuid(`message:${message.id}`);
      await db.query(
        `insert into inbound_messages (
           id, client_id, mailbox_id, provider_message_id, thread_key,
           from_email, from_name, subject, body_text, received_at, processing_status
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          inboundMessageId,
          clientId,
          mailboxId,
          message.id,
          message.threadKey || null,
          message.fromEmail || null,
          message.fromName || null,
          message.subject || '',
          message.bodyText || '',
          message.receivedAt || null,
          'processed',
        ]
      );

      for (const attachment of message.attachments || []) {
        await db.query(
          `insert into attachments (
             id, client_id, inbound_message_id, filename, content_type,
             byte_size, storage_key, sha256, is_likely_certificate, extracted_text, extraction_json
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            deterministicUuid(`attachment:${message.id}:${attachment.id || attachment.filename}`),
            clientId,
            inboundMessageId,
            attachment.filename,
            attachment.contentType || null,
            attachment.byteSize || null,
            `imports/${attachment.filename}`,
            null,
            /coi|certificate/i.test(`${attachment.filename || ''} ${attachment.text || ''}`),
            attachment.text || null,
            {},
          ]
        );
      }

      return inboundMessageId;
    },
  };

  // Add write methods to complete the repository interface
  return addWriteMethods(db, readMethods);
}
