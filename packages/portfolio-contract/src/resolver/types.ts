/**
 * @file Transaction Resolver types - independent of transaction-specific logic
 *
 * This file contains types for the generic transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import { TxStatus } from './constants.js';

export type TransactionSettlementArgs = {
  transactionKey: string;
  status: TxStatus;
  rejectionReason?: string;
  txId: `tx${number}`;
};

export const TransactionSettlementArgsShape: TypedPattern<TransactionSettlementArgs> =
  M.splitRecord(
    {
      transactionKey: M.string(),
      status: M.or('confirmed', 'failed'),
      txId: M.string(),
    },
    {
      rejectionReason: M.string(),
    },
    {},
  );

export type TransactionSettlementOfferArgs = {
  transactionKey: string;
  status: TxStatus;
  rejectionReason?: string;
  txId: `tx${number}`;
};

export const TransactionSettlementOfferArgsShape: TypedPattern<TransactionSettlementOfferArgs> =
  M.splitRecord(
    {
      transactionKey: M.string(),
      status: M.or('confirmed', 'failed'),
      txId: M.string(),
    },
    {
      rejectionReason: M.string(),
    },
    {},
  );

/**
 * Collection of all resolver offer argument shapes
 */
export const ResolverOfferArgsShapes = {
  SettleTransaction: TransactionSettlementOfferArgsShape,
} as const;

harden(ResolverOfferArgsShapes);


export const PENDING_TXS_NODE_KEY = 'pendingTxs';

export type PublishedTx = {
  transactionKey: string;
  status: TxStatus;
};

export const PublishedTxShape: TypedPattern<PublishedTx> = M.splitRecord(
  {
    transactionKey: M.string(),
    status: M.or('confirmed', 'failed'),
  },
  {},
  {},
);

export type * from './constants.js';
