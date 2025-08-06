/**
 * @file CCTP Resolver types - independent of portfolio-specific logic
 *
 * This file contains types for the CCTP transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { CaipChainId, AccountId } from '@agoric/orchestration';

import { M } from '@endo/patterns';
import type { TypedPattern } from '@agoric/internal';

export type CCTPTransactionKey = `${AccountId}:${bigint}`;

export type CCTPTransactionDetails = {
  amount: bigint;
  remoteAddress: `0x${string}`;
  status: 'confirmed' | 'failed';
};

export const CCTPTransactionDetailsShape: TypedPattern<CCTPTransactionDetails> =
  M.splitRecord(
    {
      amount: M.nat(),
      remoteAddress: M.string(),
      status: M.or('confirmed', 'failed'),
    },
    {},
    {},
  );

export type CCTPSettlementArgs = {
  chainId: CaipChainId;
  remoteAddress: `0x${string}`;
  amountValue: bigint;
  status: 'confirmed' | 'failed';
  rejectionReason?: string;
};

export const CCTPSettlementArgsShape: TypedPattern<CCTPSettlementArgs> =
  M.splitRecord(
    {
      chainId: M.string(), // CaipChainId format
      remoteAddress: M.string(),
      amountValue: M.nat(),
      status: M.or('confirmed', 'failed'),
    },
    {
      rejectionReason: M.string(),
    },
    {},
  );

export type CCTPSettlementOfferArgs = {
  txDetails: CCTPTransactionDetails;
  remoteAxelarChain: CaipChainId;
};

export const CCTPSettlementOfferArgsShape: TypedPattern<CCTPSettlementOfferArgs> =
  M.splitRecord(
    {
      txDetails: CCTPTransactionDetailsShape,
      remoteAxelarChain: M.string(), // CaipChainId format
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
