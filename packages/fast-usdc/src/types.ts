import type {
  ChainAddress,
  CosmosChainInfo,
  Denom,
  DenomDetail,
} from '@agoric/orchestration';
import type { IBCChannelID } from '@agoric/vats';
import type { Amount } from '@agoric/ertp';
import type { CopyRecord, Passable } from '@endo/pass-style';
import type { PendingTxStatus, TxStatus } from './constants.js';
import type { FastUsdcTerms } from './fast-usdc.contract.js';
import type { RepayAmountKWR } from './exos/liquidity-pool.js';

export type EvmHash = `0x${string}`;
export type EvmAddress = `0x${string & { length: 40 }}`;
export type NobleAddress = `noble1${string}`;
export type EvmChainID = number;
export type EvmChainName = string;

export interface RiskAssessment {
  risksIdentified?: string[];
}

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
    sender: EvmAddress;
  };
  txHash: EvmHash;
}

export interface EvidenceWithRisk {
  evidence: CctpTxEvidence;
  risk: RiskAssessment;
}

/**
 * 'evidence' only available when it's first observed and not in subsequent
 * updates.
 */
export interface TransactionRecord extends CopyRecord {
  evidence?: CctpTxEvidence;
  split?: RepayAmountKWR;
  risksIdentified?: string[];
  status: TxStatus;
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
  /** `msg.sender` of DepositAndBurn to TokenMessenger must be an attenuated wrapper contract that does not contain `replaceDepositForBurn` */
  attenuatedCttpBridgeAddress: EvmHash;
  /** @see {@link https://developers.circle.com/stablecoins/evm-smart-contracts} */
  cctpTokenMessengerAddress: EvmHash;
  /** e.g., `1` for ETH mainnet 42161 for Arbitrum One. @see {@link https://chainlist.org/} */
  chainId: EvmChainID;
  /** the number of block confirmations to observe before reporting */
  confirmations: number;
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

/** decoded address hook parameters */
export type AddressHook = {
  baseAddress: string;
  query: {
    /** end user destination address */
    EUD: string;
  };
};

export type * from './constants.js';
export type { LiquidityPoolKit } from './exos/liquidity-pool.js';
