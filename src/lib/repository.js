import fs from 'node:fs';
import path from 'node:path';
import { buildKnightDemoData } from './seed-data.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildInitialState(seedData = buildKnightDemoData()) {
  return clone({
    client: seedData.client,
    entityTypes: seedData.entityTypes,
    properties: seedData.properties,
    entities: seedData.entities,
    certificates: seedData.certificates,
    sampleMessages: seedData.sampleMessages,
    reviewOverrides: {},
  });
}

function createRepositoryFromState(state, persist = null) {
  function update(mutator) {
    mutator(state);
    if (persist) persist(state);
  }

  return {
    getClient() {
      return clone(state.client);
    },
    getEntityTypes() {
      return clone(state.entityTypes);
    },
    getProperties() {
      return clone(state.properties);
    },
    getEntities() {
      return clone(state.entities);
    },
    getCertificates() {
      return clone(state.certificates);
    },
    replaceCertificates(clientIdOrCertificates, certificates) {
      // Support both (clientId, certificates) and (certificates) signatures
      const certs = certificates !== undefined ? certificates : clientIdOrCertificates;
      update((draft) => {
        draft.certificates = clone(certs);
      });
    },
    replaceEntities(clientIdOrEntities, entities) {
      // Support both (clientId, entities) and (entities) signatures
      const ents = entities !== undefined ? entities : clientIdOrEntities;
      update((draft) => {
        draft.entities = clone(ents);
      });
    },
    getMessages() {
      return clone(state.sampleMessages);
    },
    replaceMessages(clientIdOrMessages, messages) {
      // Support both (clientId, messages) and (messages) signatures
      const msgs = messages !== undefined ? messages : clientIdOrMessages;
      update((draft) => {
        draft.sampleMessages = clone(msgs);
      });
    },
    getReviewOverrides() {
      return clone(state.reviewOverrides);
    },
    saveReviewOverride(clientIdOrReviewItemId, reviewItemIdOrOverride, override) {
      // Support both (clientId, reviewItemId, override) and (reviewItemId, override) signatures
      const itemId = override !== undefined ? reviewItemIdOrOverride : clientIdOrReviewItemId;
      const over = override !== undefined ? override : reviewItemIdOrOverride;
      update((draft) => {
        draft.reviewOverrides[itemId] = clone(over);
      });
      return clone(state.reviewOverrides[itemId]);
    },
    reset(seedData = buildKnightDemoData()) {
      update((draft) => {
        const next = buildInitialState(seedData);
        Object.keys(draft).forEach((key) => delete draft[key]);
        Object.assign(draft, next);
      });
      return this.exportState();
    },
    exportState() {
      return clone(state);
    },
  };
}

export function createInMemoryRepository(seedData = buildKnightDemoData()) {
  return createRepositoryFromState(buildInitialState(seedData));
}

export function createJsonFileRepository({ filePath, seedData = buildKnightDemoData() }) {
  if (!filePath) {
    throw new Error('filePath is required');
  }

  const absolutePath = path.resolve(filePath);
  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, { recursive: true });

  const persist = (state) => {
    fs.writeFileSync(absolutePath, JSON.stringify(state, null, 2));
  };

  let state;
  if (fs.existsSync(absolutePath)) {
    state = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } else {
    state = buildInitialState(seedData);
    persist(state);
  }

  return createRepositoryFromState(state, persist);
}
