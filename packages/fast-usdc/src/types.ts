import type { ChainAddress } from '@agoric/orchestration';
import type { IBCChannelID } from '@agoric/vats';
import type { TxStatus } from './constants.js';

export type EvmHash = `0x${string}`;
export type NobleAddress = `noble1${string}`;

export interface CctpTxEvidence {
  /** from Noble RPC */
  aux: {
    forwardingChannel: IBCChannelID;
    recipientAddress: ChainAddress['value'];
  };
  blockHash: EvmHash;
  blockNumber: bigint;
  blockTimestamp: bigint;
  chainId: number;
  /** data covered by signature (aka txHash) */
  tx: {
    amount: bigint;
    forwardingAddress: NobleAddress;
  };
  txHash: EvmHash;
}

export interface StatusManagerEntry extends CctpTxEvidence {
  status: TxStatus;
}

export type * from './constants.js';
