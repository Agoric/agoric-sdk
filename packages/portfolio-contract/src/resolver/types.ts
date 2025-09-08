/**
 * @file Transaction Resolver types - independent of transaction-specific logic
 *
 * This file contains types for the generic transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { TypedPattern } from '@agoric/internal';
import type { AccountId } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { TxStatus, TxType } from './constants.js';

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

export type PublishedTx = {
  type: TxType;
  amount?: bigint;
  destinationAddress: AccountId;
  status: TxStatus;
};

export const PublishedTxShape: TypedPattern<PublishedTx> = M.or(
  // CCTP_TO_EVM and CCTP_TO_NOBLE require amount
  M.splitRecord(
    {
      type: M.or(TxType.CCTP_TO_EVM, TxType.CCTP_TO_NOBLE),
      destinationAddress: M.string(), // Format: `${chainId}:${chainId}:${remotAddess}`
      status: M.or(TxStatus.PENDING),
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
      status: M.or(TxStatus.PENDING),
    },
    {
      amount: M.nat(),
    },
    {},
  ),
);

export type * from './constants.js';
