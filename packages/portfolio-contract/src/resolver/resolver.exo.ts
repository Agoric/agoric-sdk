/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer, mustMatch } from '@agoric/internal';
import type { AccountId } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import { type VowTools, type VowKit, VowShape } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import { M } from '@endo/patterns';
import type { NatValue } from '@agoric/ertp/src/types.ts';
import type {
  CCTPTransactionKey,
  CCTPSettlementOfferArgs,
  CCTPSettlementArgs,
} from './types.js';
import { ResolverOfferArgsShapes, CCTPSettlementArgsShape } from './types.js';
import { Fail, q } from '@endo/errors';

type CCTPTransactionEntry = {
  destinationAddress: AccountId;
  amountValue: bigint;
  vowKit: VowKit<void>;
};

const trace = makeTracer('Resolver');

const ClientFacetI = M.interface('CCTPResolverClient', {
  registerCCTPTransaction: M.call(M.string(), M.nat()).returns(VowShape),
});

const ServiceFacetI = M.interface('CCTPResolverService', {
  settleCCTPTransaction: M.call(CCTPSettlementArgsShape).returns(),
});

const InvitationMakersFacetI = M.interface('ResolverInvitationMakers', {
  SettleCCTPTransaction: M.callWhen().returns(M.remotable()),
});

const SettlementHandlerFacetI = M.interface('SettlementHandler', {
  handle: M.callWhen(M.remotable(), M.any()).returns(M.string()),
});

const proposalShape = M.splitRecord(
  { give: {}, want: {} },
  { exit: M.any() },
  {},
);

/**
 * Prepare CCTP Resolver Kit.
 *
 * This prepares a resolver maker with all CCTP functionality including
 * transaction registration, settlement, and invitation makers.
 *
 * @param resolverZone - Durable storage zone
 * @param zcf - Zoe Contract Facet for creating invitations
 * @param vowTools - Vow tools for creating promises
 * @returns Resolver kit maker function
 */
export const prepareResolverKit = (
  resolverZone: Zone,
  zcf: ZCF,
  vowTools: VowTools,
) => {
  return resolverZone.exoClassKit(
    'CCTPResolver',
    {
      client: ClientFacetI,
      service: ServiceFacetI,
      invitationMakers: InvitationMakersFacetI,
      settlementHandler: SettlementHandlerFacetI,
    },
    () => ({
      cctpTransactionRegistry: resolverZone
        .detached()
        .mapStore<
          CCTPTransactionKey,
          CCTPTransactionEntry
        >('cctpTransactionRegistry'),
    }),
    {
      client: {
        /**
         * Note: Attempting to re-register a transaction returns the existing
         * vow for that transaction.
         *
         * @param destinationAddress
         * @param amountValue
         */
        registerCCTPTransaction(
          destinationAddress: AccountId,
          amountValue: NatValue,
        ) {
          const { cctpTransactionRegistry } = this.state;
          const key =
            `${destinationAddress}:${amountValue}` as CCTPTransactionKey;
          if (cctpTransactionRegistry.has(key)) {
            trace(`CCTP transaction already registered: ${key}`);
            return cctpTransactionRegistry.get(key).vowKit.vow;
          }
          const vowKit = vowTools.makeVowKit<void>();
          cctpTransactionRegistry.init(
            key,
            harden({ destinationAddress, amountValue, vowKit }),
          );
          trace(`Registered pending CCTP transaction: ${key}`);
          return vowKit.vow;
        },
      },
      service: {
        settleCCTPTransaction(args: CCTPSettlementArgs) {
          const { cctpTransactionRegistry } = this.state;
          const {
            chainId,
            remoteAddress,
            amountValue,
            status,
            rejectionReason,
          } = args;
          const key =
            `${chainId}:${remoteAddress}:${amountValue}` as CCTPTransactionKey;
          if (!cctpTransactionRegistry.has(key)) {
            trace('No pending CCTP transaction found for key:', key);
            throw Error(
              `No pending CCTP transaction found matching provided details: ${q(key)}`,
            );
          }
          const registryEntry = cctpTransactionRegistry.get(key);
          switch (status) {
            case 'confirmed':
              trace(
                'CCTP transaction confirmed - resolving pending operation for key:',
                key,
              );
              registryEntry.vowKit.resolver.resolve();
              cctpTransactionRegistry.delete(key);
              return;
            case 'failed':
              trace(
                'CCTP transaction failed - rejecting pending operation for key:',
                key,
              );
              registryEntry.vowKit.resolver.reject(
                Error(rejectionReason || 'CCTP transaction failed'),
              );
              cctpTransactionRegistry.delete(key);
              return;
            default:
              throw Fail`Unexpected status ${q(status)} for CCTP transaction: ${q(key)}`;
          }
        },
      },
      settlementHandler: {
        async handle(seat: ZCFSeat, offerArgs: CCTPSettlementOfferArgs) {
          mustMatch(offerArgs, ResolverOfferArgsShapes.SettleCCTPTransaction);
          const { txDetails, remoteAxelarChain } = offerArgs;
          trace('CCTP transaction settlement:', {
            amount: txDetails.amount,
            remoteAddress: txDetails.remoteAddress,
            status: txDetails.status,
            remoteAxelarChain,
          });
          seat.exit();
          this.facets.service.settleCCTPTransaction({
            chainId: remoteAxelarChain,
            remoteAddress: txDetails.remoteAddress,
            amountValue: txDetails.amount,
            status: txDetails.status,
          });
          return 'CCTP transaction settlement processed';
        },
      },
      invitationMakers: {
        SettleCCTPTransaction() {
          trace('SettleCCTPTransaction');
          const { settlementHandler } = this.facets;

          return zcf.makeInvitation(
            settlementHandler,
            'settleCCTPTransaction',
            undefined,
            proposalShape,
          );
        },
      },
    },
  );
};
export type ResolverInvitationMakers = ResolverKit['invitationMakers'];

export type ResolverKit = ReturnType<ReturnType<typeof prepareResolverKit>>;

harden(prepareResolverKit);
