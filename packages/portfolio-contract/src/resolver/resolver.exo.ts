/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer, mustMatch } from '@agoric/internal';
import type { CaipChainId, AccountId } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import { type VowTools, VowShape } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import { M } from '@endo/patterns';
import type {
  CCTPTransactionEntry,
  CCTPTransactionKey,
  CCTPResolverServiceFacet,
  CCTPSettlementOfferArgs,
} from './types.js';
import { CCTPTransactionDetailsShape } from './types.js';
import { E } from '@endo/far';
import type { ERef } from '@endo/far';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';

const trace = makeTracer('Resolver');

/**
 * Prepare the CCTP Transaction Resolver.
 *
 * This is an orchestration component that can be used independently
 * of portfolio logic to handle CCTP transaction confirmations.
 *
 * @param zone - Durable storage zone
 * @param vowTools - Vow tools for creating promises
 * @returns A function to create resolver instances with separate facets
 */
export const prepareCCTPResolver = (
  zone: Zone,
  {
    vowTools,
    portfoliosNode,
    marshaller,
  }: {
    vowTools: VowTools;
    portfoliosNode: ERef<StorageNode>;
    marshaller: Marshaller;
  },
) => {
  const resolverZone = zone.subZone('CCTPResolver');
  const cctpTransactionRegistry = resolverZone.mapStore<
    CCTPTransactionKey,
    CCTPTransactionEntry
  >('cctpTransactionRegistry');

  const ClientFacetI = M.interface('CCTPResolverClient', {
    registerCCTPTransaction: M.call(M.string(), M.bigint()).returns(VowShape),
  });

  const ServiceFacetI = M.interface('CCTPResolverService', {
    settleCCTPTransaction: M.call(
      M.string(),
      M.string(),
      M.bigint(),
      M.string(),
    ).returns(),
  });

  const DebugFacetI = M.interface('CCTPResolverDebug', {
    getPendingTransactions: M.call().returns(M.arrayOf(M.string())),
    publishCctpTransactionStatus: M.call().returns(),
  });

  const cctpStatusNode = E(portfoliosNode).makeChildNode('cctpStatus');

  return resolverZone.exoClassKit(
    'CCTPResolver',
    {
      client: ClientFacetI,
      service: ServiceFacetI,
      debug: DebugFacetI,
    },
    () => ({}),
    {
      client: {
        registerCCTPTransaction(destinationAddress: AccountId, amount: bigint) {
          const key = `${destinationAddress}:${amount}` as CCTPTransactionKey;

          if (cctpTransactionRegistry.has(key)) {
            trace(`CCTP transaction already registered: ${key}`);
            return cctpTransactionRegistry.get(key).vowKit.vow;
          }

          const vowKit = vowTools.makeVowKit<void>();

          cctpTransactionRegistry.init(
            key,
            harden({
              destinationAddress,
              amountValue: amount,
              vowKit,
            }),
          );

          this.facets.debug.publishCctpTransactionStatus();

          trace(`Registered pending CCTP transaction: ${key}`);
          return vowKit.vow;
        },
      },
      service: {
        settleCCTPTransaction(
          chainId: CaipChainId,
          remoteAddress: `0x${string}`,
          amountValue: bigint,
          status: 'confirmed' | 'failed' | 'pending',
        ) {
          const destinationAddress: AccountId = `${chainId}:${remoteAddress}`;
          const key =
            `${destinationAddress}:${amountValue}` as CCTPTransactionKey;

          if (!cctpTransactionRegistry.has(key)) {
            trace('No pending CCTP transaction found for key:', key);
            trace('Available keys in registry:', [
              ...cctpTransactionRegistry.keys(),
            ]);
            throw Error(
              `No pending CCTP transaction found matching provided details: ${key}`,
            );
          }

          const registryEntry = cctpTransactionRegistry.get(key);

          switch (status) {
            case 'confirmed':
              trace(`CCTP transaction confirmed - resolving pending operation`);
              registryEntry.vowKit.resolver.resolve();
              cctpTransactionRegistry.delete(key);
              this.facets.debug.publishCctpTransactionStatus();
              return;

            case 'failed':
              trace(`CCTP transaction failed - rejecting pending operation`);
              registryEntry.vowKit.resolver.reject(
                Error('CCTP transaction failed'),
              );
              cctpTransactionRegistry.delete(key);
              this.facets.debug.publishCctpTransactionStatus();
              return;

            case 'pending':
              trace(`CCTP transaction still pending - no action taken`);
              return;
          }
        },
      },
      debug: {
        getPendingTransactions() {
          return [...cctpTransactionRegistry.keys()];
        },
        publishCctpTransactionStatus() {
          const publishStatus = (status): void => {
            void E.when(E(marshaller).toCapData(status), capData =>
              E(cctpStatusNode).setValue(JSON.stringify(capData)),
            );
          };

          const cctpTransactions = Array.from(
            cctpTransactionRegistry.entries(),
          ).reduce((acc, [key, entry]) => {
            acc[key] = {
              destinationAddress: entry.destinationAddress,
              amountValue: entry.amountValue,
            };
            return acc;
          }, {});

          publishStatus(cctpTransactions);
        },
      },
    },
  );
};

