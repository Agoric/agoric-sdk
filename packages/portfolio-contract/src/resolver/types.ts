/**
 * @file Transaction Resolver types - independent of transaction-specific logic
 *
 * This file contains types for the generic transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { TypedPattern } from '@agoric/internal';
import type { PublishedTx } from '@agoric/portfolio-api';
import { TxStatus, TxType } from '@agoric/portfolio-api/src/resolver.js';
import { M } from '@endo/patterns';

// tx for transactions
export type TxId = `tx${number}`;

export type TransactionSettlementOfferArgs = {
  status: Exclude<TxStatus, 'pending'>;
  txId: TxId;
  rejectionReason?: string;
};

export const TransactionSettlementOfferArgsShape: TypedPattern<TransactionSettlementOfferArgs> =
  M.splitRecord(
    {
      status: M.or(TxStatus.SUCCESS, TxStatus.FAILED),
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

/**
 * A PendingTx is a PublishedTx (published by ymax contract) with an additional
 * txId property used by the resolver to track and manage pending transactions.
 */
export type PendingTx = { txId: TxId } & PublishedTx;

export const PublishedTxShape: TypedPattern<PublishedTx> = M.or(
  // CCTP_TO_EVM require amount
  M.splitRecord(
    {
      type: M.or(TxType.CCTP_TO_EVM),
      destinationAddress: M.string(), // Format: `${chainId}:${chainId}:${remotAddess}`
      status: TxStatus.PENDING,
      amount: M.nat(),
    },
    {},
    {},
  ),
  // GMP has optional amount
  M.splitRecord(
    {
      type: M.or(TxType.GMP),
      destinationAddress: M.string(),
      status: TxStatus.PENDING,
    },
    {
      amount: M.nat(),
    },
    {},
  ),
  M.splitRecord(
    {
      type: M.or(TxType.TRAFFIC),
      status: M.or(TxStatus.PENDING),
    },
    {
      op: M.string(),
      srcChainId: M.string(),
      src: M.arrayOf(M.any()),
      dstChainId: M.string(),
      dst: M.arrayOf(M.any()),
      seq: M.or(
        M.nat(),
        M.number(),
        M.string(),
        M.splitRecord({ status: M.or('pending', 'unknown') }, {}),
      ),
      amount: M.nat(),
    },
    {},
  ),
);

// Backwards compatibility
export * from '@agoric/portfolio-api/src/resolver.js';
export type { PublishedTx };
