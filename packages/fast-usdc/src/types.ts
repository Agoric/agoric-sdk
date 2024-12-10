import type {
  ChainAddress,
  CosmosChainInfo,
  Denom,
  DenomDetail,
} from '@agoric/orchestration';
import type { IBCChannelID } from '@agoric/vats';
import type { Amount } from '@agoric/ertp';
import type { CopyRecord, Passable } from '@endo/pass-style';
import type { PendingTxStatus } from './constants.js';
import type { FastUsdcTerms } from './fast-usdc.contract.js';

export type EvmHash = `0x${string}`;
export type NobleAddress = `noble1${string}`;
export type EvmChainID = number;
export type EvmChainName = string;

export interface CctpTxEvidence {
  /** from Noble RPC */
  aux: {
    forwardingChannel: IBCChannelID;
    recipientAddress: ChainAddress['value'];
  };
  blockHash: EvmHash;
  blockNumber: bigint;
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

export type FeeConfig = {
  flat: Amount<'nat'>;
  variableRate: Ratio;
  maxVariable: Amount<'nat'>;
  contractRate: Ratio;
};

export interface PoolStats {
  totalBorrows: Amount<'nat'>;
  totalContractFees: Amount<'nat'>;
  totalPoolFees: Amount<'nat'>;
  totalRepays: Amount<'nat'>;
}

export interface PoolMetrics extends PoolStats {
  encumberedBalance: Amount<'nat'>;
  shareWorth: Ratio;
}

export interface ChainPolicy {
  nobleContractAddress: EvmHash;
  cctpTokenMessengerAddress: EvmHash;
  confirmations: number;
  chainId: EvmChainID;
  chainType?: number;
}

export interface FeedPolicy {
  nobleDomainId: number;
  nobleAgoricChannelId: string;
  chainPolicies: Record<EvmChainName, ChainPolicy>;
  eventFilter?: string;
}

export type FastUSDCConfig = {
  terms: FastUsdcTerms;
  oracles: Record<string, string>;
  feeConfig: FeeConfig;
  feedPolicy: FeedPolicy & Passable;
  noNoble: boolean; // support a3p-integration, which has no noble chain
  chainInfo: Record<string, CosmosChainInfo & Passable>;
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
} & CopyRecord;

export type * from './constants.js';
export type { LiquidityPoolKit } from './exos/liquidity-pool.js';
