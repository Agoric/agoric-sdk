// @ts-check
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareWhen } from './when.js';
import { prepareWhenableKit } from './whenable.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareWhenableModule = zone => {
  const makeWhenableKit = prepareWhenableKit(zone);
  const when = prepareWhen(zone);
  return harden({ when, makeWhenableKit });
};
harden(prepareWhenableModule);

// Heap-based whenable support is exported to assist in migration.
export const { when, makeWhenableKit } = prepareWhenableModule(makeHeapZone());
