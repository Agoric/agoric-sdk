// @ts-check
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareWhenableModule } from './module.js';

// Heap-based whenable support is exported to assist in migration.
export const { when, makeWhenableKit } = prepareWhenableModule(makeHeapZone());
