/**
 * Importing this module reincarnates the "vat" (global env) to have strict durability rules.
 */
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import type { Zone } from '@agoric/zone';
import { makeDurableZone } from '@agoric/zone/durable.js';

// all orchestration tests have strict durability rules
const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });

/**
 * Reincarnate without relaxDurabilityRules and provide a durable zone in the incarnation.
 * @param key
 */
export const provideDurableZone = (key: string): Zone => {
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.subZone(key);
};

let zoneCounter = 0;
export const provideFreshRootZone = (): Zone => {
  zoneCounter += 1;
  return provideDurableZone(`root${zoneCounter}`);
};
