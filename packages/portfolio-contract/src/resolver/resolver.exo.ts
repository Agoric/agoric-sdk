/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer, type ERemote } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { AccountId, MetaTrafficEntry } from '@agoric/orchestration';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
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
  vowKit: VowKit<void>;
  amountValue?: bigint;
} & (
  | {
      type: Exclude<TxType, typeof TxType.TRAFFIC>;
      destinationAddress: AccountId;
    }
  | ({
      type: typeof TxType.TRAFFIC;
    } & MetaTrafficEntry)
);

const trace = makeTracer('Resolver');

// allow Promises for unit testing
const PromiseVowShape = M.any();

const ClientFacetI = M.interface('ResolverClient', {
  registerTransaction: M.call(
    M.or(...Object.values(TxType)),
    M.or(M.string(), M.record()),
  )
    .optional(M.nat())
    .returns(M.splitRecord({ result: PromiseVowShape, txId: M.string() })),
});

const ReporterI = M.interface('Reporter', {
  insertPendingTransaction: M.call(
    M.string(),
    M.or(M.record(), M.string()),
    M.or(...Object.values(TxType)),
  )
    .optional(M.nat())
    .returns(),
  completePendingTransaction: M.call(
    M.string(),
    M.or(TxStatus.SUCCESS, TxStatus.FAILED),
  ).returns(),
});

const TargetShape = M.splitRecord(
  { type: M.string(), destination: M.string() },
  { amountValue: M.nat() },
);
const ServiceFacetI = M.interface('ResolverService', {
  settleTransaction: M.call(TransactionSettlementOfferArgsShape).returns(),
  lookupTx: M.call(TargetShape).returns(M.opt(M.string())),
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
    pendingTxsNode: ERemote<StorageNode>;
    marshaller: ERemote<Marshaller>;
  },
) => {
  const writeToNode = (
    node: ERemote<StorageNode>,
    value: PublishedTx,
  ): void => {
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
      etc: undefined as Record<string, any> | undefined,
    }),
    {
      client: {
        /**
         * Register a transaction and return a vow that is fulfilled when the transaction is resolved.
         *
         * @param type
         * @param destinationAddressOrTraffic
         * @param amountValue
         */
        registerTransaction(
          type: TxType,
          destinationAddressOrTraffic: AccountId | MetaTrafficEntry,
          amountValue?: NatValue,
        ): { result: Vow<void>; txId: TxId } {
          const txId: TxId = `tx${this.state.index}`;
          this.state.index += 1;

          const { transactionRegistry } = this.state;
          const vowKit = vowTools.makeVowKit<void>();
          if (type === TxType.TRAFFIC) {
            const traffic = destinationAddressOrTraffic;
            assert.typeof(
              traffic,
              'object',
              'TRAFFIC transaction requires a record argument',
            );
            assert(traffic != null, 'TRAFFIC transaction cannot be nullish');
            transactionRegistry.init(
              txId,
              harden({
                ...traffic,
                ...(amountValue == null ? {} : { amountValue }),
                vowKit,
                type,
              }),
            );
            this.facets.reporter.insertPendingTransaction(
              txId,
              traffic,
              type,
              amountValue,
            );

            // TODO(#12090): Rip this out when we teach the resolver service about
            // TxType.TRAFFIC.
            void Promise.resolve().then(() => {
              console.warn(
                `TODO(#12090): auto-resolving ${type} transaction ${txId} just to prevent deadlock`,
              );
              this.facets.service.settleTransaction({
                status: TxStatus.SUCCESS,
                txId,
              });
            });
          } else {
            const destinationAddress = destinationAddressOrTraffic;
            assert.typeof(
              destinationAddress,
              'string',
              `transaction type ${q(type)} requires a destination address string`,
            );
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
          }

          trace(`Registered pending transaction: ${type} ${txId}`);
          return { result: vowKit.vow, txId };
        },
      },
      reporter: {
        insertPendingTransaction(
          txId: TxId,
          destinationAddressOrTraffic: AccountId | MetaTrafficEntry,
          type: TxType,
          amount?: NatValue,
        ) {
          let value: PublishedTx;
          if (type === TxType.TRAFFIC) {
            const traffic = destinationAddressOrTraffic;
            assert.typeof(
              traffic,
              'object',
              'TRAFFIC transaction requires a record argument',
            );
            assert(traffic != null, 'TRAFFIC transaction cannot be nullish');
            value = {
              ...traffic,
              type,
              status: TxStatus.PENDING,
              ...(amount == null ? {} : { amount }),
            };
          } else {
            const destinationAddress = destinationAddressOrTraffic;
            assert.typeof(
              destinationAddress,
              'string',
              `transaction type ${q(type)} requires a destination address string`,
            );
            value = {
              type,
              destinationAddress,
              status: TxStatus.PENDING,
              ...(type !== TxType.GMP ? { amount } : {}),
            };
          }
          const node = E(pendingTxsNode).makeChildNode(txId);
          writeToNode(node, value);
        },

        completePendingTransaction(
          txId: TxId,
          status: Exclude<TxStatus, 'pending'> = TxStatus.SUCCESS,
        ) {
          const node = E(pendingTxsNode).makeChildNode(txId);
          const txEntry = this.state.transactionRegistry.get(txId);
          if (txEntry.type === TxType.TRAFFIC) {
            const { amountValue, type, vowKit: _, ...traffic } = txEntry;
            const value: PublishedTx = {
              ...traffic,
              type,
              ...(amountValue == null ? {} : { amount: amountValue }),
              status,
            };
            // UNTIL https://github.com/Agoric/agoric-sdk/issues/11791
            writeToNode(node, value);
          } else {
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
          }
        },
      },
      service: {
        settleTransaction(args: TransactionSettlementOfferArgs) {
          const { transactionRegistry } = this.state;
          const { status, txId, rejectionReason } = args;

          const registryEntry = transactionRegistry.get(txId);

          switch (status) {
            case TxStatus.SUCCESS:
              trace('fulfill:', txId, registryEntry.type);
              registryEntry.vowKit.resolver.resolve();
              this.facets.reporter.completePendingTransaction(
                txId,
                TxStatus.SUCCESS,
              );
              transactionRegistry.delete(txId);
              return;

            case TxStatus.FAILED:
              trace('reject:', txId, registryEntry.type);
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
        // XXX O(n) in pending transactions
        lookupTx(pattern: {
          type: TxType;
          destination: AccountId;
          amountValue?: NatValue;
        }) {
          const { transactionRegistry } = this.state;
          assert(
            pattern.type !== TxType.TRAFFIC,
            `TxType.TRAFFIC unimplemented`,
          );

          // Find the first key for a matching value. While this is still O(n),
          // the approach may someday take advantage of an index.
          M.splitRecord(
            { type: M.string(), destination: M.string() },
            { amountValue: M.nat() },
          );
          const valuePatt = M.splitRecord({
            type: pattern.type,
            destinationAddress: pattern.destination,
            ...(pattern.amountValue === undefined
              ? {}
              : { amountValue: pattern.amountValue }),
          });

          // eslint-disable-next-line no-unreachable-loop
          for (const txId of transactionRegistry.keys(M.any(), valuePatt)) {
            return txId;
          }
          return undefined;
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
    {
      stateShape: {
        transactionRegistry: M.remotable('transactionRegistry'),
        index: M.number(),
        etc: M.any(),
      },
    },
  );
};
export type ResolverInvitationMakers = ResolverKit['invitationMakers'];

export type ResolverKit = ReturnType<ReturnType<typeof prepareResolverKit>>;

harden(prepareResolverKit);
