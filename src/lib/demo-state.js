import { createDemoStore } from './demo-store.js';

export function buildDemoState() {
  return createDemoStore().snapshot();
}
