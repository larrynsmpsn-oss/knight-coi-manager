/**
 * Sync wrapper for Postgres repository.
 * Pre-loads data at startup to provide sync interface for demo-store.
 * TODO: Make demo-store async-aware for true async repo support.
 */

export async function createSyncPostgresWrapper(asyncRepo, clientSlug = 'knight-real-estate') {
  // Pre-load all data
  const client = await asyncRepo.getClientBySlug(clientSlug);
  if (!client) {
    throw new Error(`Client not found: ${clientSlug}`);
  }

  const clientId = client.id;
  const [entityTypes, properties, entities, certificates, messages, reviewOverrides] = await Promise.all([
    asyncRepo.getEntityTypes(clientId),
    asyncRepo.getProperties(clientId),
    asyncRepo.getEntities(clientId),
    asyncRepo.getCertificates(clientId),
    asyncRepo.getMessages(clientId),
    asyncRepo.getReviewOverrides(clientId),
  ]);

  // In-memory cache
  let state = {
    client,
    entityTypes,
    properties,
    entities,
    certificates,
    sampleMessages: messages,
    reviewOverrides,
  };

  // Sync wrapper
  return {
    getClient() {
      return client;
    },
    getEntityTypes() {
      return state.entityTypes;
    },
    getProperties() {
      return state.properties;
    },
    getEntities() {
      return state.entities;
    },
    getCertificates() {
      return state.certificates;
    },
    getMessages() {
      return state.sampleMessages;
    },
    getReviewOverrides() {
      return state.reviewOverrides;
    },
    
    async replaceCertificates(clientIdOrCertificates, certificates) {
      // Support both (clientId, certificates) and (certificates) signatures
      const certs = certificates !== undefined ? certificates : clientIdOrCertificates;
      const result = await asyncRepo.replaceCertificates(clientId, certs);
      state.certificates = result;
      return result;
    },
    
    async replaceEntities(clientIdOrEntities, entities) {
      // Support both (clientId, entities) and (entities) signatures
      const ents = entities !== undefined ? entities : clientIdOrEntities;
      const result = await asyncRepo.replaceEntities(clientId, ents);
      state.entities = result;
      return result;
    },
    
    async replaceMessages(clientIdOrMessages, messages) {
      // Support both (clientId, messages) and (messages) signatures
      // Not fully implemented in Postgres yet
      const msgs = messages !== undefined ? messages : clientIdOrMessages;
      state.sampleMessages = msgs;
      return msgs;
    },
    
    async saveReviewOverride(clientIdOrReviewItemId, reviewItemIdOrOverride, override) {
      // Support both (clientId, reviewItemId, override) and (reviewItemId, override) signatures
      const itemId = override !== undefined ? reviewItemIdOrOverride : clientIdOrReviewItemId;
      const over = override !== undefined ? override : reviewItemIdOrOverride;
      const result = await asyncRepo.saveReviewOverride(clientId, itemId, over);
      state.reviewOverrides = result;
      return result[itemId];
    },
    
    async reset() {
      await asyncRepo.reset(clientId);
      // Reload state
      const freshState = await asyncRepo.exportState(clientId);
      state = freshState;
      return freshState;
    },
    
    exportState() {
      return state;
    },
  };
}
