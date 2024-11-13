import type { ChainAddress } from '@agoric/orchestration';
import type { IBCChannelID } from '@agoric/vats';
import type { Amount } from '@agoric/ertp';
import type { PendingTxStatus } from './constants.js';

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

export type LogFn = (...args: unknown[]) => void;

export interface PendingTx extends CctpTxEvidence {
  status: PendingTxStatus;
}

/** internal key for `StatusManager` exo */
export type PendingTxKey = `pendingTx:${string}`;

/** internal key for `StatusManager` exo */
export type SeenTxKey = `seenTx:${string}`;

export interface PoolStats {
  totalFees: Amount<'nat'>;
  totalBorrows: Amount<'nat'>;
  totalReturns: Amount<'nat'>;
}

export interface PoolMetrics extends PoolStats {
  availableBalance: Amount<'nat'>;
  shareWorth: Ratio;
}

export type * from './constants.js';
