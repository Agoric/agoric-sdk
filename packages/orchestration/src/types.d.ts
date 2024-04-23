import type { PortAllocator } from '@agoric/network/src/network';

export type AttenuatedPortAllocator = Pick<
  PortAllocator,
  'allocateICAControllerPort'
>;

export type * from './orchestration.js';
export type * from './vat-orchestration.js';
export type * from './utils/tx.js';
