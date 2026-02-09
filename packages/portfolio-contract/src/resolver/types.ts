/**
 * @file Transaction Resolver types - independent of transaction-specific logic
 *
 * This file contains types for the generic transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { TypedPattern } from '@agoric/internal';
import type { AccountId, HexAddress } from '@agoric/orchestration';
import type { PublishedTx, TxId } from '@agoric/portfolio-api';
import { TxStatus, TxType } from '@agoric/portfolio-api/src/resolver.js';
import type { NetworkBinding, NetworkEndpoint } from '@agoric/vats';
import { M } from '@endo/patterns';

export type { TxId };

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

const TxStatusShape: TypedPattern<TxStatus> = M.or(...Object.values(TxStatus));

/** CAIP-10 `${namespace}:${chainId}:${address}` */
const AccountIdShape: TypedPattern<AccountId> = M.string();

/** Smart contract `0x` hex address. */
const HexAddressShape: TypedPattern<HexAddress> = M.string();

const NetworkEndpointShape = <Proto extends keyof NetworkBinding>(
  _proto: Proto = 'ibc' as Proto,
): TypedPattern<NetworkEndpoint<Proto>> =>
  M.arrayOf(M.or(M.string(), [M.string(), M.any()]));

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

const optionalPublishedTxProps = harden({
  // eslint-disable-next-line @agoric/group-jsdoc-imports
  /** @deprecated Use {@link import('@agoric/portfolio-api').FlowStep['phases']} arrays instead. */
  nextTxId: M.string(),
  rejectionReason: M.string(),
});

const PublishedTxShapes: Record<string, TypedPattern<PublishedTx>> = harden({
  // CCTP_TO_EVM requires amount
  CCTP_TO_EVM: M.splitRecord(
    {
      type: TxType.CCTP_TO_EVM,
      destinationAddress: AccountIdShape,
      status: TxStatusShape,
      amount: M.nat(),
    },
    {
      sourceAddress: AccountIdShape,
      ...optionalPublishedTxProps,
    },
    {},
  ),
  // GMP has optional amount
  GMP: M.splitRecord(
    {
      type: M.or(TxType.GMP),
      destinationAddress: AccountIdShape,
      status: TxStatusShape,
    },
    {
      ...optionalPublishedTxProps,
      sourceAddress: AccountIdShape, // not all GMP txs have this
      amount: M.nat(),
    },
    {},
  ),
  // MAKE_ACCOUNT requires expectedAddr (hex)
  MAKE_ACCOUNT: M.splitRecord(
    {
      type: M.or(TxType.MAKE_ACCOUNT),
      // destinationAddress is a CAIP-10 account_id identifying either
      // depositFactory or factory.
      destinationAddress: AccountIdShape,
      expectedAddr: HexAddressShape,
      status: TxStatusShape,
    },
    // Older records don't have these fields
    {
      ...optionalPublishedTxProps,
      sourceAddress: AccountIdShape,
      // If not available, the destinationAddress CAIP can be used
      factoryAddr: HexAddressShape,
    },
    {},
  ),
  TRAFFIC: M.splitRecord(
    {
      type: M.or(TxType.IBC_FROM_AGORIC, TxType.IBC_FROM_REMOTE),
      status: TxStatusShape,
    },
    {
      ...optionalPublishedTxProps,
      incomplete: true,
      op: M.string(),
      src: NetworkEndpointShape(),
      dest: NetworkEndpointShape(),
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
});

export const PublishedTxShape: TypedPattern<PublishedTx> = M.or(
  ...Object.values(PublishedTxShapes),
);

// Backwards compatibility
export * from '@agoric/portfolio-api/src/resolver.js';
export type { PublishedTx };
