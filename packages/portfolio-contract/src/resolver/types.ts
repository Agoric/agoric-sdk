/**
 * @file CCTP Resolver types - independent of portfolio-specific logic
 *
 * This file contains types for the CCTP transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { TypedPattern } from '@agoric/internal';
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { TxStatus, TxType } from './constants.js';
import type { AxelarId } from '../portfolio.contract.js';

export type CCTPTransactionKey = `${AccountId}:${bigint}`;

export type CCTPTransactionDetails = {
  amount: bigint;
  remoteAddress: `0x${string}`;
  status: TxStatus;
};

export type GMPTransactionDetails = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: string;
  status: TxStatus;
};

export const CCTPTransactionDetailsShape: TypedPattern<CCTPTransactionDetails> =
  M.splitRecord(
    {
      amount: M.nat(),
      remoteAddress: M.string(),
      status: M.or('pending', 'success', 'failed'),
    },
    {},
    {},
  );

export const GMPTransactionDetailsShape: TypedPattern<GMPTransactionDetails> =
  M.splitRecord(
    {
      lcaAddr: M.string(),
      destinationChain: M.string(),
      contractAddress: M.string(),
      status: M.or('pending', 'success', 'failed'),
    },
    {},
    {},
  );

export type CCTPSettlementArgs = {
  chainId: CaipChainId;
  remoteAddress: `0x${string}`;
  amountValue: bigint;
  status: TxStatus;
  rejectionReason?: string;
  txId: `tx${number}`;
};

export const CCTPSettlementArgsShape: TypedPattern<CCTPSettlementArgs> =
  M.splitRecord(
    {
      chainId: M.string(), // CaipChainId format
      remoteAddress: M.string(),
      amountValue: M.nat(),
      status: M.or('pending', 'success', 'failed'),
      txId: M.string(), // `tx${number}` format
    },
    {
      rejectionReason: M.string(),
    },
    {},
  );

export type GMPSettlementArgs = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: string;
  status: TxStatus;
  rejectionReason?: string;
  txId: `tx${number}`;
};

export const GMPSettlementArgsShape: TypedPattern<GMPSettlementArgs> =
  M.splitRecord(
    {
      lcaAddr: M.string(),
      destinationChain: M.string(),
      contractAddress: M.string(),
      status: M.or('pending', 'success', 'failed'),
      txId: M.string(),
    },
    {
      rejectionReason: M.string(),
    },
    {},
  );

export type CCTPSettlementOfferArgs = {
  txDetails: CCTPTransactionDetails;
  remoteAxelarChain: CaipChainId;
  txId: `tx${number}`;
};

export const CCTPSettlementOfferArgsShape: TypedPattern<CCTPSettlementOfferArgs> =
  M.splitRecord(
    {
      txDetails: CCTPTransactionDetailsShape,
      remoteAxelarChain: M.string(), // CaipChainId format
      txId: M.string(), // `tx${number}` format
    },
    {},
    {},
  );

export type GMPSettlementOfferArgs = {
  txDetails: GMPTransactionDetails;
  txId: `tx${number}`;
};

export const GMPSettlementOfferArgsShape: TypedPattern<GMPSettlementOfferArgs> =
  M.splitRecord(
    {
      txDetails: GMPTransactionDetailsShape,
      txId: M.string(),
    },
    {},
    {},
  );

/**
 * Collection of all resolver offer argument shapes
 */
export const ResolverOfferArgsShapes = {
  SettleCCTPTransaction: CCTPSettlementOfferArgsShape,
  SettleGMPTransaction: GMPSettlementOfferArgsShape,
} as const;

harden(ResolverOfferArgsShapes);

export const PENDING_TXS_NODE_KEY = 'pendingTxs';

export type PublishedTx = {
  type: TxType;
  status: TxStatus;
} & (
  | {
      type: typeof TxType.CCTP;
      amount: bigint;
      destinationAddress: `${string}:${string}:${string}`;
    }
  | {
      type: typeof TxType.GMP;
      lcaAddr: string;
      destinationChain: AxelarId;
      contractAddress: string;
    }
);

export const PublishedTxShape: TypedPattern<PublishedTx> = M.or(
  M.splitRecord(
    {
      type: TxType.CCTP,
      amount: M.nat(),
      destinationAddress: M.string(),
      status: M.or(...Object.keys(TxStatus)),
    },
    {},
    {},
  ),
  M.splitRecord(
    {
      type: TxType.GMP,
      subscriptionId: M.string(),
      lcaAddr: M.string(),
      destinationChain: M.string(),
      contractAddress: M.string(),
      status: M.or(...Object.keys(TxStatus)),
    },
    {},
    {},
  ),
);

export type * from './constants.js';
