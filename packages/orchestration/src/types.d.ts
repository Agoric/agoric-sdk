import type { RouterProtocol } from '@agoric/network/src/router';

export type ConnectionId = `connection-${number}`;
export type ChannelId = `channel-${number}`;
export type DestinationPort = 'icahost' | 'icqhost';
export type SourcePortPrefix = 'icacontroller' | 'icqcontroller';
export type SourcePort = `${SourcePortPrefix}-${number}`;
// TODO improve. sometimes expressed uppercase, others lowercase
export type ChannelOrdering = 'ordered' | 'unordered' | 'ORDERED' | 'UNORDERED';

export type AttenuatedNetwork = Pick<RouterProtocol, 'bind'>;

export type * from './orchestration.js';
export type * from './vat-orchestration.js';
export type * from './utils/tx.js';
