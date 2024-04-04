import type { RouterProtocol } from '@agoric/network/src/router';

export type ConnectionId = `connection-${number}`;

export type AttenuatedNetwork = Pick<RouterProtocol, 'bind'>;

export type * from './orchestration.js';
export type * from './vat-orchestration.js';
