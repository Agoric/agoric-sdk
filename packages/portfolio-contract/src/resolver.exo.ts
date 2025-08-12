/**
 * @file CCTP Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending CCTP (Cross-Chain Transfer Protocol)
 * transactions and providing promises/vows that resolve when transactions are confirmed.
 * The portfolio contract acts as a client, requesting notifications for specific transaction events.
 */

import { makeTracer, mustMatch } from '@agoric/internal';
import type { CaipChainId } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import { type VowTools, type VowKit, type Vow, VowShape } from '@agoric/vow';
import { M } from '@endo/patterns';
import type { Invitation } from '@agoric/zoe';

const trace = makeTracer('Resolver');

export type CCTPTransactionEntry = {
  chainId: CaipChainId;
  remoteAddress: `0x${string}`;
  amountValue: bigint;
  vowKit: VowKit<void>;
};

export type ResolverKit = {
  resolver: {
    /**
     * Register a pending CCTP transaction and return a vow that resolves when confirmed.
     *
     * @param chainId - CAIP chain ID (e.g., 'eip155:42161')
     * @param remoteAddress - The remote address receiving the funds
     * @param amount - The amount being transferred
     * @returns A vow that resolves when the transaction is confirmed
     */
    registerCCTPTransaction: (
      chainId: CaipChainId,
      remoteAddress: `0x${string}`,
      amount: bigint,
    ) => Vow<void>;

    /**
     * Confirm a CCTP transaction by providing transaction details.
     *
     * @param chainId - CAIP chain ID
     * @param remoteAddress - The remote address
     * @param amountValue - The amount value as bigint
     * @param status - Transaction status ('confirmed' | 'failed' | 'pending')
     * @returns Success status and message
     */
    confirmCCTPTransaction: (
      chainId: CaipChainId,
      remoteAddress: `0x${string}`,
      amountValue: bigint,
      status: 'confirmed' | 'failed' | 'pending',
    ) => {
      success: boolean;
      message: string;
      key: string;
    };

    /**
     * Get all pending transaction keys for debugging/monitoring.
     */
    getPendingTransactions: () => string[];
  };
};

