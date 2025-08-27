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

export type CCTPTransactionKey = `${AccountId}:${bigint}`;

export type CCTPTransactionDetails = {
  amount: bigint;
  remoteAddress: `0x${string}`;
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

/**
 * Collection of all resolver offer argument shapes
 */
export const ResolverOfferArgsShapes = {
  SettleCCTPTransaction: CCTPSettlementOfferArgsShape,
} as const;

harden(ResolverOfferArgsShapes);

export const PENDING_TXS_NODE_KEY = 'pendingTxs';

export type PublishedTx = {
  type: TxType;
  amount: bigint;
  destinationAddress: `${string}:${string}:${string}`;
  status: TxStatus;
};

export const PublishedTxShape: TypedPattern<PublishedTx> = M.splitRecord(
  {
    type: M.or(...Object.keys(TxType)),
    amount: M.nat(),
    destinationAddress: M.string(), // Format: `${chainId}:${chainId}:${remotAddess}`
    status: M.or(...Object.keys(TxStatus)),
  },
  {},
  {},
);

export type * from './constants.js';
