// Postgres repository write methods
// Extends the read-only postgres-repository.js with write operations

import crypto from 'node:crypto';

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

/**
 * Add write methods to an existing Postgres repository.
 * @param {object} db - Database client with query(sql, params) method
 * @param {object} readMethods - Existing read methods from createPostgresRepository
 * @returns {object} Combined read + write repository
 */
export function addWriteMethods(db, readMethods) {
  return {
    ...readMethods,

    /**
     * Replace all certificates for a client.
     * Deletes existing certificates and inserts new ones in a transaction.
     */
    async replaceCertificates(clientId, certificates) {
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM certificates WHERE client_id = $1', [clientId]);

        for (const cert of certificates) {
        await db.query(
          `INSERT INTO certificates (
             id, client_id, entity_id, inbound_message_id, attachment_id,
             status, review_status, confidence_score, insured_name,
             certificate_holder, producer_name, carrier_summary,
             policy_summary_json, effective_date, expiration_date,
             received_date, is_active, supersedes_certificate_id, parsed_json
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17, $18, $19
           )`,
          [
            cert.id,
            clientId,
            cert.entityId || null,
            cert.sourceEmailId || null,
            cert.sourceAttachmentId || null,
            cert.status || 'received',
            cert.reviewStatus || 'pending',
            cert.confidenceScore || null,
            cert.insuredName || null,
            cert.certificateHolder || null,
            cert.producerName || null,
            cert.carrierSummary || null,
            JSON.stringify(cert.policySummary || []),
            cert.effectiveDate || null,
            cert.expirationDate || null,
            cert.receivedDate || null,
            cert.isActive || false,
            cert.supersedesCertificateId || null,
            JSON.stringify(cert.parsedJson || {}),
          ]
        );
      }

      await db.query('COMMIT');
      return this.getCertificates(clientId);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

    /**
     * Replace all entities for a client.
     * Deletes existing entities and inserts new ones in a transaction.
     */
    async replaceEntities(clientId, entities) {
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM entities WHERE client_id = $1', [clientId]);

        for (const entity of entities) {
        await db.query(
          `INSERT INTO entities (
             id, client_id, entity_type_id, property_id, external_id,
             name, normalized_name, status, primary_email,
             alternate_emails, metadata_json
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
           )`,
          [
            entity.id,
            clientId,
            entity.entityTypeId,
            entity.propertyId || null,
            entity.externalId || null,
            entity.name,
            entity.normalizedName,
            entity.status || 'active',
            entity.primaryEmail || null,
            JSON.stringify(entity.alternateEmails || []),
            JSON.stringify(entity.metadataJson || {}),
          ]
        );
      }

      await db.query('COMMIT');
      return this.getEntities(clientId);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  },

    /**
     * Replace all messages for a client.
     * TODO: This is dangerous - probably should append instead.
     */
    async replaceMessages(clientId, messages) {
      throw new Error('replaceMessages not implemented - use appendImportedMessage instead');
    },

    /**
     * Save a review override decision.
     * Updates review_queue_items with the resolution.
     */
    async saveReviewOverride(clientId, reviewItemId, override) {
      // Upsert the review queue item
      await db.query(
        `INSERT INTO review_queue_items (
           id, client_id, status, details_json, resolved_at
         ) VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           details_json = EXCLUDED.details_json,
           resolved_at = EXCLUDED.resolved_at`,
        [
          reviewItemId,
          clientId,
          'resolved',
          JSON.stringify({ ...override, reviewItemId }),
        ]
      );

      return this.getReviewOverrides(clientId);
    },

    /**
     * Reset all data for a client (demo reset).
     * Cascading deletes will handle related records.
     */
    async reset(clientId) {
      await db.query('DELETE FROM certificates WHERE client_id = $1', [clientId]);
      await db.query('DELETE FROM entities WHERE client_id = $1', [clientId]);
      await db.query('DELETE FROM inbound_messages WHERE client_id = $1', [clientId]);
      await db.query('DELETE FROM review_queue_items WHERE client_id = $1', [clientId]);
      await db.query('DELETE FROM reminder_events WHERE client_id = $1', [clientId]);
    },

    /**
     * Export current state (for compatibility with file-based repo).
     * Builds a snapshot of all client data.
     */
    async exportState(clientId) {
      const [client, entityTypes, properties, entities, certificates, messages, reviewOverrides] =
        await Promise.all([
          this.getClientBySlug(clientId), // Assuming clientId might be a slug in some contexts
          this.getEntityTypes(clientId),
          this.getProperties(clientId),
          this.getEntities(clientId),
          this.getCertificates(clientId),
          this.getMessages(clientId),
          this.getReviewOverrides(clientId),
        ]);

      return {
        client,
        entityTypes,
        properties,
        entities,
        certificates,
        sampleMessages: messages,
        reviewOverrides,
      };
    },
  };
}