export type CCTPConfirmationResult = {
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

export type ResolverInvitationMakers = {
  /**
   * Make an invitation to confirm a CCTP transaction.
   *
   * This invitation allows anyone with the proper transaction details
   * to confirm the completion of a CCTP transaction.
   */
  makeConfirmCCTPTransactionInvitation: () => Promise<Invitation>;
};

/**
 * Prepare the CCTP Transaction Resolver.
 *
 * @param zone - Durable storage zone
 * @param vowTools - Vow tools for creating promises
 * @returns A function to create resolver instances
 */
export const prepareCCTPResolver = (zone: Zone, vowTools: VowTools) => {
  const resolverZone = zone.subZone('CCTPResolver');
  const cctpTransactionRegistry = resolverZone.mapStore<
    string,
    CCTPTransactionEntry
  >('cctpTransactionRegistry');

  const ResolverI = M.interface('CCTPResolver', {
    registerCCTPTransaction: M.call(M.string(), M.string(), M.bigint()).returns(
      VowShape,
    ),
    confirmCCTPTransaction: M.call(
      M.string(),
      M.string(),
      M.bigint(),
      M.string(),
    ).returns(M.record()),
    getPendingTransactions: M.call().returns(M.arrayOf(M.string())),
  });

  return resolverZone.exoClass('CCTPResolver', ResolverI, () => ({}), {
    registerCCTPTransaction(
      chainId: CaipChainId,
      remoteAddress: `0x${string}`,
      amount: bigint,
    ) {
      const key = `${chainId}:${remoteAddress}:${amount}`;

      if (cctpTransactionRegistry.has(key)) {
        trace(`CCTP transaction already registered: ${key}`);
        return cctpTransactionRegistry.get(key).vowKit.vow;
      }

      const vowKit = vowTools.makeVowKit<void>();

      cctpTransactionRegistry.init(
        key,
        harden({
          chainId,
          remoteAddress,
          amountValue: amount,
          vowKit,
        }),
      );

      trace(`Registered pending CCTP transaction: ${key}`);
      return vowKit.vow;
    },

    confirmCCTPTransaction(
      chainId: CaipChainId,
      remoteAddress: `0x${string}`,
      amountValue: bigint,
      status: 'confirmed' | 'failed' | 'pending',
    ) {
      const key = `${chainId}:${remoteAddress}:${amountValue}`;

      if (!cctpTransactionRegistry.has(key)) {
        trace('No pending CCTP transaction found for key:', key);
        trace('Available keys in registry:', [
          ...cctpTransactionRegistry.keys(),
        ]);
        return harden({
          success: false,
          message:
            'No pending CCTP transaction found matching provided details',
          key,
        });
      }

      const registryEntry = cctpTransactionRegistry.get(key);

      switch (status) {
        case 'confirmed':
          trace(`CCTP transaction confirmed - resolving pending operation`);
          registryEntry.vowKit.resolver.resolve();
          cctpTransactionRegistry.delete(key);
          return harden({
            success: true,
            message: 'CCTP transaction confirmed and processed',
            key,
          });

        case 'failed':
          trace(`CCTP transaction failed - rejecting pending operation`);
          registryEntry.vowKit.resolver.reject('CCTP transaction failed');
          cctpTransactionRegistry.delete(key);
          return harden({
            success: false,
            message: 'CCTP transaction failed - recovery initiated',
            key,
          });
      }
    },

    getPendingTransactions() {
      return [...cctpTransactionRegistry.keys()];
    },
  });
};

harden(prepareCCTPResolver);

/**
 * Prepare CCTP Resolver Invitation Makers.
 *
 * @param zone - Durable storage zone
 * @param zcf - Zoe Contract Facet for creating invitations
 * @param resolver - The resolver instance to use
 * @param proposalShapes - Proposal validation shapes
 * @param offerArgsShapes - Offer arguments validation shapes
 * @returns A function to create resolver invitation makers
 */
export const prepareResolverInvitationMakers = (
  zone: Zone,
  zcf: any, // ZCF type
  resolver: any, // Resolver instance
  proposalShapes: any,
  offerArgsShapes: any,
) => {
  const resolverInvitationMakersZone = zone.subZone('ResolverInvitationMakers');

  const ResolverInvitationMakersI = M.interface('ResolverInvitationMakers', {
    makeConfirmCCTPTransactionInvitation: M.call().returns(M.promise()),
  });

  return resolverInvitationMakersZone.exoClass(
    'ResolverInvitationMakers',
    ResolverInvitationMakersI,
    () => ({}),
    {
      makeConfirmCCTPTransactionInvitation() {
        trace('makeConfirmCCTPTransactionInvitation');

        const confirmHandler = async (seat: any, offerArgs: any) => {
          mustMatch(offerArgs, offerArgsShapes.confirmCCTPTransaction);
          const { txDetails, remoteAxelarChain } = offerArgs as any;

          trace('CCTP transaction confirmation:', {
            amount: txDetails.amount,
            remoteAddress: txDetails.remoteAddress,
            status: txDetails.status,
            remoteAxelarChain,
          });

          seat.exit();

          const result = resolver.confirmCCTPTransaction(
            remoteAxelarChain,
            txDetails.remoteAddress,
            txDetails.amount,
            txDetails.status,
          );

          return harden({
            ...result,
            txDetails,
            remoteAxelarChain,
          });
        };

        return zcf.makeInvitation(
          confirmHandler,
          'confirmCCTPTransaction',
          undefined,
          proposalShapes.confirmCCTPTransaction,
        );
      },
    },
  );
};

harden(prepareResolverInvitationMakers);
