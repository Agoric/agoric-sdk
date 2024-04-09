import type { RouterProtocol } from '@agoric/network/src/router';

export type AttenuatedNetwork = Pick<RouterProtocol, 'bind'>;

export type * from './orchestration.js';
export type * from './vat-orchestration.js';
export type * from './utils/tx.js';
