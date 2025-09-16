/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { AccountId } from '@agoric/orchestration';
import { type Vow, type VowKit, VowShape, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import type { ERef } from '@endo/far';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { TxStatus, TxType } from './constants.js';
import type {
  PublishedTx,
  TransactionSettlementOfferArgs,
  TxId,
} from './types.js';
import {
  ResolverOfferArgsShapes,
  TransactionSettlementOfferArgsShape,
} from './types.js';

type TransactionEntry = {
  destinationAddress: AccountId;
  amountValue?: bigint;
  vowKit: VowKit<void>;
  type: TxType;
};

const trace = makeTracer('Resolver');

const ClientFacetI = M.interface('ResolverClient', {
  registerTransaction: M.call(M.or(...Object.values(TxType)), M.string())
    .optional(M.nat())
    .returns(M.splitRecord({ result: VowShape, txId: M.string() })),
});

const ReporterI = M.interface('Reporter', {
  insertPendingTransaction: M.call(
    M.string(),
    M.string(),
    M.or(...Object.values(TxType)),
  )
    .optional(M.nat())
    .returns(),
  completePendingTransaction: M.call(
    M.string(),
    M.or(TxStatus.SUCCESS, TxStatus.FAILED),
  ).returns(),
});

const ServiceFacetI = M.interface('ResolverService', {
  settleTransaction: M.call(TransactionSettlementOfferArgsShape).returns(),
});

const InvitationMakersFacetI = M.interface('ResolverInvitationMakers', {
  SettleTransaction: M.callWhen().returns(InvitationShape),
});

const SettlementHandlerFacetI = M.interface('SettlementHandler', {
  handle: M.callWhen(
    M.remotable(),
    ResolverOfferArgsShapes.SettleTransaction,
  ).returns(M.string()),
});

const proposalShape = M.splitRecord(
  { give: {}, want: {} },
  { exit: M.any() },
  {},
);
/**
 * Prepare Transaction Resolver Kit.
 *
 * This prepares a resolver maker with generic transaction functionality
 * that supports multiple transaction types through key-based identification.
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
    'Resolver',
    {
      client: ClientFacetI,
      service: ServiceFacetI,
      invitationMakers: InvitationMakersFacetI,
      settlementHandler: SettlementHandlerFacetI,
      reporter: ReporterI,
    },
    () => ({
      transactionRegistry: resolverZone
        .detached()
        .mapStore<TxId, TransactionEntry>('transactionRegistry'),
      index: 0,
    }),
    {
      client: {
        /**
         * Register a transaction and return a vow that is fulfilled when the transaction is resolved.
         *
         * @param type
         * @param destinationAddress
         * @param amountValue
         */
        registerTransaction(
          type: TxType,
          destinationAddress: AccountId,
          amountValue?: NatValue,
        ): { result: Vow<void>; txId: TxId } {
          const txId: TxId = `tx${this.state.index}`;
          this.state.index += 1;

          const { transactionRegistry } = this.state;
          const vowKit = vowTools.makeVowKit<void>();
          const txEntry: TransactionEntry = {
            destinationAddress,
            vowKit,
            type,
            ...(type !== TxType.GMP ? { amountValue } : {}),
          };
          transactionRegistry.init(txId, harden(txEntry));
          this.facets.reporter.insertPendingTransaction(
            txId,
            destinationAddress,
            type,
            amountValue,
          );

          trace(`Registered pending transaction: ${txId}`);
          return { result: vowKit.vow, txId };
        },
      },
      reporter: {
        insertPendingTransaction(
          txId: TxId,
          destinationAddress: AccountId,
          type: TxType,
          amount?: NatValue,
        ) {
          const value: PublishedTx = {
            type,
            destinationAddress,
            status: TxStatus.PENDING,
            ...(type !== TxType.GMP ? { amount } : {}),
          };
          const node = E(pendingTxsNode).makeChildNode(txId);
          writeToNode(node, value);
        },

        completePendingTransaction(
          txId: TxId,
          status: Exclude<TxStatus, 'pending'> = TxStatus.SUCCESS,
        ) {
          const node = E(pendingTxsNode).makeChildNode(txId);
          const txEntry = this.state.transactionRegistry.get(txId);
          const value: PublishedTx = {
            destinationAddress: txEntry.destinationAddress,
            type: txEntry.type,
            ...(txEntry.type !== TxType.GMP
              ? { amount: txEntry.amountValue }
              : {}),
            status,
          };
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/11791
          writeToNode(node, value);
        },
      },
      service: {
        settleTransaction(args: TransactionSettlementOfferArgs) {
          const { transactionRegistry } = this.state;
          const { status, txId, rejectionReason } = args;

          const registryEntry = transactionRegistry.get(txId);

          switch (status) {
            case TxStatus.SUCCESS:
              trace(
                'Transaction confirmed - resolving pending operation for key:',
                txId,
              );
              registryEntry.vowKit.resolver.resolve();
              this.facets.reporter.completePendingTransaction(
                txId,
                TxStatus.SUCCESS,
              );
              transactionRegistry.delete(txId);
              return;

            case TxStatus.FAILED:
              trace(
                'Transaction failed - rejecting pending operation for key:',
                txId,
              );
              registryEntry.vowKit.resolver.reject(
                Error(rejectionReason || 'Transaction failed'),
              );
              this.facets.reporter.completePendingTransaction(
                txId,
                TxStatus.FAILED,
              );
              transactionRegistry.delete(txId);
              return;

            default:
              throw Fail`Unexpected status ${q(status)} for transaction: ${q(txId)}`;
          }
        },
      },
      settlementHandler: {
        async handle(seat: ZCFSeat, offerArgs: TransactionSettlementOfferArgs) {
          trace('Transaction settlement:', offerArgs);

          seat.exit();
          this.facets.service.settleTransaction(offerArgs);

          return 'Transaction settlement processed';
        },
      },
      invitationMakers: {
        SettleTransaction() {
          trace('SettleTransaction');
          const { settlementHandler } = this.facets;

          return zcf.makeInvitation(
            settlementHandler,
            'settleTransaction',
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
