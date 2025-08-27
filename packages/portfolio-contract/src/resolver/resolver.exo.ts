/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import type { NatValue } from '@agoric/ertp/src/types.ts';
import { makeTracer, mustMatch } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { AccountId } from '@agoric/orchestration';
import { type VowKit, VowShape, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import type { ERef } from '@endo/far';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { TxStatus, TxType } from './constants.js';
import type {
  CCTPSettlementArgs,
  CCTPSettlementOfferArgs,
  CCTPTransactionKey,
  PublishedTx,
} from './types.js';
import { CCTPSettlementArgsShape, ResolverOfferArgsShapes } from './types.js';

type CCTPTransactionEntry = {
  destinationAddress: AccountId;
  amountValue: bigint;
  vowKit: VowKit<void>;
};

const trace = makeTracer('Resolver');

const ClientFacetI = M.interface('CCTPResolverClient', {
  registerCCTPTransaction: M.call(M.string(), M.nat()).returns(VowShape),
});

const ReporterI = M.interface('Reporter', {
  insertPendingTransaction: M.call(M.bigint(), M.string()).returns(),
  completePendingTransaction: M.call(M.string(), M.string()).returns(),
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
  {
    vowTools,
    pendingTxsNode,
    marshaller,
  }: {
    vowTools: VowTools;
    pendingTxsNode: ERef<StorageNode>;
    marshaller: Marshaller;
  },
) => {
  const writeToNode = (node: ERef<StorageNode>, value: PublishedTx): void => {
    void E.when(E(marshaller).toCapData(value), capData =>
      E(node).setValue(JSON.stringify(capData)),
    );
  };
  return resolverZone.exoClassKit(
    'CCTPResolver',
    {
      client: ClientFacetI,
      service: ServiceFacetI,
      invitationMakers: InvitationMakersFacetI,
      settlementHandler: SettlementHandlerFacetI,
      reporter: ReporterI,
    },
    () => ({
      cctpTransactionRegistry: resolverZone
        .detached()
        .mapStore<
          CCTPTransactionKey,
          CCTPTransactionEntry
        >('cctpTransactionRegistry'),
      index: 0,
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
          this.facets.reporter.insertPendingTransaction(
            amountValue,
            destinationAddress,
          );

          trace(`Registered pending CCTP transaction: ${key}`);
          return vowKit.vow;
        },
      },
      reporter: {
        insertPendingTransaction(
          amount: bigint,
          destinationAddress: AccountId,
        ) {
          const value: PublishedTx = {
            type: TxType.CCTP,
            amount,
            destinationAddress,
            status: TxStatus.PENDING,
          };
          const node = E(pendingTxsNode).makeChildNode(`tx${this.state.index}`);
          this.state.index += 1;
          writeToNode(node, value);
        },
        completePendingTransaction(
          vstorageId: `tx${number}`,
          transactionKey: CCTPTransactionKey,
        ) {
          const node = E(pendingTxsNode).makeChildNode(vstorageId);
          const txEntry =
            this.state.cctpTransactionRegistry.get(transactionKey);
          const value: PublishedTx = {
            type: TxType.CCTP,
            amount: txEntry.amountValue,
            destinationAddress: txEntry.destinationAddress,
            status: TxStatus.SUCCESS,
          };
          writeToNode(node, value);
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
            txId,
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
            case 'success':
              trace(
                'CCTP transaction confirmed - resolving pending operation for key:',
                key,
              );
              registryEntry.vowKit.resolver.resolve();
              this.facets.reporter.completePendingTransaction(txId, key);
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
              this.facets.reporter.completePendingTransaction(txId, key);
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
          const { txDetails, remoteAxelarChain, txId } = offerArgs;

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
            txId,
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
