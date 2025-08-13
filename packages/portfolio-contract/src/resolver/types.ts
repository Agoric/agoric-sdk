/**
 * @file CCTP Resolver types - independent of portfolio-specific logic
 *
 * This file contains types for the CCTP transaction resolver, which is an
 * orchestration component that can be used independently of the portfolio contract.
 */

import type { CaipChainId, AccountId } from '@agoric/orchestration';
import type { VowKit, Vow } from '@agoric/vow';
import { M } from '@endo/patterns';
import type { TypedPattern } from '@agoric/internal';
import type { Invitation } from '@agoric/zoe';

/**
 * Branded string type for CCTP transaction keys
 * Pattern: ${AccountId}:${bigint} which expands to ${chainId}:${remoteAddress}:${amount}
 */
export type CCTPTransactionKey = `${AccountId}:${bigint}`;

/**
 * Details of a CCTP transaction for settlement
 */
export type CCTPTransactionDetails = {
  amount: bigint;
  /** the remoteAddress on EVM chain */
  remoteAddress: `0x${string}`;
  status: 'pending' | 'confirmed' | 'failed';
};

export const CCTPTransactionDetailsShape: TypedPattern<CCTPTransactionDetails> =
  M.splitRecord(
    {
      amount: M.bigint(),
      remoteAddress: M.string(),
      status: M.or('pending', 'confirmed', 'failed'),
    },
    {},
    {},
  );

/**
 * Internal registry entry for pending CCTP transactions
 */
export type CCTPTransactionEntry = {
  destinationAddress: AccountId;
  amountValue: bigint;
  vowKit: VowKit<void>;
};

/**
 * Union type for CCTP result status (compliance with security rules)
 */
export type CCTPResult =
  | { status: 'fulfilled' }
  | { status: 'rejected'; message: string };

/**
 * Result type for CCTP settlement operations (for invitation handlers)
 */
export type CCTPSettlementResult = {
  success: boolean;
  message: string;
  key: string;
  txDetails: {
    amount: bigint;
    remoteAddress: `0x${string}`;
    status: 'confirmed' | 'failed' | 'pending';
  };
  remoteAxelarChain: CaipChainId;
};

/**
 * The resolver kit with separate facets for different use cases.
 * Automatically inferred from the prepareCCTPResolver return type.
 */
export type ResolverKit = ReturnType<
  ReturnType<typeof import('./resolver.exo.js').prepareCCTPResolver>
>;

/**
 * Service facet of the CCTP resolver
 */
export type CCTPResolverServiceFacet = ResolverKit['service'];

/**
 * Offer arguments for CCTP transaction settlement
 */
export type CCTPSettlementOfferArgs = {
  txDetails: CCTPTransactionDetails;
  remoteAxelarChain: CaipChainId;
};

/**
 * Invitation makers for resolver operations
 */
export type ResolverInvitationMakers = {
  /**
   * Make an invitation to settle a CCTP transaction.
   *
   * This invitation allows anyone who holds a capability of this type
   * with the proper transaction details to settle the completion of
   * a CCTP transaction.
   */
  makeSettleCCTPTransactionInvitation: () => Promise<Invitation>;
};