harden(prepareCCTPResolver);

/**
 * Prepare CCTP Resolver Invitation Makers.
 *
 * @param zone - Durable storage zone
 * @param zcf - Zoe Contract Facet for creating invitations
 * @param resolver - The resolver instance to use
 * @returns A function to create resolver invitation makers
 */
export const prepareResolverInvitationMakers = (
  zone: Zone,
  zcf: ZCF,
  resolver: CCTPResolverServiceFacet,
) => {
  const resolverInvitationMakersZone = zone.subZone('ResolverInvitationMakers');

  // Prepare durable settlement handler
  const prepareSettlementHandler = resolverInvitationMakersZone.exoClass(
    'SettlementHandler',
    M.interface('SettlementHandler', {
      handle: M.call(M.any(), M.any()).returns(M.promise()),
    }),
    () => ({ resolver }),
    {
      async handle(seat: ZCFSeat, offerArgs: CCTPSettlementOfferArgs) {
        const { resolver } = this.state;
        const offerArgsShape = M.splitRecord(
          {
            txDetails: CCTPTransactionDetailsShape,
            remoteAxelarChain: M.string(), // CaipChainId format
          },
          {},
          {},
        );
        mustMatch(offerArgs, offerArgsShape);
        const { txDetails, remoteAxelarChain } = offerArgs as any;

        trace('CCTP transaction settlement:', {
          amount: txDetails.amount,
          remoteAddress: txDetails.remoteAddress,
          status: txDetails.status,
          remoteAxelarChain,
        });

        seat.exit();

        try {
          resolver.settleCCTPTransaction(
            remoteAxelarChain,
            txDetails.remoteAddress,
            txDetails.amount,
            txDetails.status,
          );

          return harden({
            success: true,
            message: 'CCTP transaction settlement processed',
            key: `${remoteAxelarChain}:${txDetails.remoteAddress}:${txDetails.amount}`,
            txDetails,
            remoteAxelarChain,
          });
        } catch (error) {
          return harden({
            success: false,
            message: error.message || 'CCTP transaction settlement failed',
            key: `${remoteAxelarChain}:${txDetails.remoteAddress}:${txDetails.amount}`,
            txDetails,
            remoteAxelarChain,
          });
        }
      },
    },
  );

  const ResolverInvitationMakersI = M.interface('ResolverInvitationMakers', {
    makeSettleCCTPTransactionInvitation: M.call().returns(M.promise()),
  });

  return resolverInvitationMakersZone.exoClass(
    'ResolverInvitationMakers',
    ResolverInvitationMakersI,
    () => ({ settlementHandler: prepareSettlementHandler() }),
    {
      makeSettleCCTPTransactionInvitation() {
        trace('makeSettleCCTPTransactionInvitation');
        const { settlementHandler } = this.state;

        const proposalShape = M.splitRecord(
          { give: {}, want: {} },
          { exit: M.any() },
          {},
        );
        return zcf.makeInvitation(
          (seat, offerArgs) =>
            settlementHandler.handle(
              seat,
              offerArgs as unknown as CCTPSettlementOfferArgs,
            ),
          'settleCCTPTransaction',
          undefined,
          proposalShape,
        );
      },
    },
  );
};

harden(prepareResolverInvitationMakers);
