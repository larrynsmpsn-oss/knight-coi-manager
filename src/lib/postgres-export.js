import crypto from 'node:crypto';

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertStatement(table, columns, row) {
  const values = columns.map((column) => sqlLiteral(row[column]));
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
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

function mapId(kind, value) {
  return deterministicUuid(`${kind}:${value}`);
}

export function buildPostgresSeedSql(state) {
  const statements = ['BEGIN;'];
  const clientId = state.client ? mapId('client', state.client.id) : null;
  const mailboxId = mapId('mailbox', `${state.client?.id || 'client'}:demo-mailbox`);

  if (state.client) {
    statements.push(
      insertStatement('clients', ['id', 'name', 'slug', 'timezone'], {
        id: clientId,
        name: state.client.name,
        slug: state.client.slug,
        timezone: state.client.timezone,
      })
    );

    statements.push(
      insertStatement('mailboxes', ['id', 'client_id', 'label', 'provider', 'address'], {
        id: mailboxId,
        client_id: clientId,
        label: 'Demo Mailbox',
        provider: 'demo',
        address: `${state.client.slug || 'demo'}@example.test`,
      })
    );
  }

  for (const entityType of state.entityTypes || []) {
    statements.push(
      insertStatement('entity_types', ['id', 'client_id', 'key', 'label'], {
        id: mapId('entity_type', entityType.id),
        client_id: clientId,
        key: entityType.key,
        label: entityType.label,
      })
    );
  }

  for (const property of state.properties || []) {
    statements.push(
      insertStatement('properties', ['id', 'client_id', 'name', 'code'], {
        id: mapId('property', property.id),
        client_id: clientId,
        name: property.name,
        code: property.code,
      })
    );
  }

  for (const entity of state.entities || []) {
    statements.push(
      insertStatement('entities', ['id', 'client_id', 'entity_type_id', 'property_id', 'external_id', 'name', 'normalized_name', 'status', 'primary_email', 'alternate_emails', 'metadata_json'], {
        id: mapId('entity', entity.id),
        client_id: clientId,
        entity_type_id: mapId('entity_type', entity.entityTypeId),
        property_id: entity.propertyId ? mapId('property', entity.propertyId) : null,
        external_id: entity.externalId || null,
        name: entity.name,
        normalized_name: entity.normalizedName || entity.name.toLowerCase(),
        status: entity.status || 'active',
        primary_email: entity.primaryEmail || null,
        alternate_emails: entity.alternateEmails || [],
        metadata_json: entity.notes ? { notes: entity.notes } : {},
      })
    );
  }

  for (const message of state.sampleMessages || []) {
    const inboundMessageId = mapId('message', message.id);
    statements.push(
      insertStatement('inbound_messages', ['id', 'client_id', 'mailbox_id', 'provider_message_id', 'thread_key', 'from_email', 'from_name', 'subject', 'body_text', 'received_at', 'processing_status'], {
        id: inboundMessageId,
        client_id: clientId,
        mailbox_id: mailboxId,
        provider_message_id: message.id,
        thread_key: null,
        from_email: message.fromEmail || null,
        from_name: message.fromName || null,
        subject: message.subject || '',
        body_text: message.bodyText || '',
        received_at: message.receivedAt || null,
        processing_status: 'processed',
      })
    );

    for (const attachment of message.attachments || []) {
      statements.push(
        insertStatement('attachments', ['id', 'client_id', 'inbound_message_id', 'filename', 'content_type', 'byte_size', 'storage_key', 'sha256', 'is_likely_certificate', 'extracted_text', 'extraction_json'], {
          id: mapId('attachment', attachment.id),
          client_id: clientId,
          inbound_message_id: inboundMessageId,
          filename: attachment.filename,
          content_type: attachment.contentType || null,
          byte_size: attachment.byteSize || null,
          storage_key: `demo/${attachment.filename}`,
          sha256: null,
          is_likely_certificate: /coi|certificate/i.test(attachment.filename || ''),
          extracted_text: attachment.text || null,
          extraction_json: {},
        })
      );
    }
  }

  for (const certificate of state.certificates || []) {
    statements.push(
      insertStatement('certificates', ['id', 'client_id', 'entity_id', 'inbound_message_id', 'attachment_id', 'status', 'review_status', 'confidence_score', 'insured_name', 'certificate_holder', 'producer_name', 'carrier_summary', 'policy_summary_json', 'effective_date', 'expiration_date', 'received_date', 'is_active', 'supersedes_certificate_id', 'parsed_json'], {
        id: mapId('certificate', certificate.id),
        client_id: clientId,
        entity_id: certificate.entityId ? mapId('entity', certificate.entityId) : null,
        inbound_message_id: certificate.sourceEmailId ? mapId('message', certificate.sourceEmailId) : null,
        attachment_id: certificate.sourceAttachmentId ? mapId('attachment', certificate.sourceAttachmentId) : null,
        status: certificate.status || 'received',
        review_status: certificate.needsReview ? 'pending' : 'accepted',
        confidence_score: certificate.confidenceScore ?? null,
        insured_name: certificate.insuredName || null,
        certificate_holder: certificate.certificateHolder || null,
        producer_name: certificate.producerName || null,
        carrier_summary: certificate.carrierSummary || null,
        policy_summary_json: certificate.policySummary || [],
        effective_date: certificate.effectiveDate || null,
        expiration_date: certificate.expirationDate || null,
        received_date: certificate.receivedDate || null,
        is_active: certificate.isActive ?? false,
        supersedes_certificate_id: certificate.supersedesCertificateId ? mapId('certificate', certificate.supersedesCertificateId) : null,
        parsed_json: {
          relationship: certificate.relationship || null,
          reminderEvents: certificate.reminderEvents || [],
        },
      })
    );
  }

  for (const [reviewItemId, override] of Object.entries(state.reviewOverrides || {})) {
    statements.push(
      insertStatement('review_queue_items', ['id', 'client_id', 'item_type', 'status', 'reason', 'details_json'], {
        id: mapId('review_queue_item', reviewItemId),
        client_id: clientId,
        item_type: 'demo_override',
        status: override.status || 'closed',
        reason: override.resolution || 'demo_override',
        details_json: {
          reviewItemId,
          ...override,
        },
      })
    );
  }

  statements.push('COMMIT;');
  return statements.join('\n');
}
