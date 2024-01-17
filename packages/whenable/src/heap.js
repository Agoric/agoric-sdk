// @ts-check
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { wrappedPrepareWhenableModule } from './module.js';

// Heap-based whenable support is exported to assist in migration.
export const { when, makeWhenableKit } = wrappedPrepareWhenableModule(
  makeHeapZone(),
);
