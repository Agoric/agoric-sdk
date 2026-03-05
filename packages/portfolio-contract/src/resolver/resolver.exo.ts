/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer, type ERemote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { EMarshaller } from '@agoric/internal/src/marshal/wrap-marshaller.js';
import type { AccountId } from '@agoric/orchestration';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import type { NatValue } from '@agoric/ertp';
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

interface TransactionEntry extends TxMeta {
  vowKit: VowKit<void>;
}

interface TxMeta {
  type: TxType;
  expectedAddr?: `0x${string}`;
  factoryAddr?: `0x${string}`;
  nextTxId?: TxId;
}

const txsWithAmounts: TxType[] = [TxType.CCTP_TO_AGORIC, TxType.CCTP_TO_EVM];

const trace = makeTracer('Resolver');

// allow Promises for unit testing
const PromiseVowShape = M.any();

const ClientFacetI = M.interface('ResolverClient', {
  registerTransaction: M.call(M.or(...Object.values(TxType)), M.string())
    .optional(M.nat(), M.string(), M.string(), M.string())
    .returns(M.splitRecord({ result: PromiseVowShape, txId: M.string() })),
  unsubscribe: M.call(M.string(), M.string()).returns(),
  createPendingTx: M.call(
    M.splitRecord({
      type: M.or(...Object.values(TxType)),
    }),
  ).returns(M.splitRecord({ result: PromiseVowShape, txId: M.string() })),
  updateTxMeta: M.call(
    M.string(),
    M.splitRecord({
      type: M.or(...Object.values(TxType)),
    }),
  ).returns(),
});

interface TxMeta {
  [prop: PropertyKey]: any;
  type: TxType;
  nextTxId?: TxId;
  destinationAddress?: AccountId;
  sourceAddress?: AccountId;
  amountValue?: bigint;
}

const ReporterI = M.interface('Reporter', {
  upsertPendingTx: M.call(
    M.string(),
    M.splitRecord({
      type: M.or(...Object.values(TxType)),
    }),
    M.or(...Object.values(TxStatus)),
  )
    .optional(M.string())
    .returns(),
  insertPendingTransaction: M.call(
    M.string(),
    M.string(),
    M.or(...Object.values(TxType)),
  )
    .optional(M.nat(), M.string())
    .returns(),
  completePendingTransaction: M.call(
    M.string(),
    M.or(TxStatus.SUCCESS, TxStatus.FAILED),
  )
    .optional(M.string())
    .returns(),
});

const TargetShape = M.splitRecord(
  { type: M.string(), destination: M.string() },
  { amountValue: M.nat() },
);
const ServiceFacetI = M.interface('ResolverService', {
  settleTransaction: M.call(TransactionSettlementOfferArgsShape).returns(),
  lookupTx: M.call(TargetShape).returns(M.opt(M.string())),
  lookupTxByPattern: M.call(M.any())
    .optional(M.any())
    .returns(M.opt(M.string())),
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
    marshaller: ERemote<EMarshaller>;
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
      etc: undefined,
    }),
    {
      client: {
        /**
         * Create pending transaction with no opinion on any other arguments
         * except for txMeta.
         */
        createPendingTx(txMeta: TxMeta) {
          const { transactionRegistry } = this.state;
          const vowKit = vowTools.makeVowKit<void>();

          const txEntry: TransactionEntry = harden({
            ...txMeta,
            vowKit,
          });

          const txId: TxId = `tx${this.state.index}`;
          this.state.index += 1;

          transactionRegistry.init(txId, txEntry);

          const status = txMeta?.incomplete ? TxStatus.SETUP : TxStatus.PENDING;
          this.facets.reporter.upsertPendingTx(txId, txMeta, status);

          trace(`Registered ${status} transaction: ${txId}`);

          return harden({ txId, result: vowKit.vow });
        },

        updateTxMeta(txId: TxId, meta: TxMeta) {
          const { transactionRegistry: registry } = this.state;
          if (!registry.has(txId)) {
            // No such transaction to update; ignore while it is still in
            // flight.
            return;
          }
          const { vowKit: vk } = registry.get(txId);
          const entry: TransactionEntry = harden({
            ...meta,
            vowKit: vk,
          });
          const status = meta?.incomplete ? TxStatus.SETUP : TxStatus.PENDING;
          registry.set(txId, entry);
          this.facets.reporter.upsertPendingTx(txId, meta, status);
        },

        /**
         * Register a transaction and return a vow that is fulfilled when the transaction is resolved.
         */
        registerTransaction(
          type: TxType,
          destinationAddress: AccountId,
          amountValue?: NatValue,
          expectedAddr?: `0x${string}`,
          sourceAddress?: AccountId,
          factoryAddr?: `0x${string}`,
        ): { result: Vow<void>; txId: TxId } {
          const txMeta: TxMeta = {
            type,
            destinationAddress,
            ...(txsWithAmounts.includes(type) ? { amountValue } : {}),
            ...(type === TxType.MAKE_ACCOUNT
              ? { expectedAddr, factoryAddr }
              : {}),
            ...(sourceAddress ? { sourceAddress } : {}),
          };
          return this.facets.client.createPendingTx(txMeta);
        },
        unsubscribe(txId: TxId, reason: string) {
          const { transactionRegistry } = this.state;
          const { service } = this.facets;
          if (transactionRegistry.has(txId)) {
            service.settleTransaction({
              txId,
              status: 'failed',
              rejectionReason: reason,
            });
          }
        },
      },
      reporter: {
        upsertPendingTx(
          txId: TxId,
          txMeta: TxMeta,
          status: TxStatus,
          rejectionReason?: string,
        ) {
          /**
           * XXX: IBC_FROM_REMOTE transactions are not yet supported by the
           * resolver. We emulate the old behaviour in this case; just resolve
           * the transaction as soon as we've identified it.
           */
          {
            if (txMeta?.type === 'IBC_FROM_REMOTE') {
              const { vowKit } = this.state.transactionRegistry.get(txId);
              vowKit.resolver.resolve(
                // @ts-expect-error cast
                'IBC_FROM_REMOTE not implemented by resolver; auto-resolving',
              );
              status = TxStatus.SUCCESS;
            }
          }

          const {
            type,
            destinationAddress,
            sourceAddress,
            amountValue: amount,
            expectedAddr,
            factoryAddr,
            ...rest
          } = txMeta;

          const value: PublishedTx = {
            type,
            ...rest,
            ...(destinationAddress ? { destinationAddress } : {}),
            ...(sourceAddress ? { sourceAddress } : {}),
            ...(txsWithAmounts.includes(type) ? { amount } : {}),
            ...(type === TxType.MAKE_ACCOUNT
              ? { expectedAddr, factoryAddr }
              : {}),
            ...(rejectionReason ? { rejectionReason } : {}),
            status,
          };

          const node = E(pendingTxsNode).makeChildNode(txId);
          writeToNode(node, value);
        },

        insertPendingTransaction(
          txId: TxId,
          destinationAddress: AccountId,
          type: TxType,
          amount?: NatValue,
          expectedAddr?: `0x${string}`,
          factoryAddr?: `0x${string}`,
        ) {
          const txMeta: TxMeta = {
            type,
            destinationAddress,
            status: TxStatus.PENDING,
            ...(txsWithAmounts.includes(type) ? { amount } : {}),
            ...(type === TxType.MAKE_ACCOUNT
              ? { expectedAddr, factoryAddr }
              : {}),
          };
          return this.facets.reporter.upsertPendingTx(
            txId,
            txMeta,
            TxStatus.PENDING,
          );
        },

        completePendingTransaction(
          txId: TxId,
          status: Exclude<TxStatus, 'pending' | 'setup'> = TxStatus.SUCCESS,
          rejectionReason?: string,
        ) {
          const { vowKit: _vowKit, ...txMeta } =
            this.state.transactionRegistry.get(txId);
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/11791
          this.facets.reporter.upsertPendingTx(
            txId,
            harden(txMeta),
            status,
            rejectionReason,
          );
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
              trace('reject:', txId, registryEntry.type, rejectionReason);
              registryEntry.vowKit.resolver.reject(
                Error(rejectionReason || 'Transaction failed'),
              );
              this.facets.reporter.completePendingTransaction(
                txId,
                TxStatus.FAILED,
                rejectionReason,
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
          switch (pattern.type) {
            case TxType.IBC_FROM_AGORIC:
            case TxType.IBC_FROM_REMOTE: {
              throw Fail`TxType[${q(pattern.type)}] unimplemented`;
            }
            default:
            // continue below
          }

          const valuePatt = M.splitRecord({
            type: pattern.type,
            destinationAddress: pattern.destination,
            ...(pattern.amountValue === undefined
              ? {}
              : { amountValue: pattern.amountValue }),
          });

          return this.facets.service.lookupTxByPattern(valuePatt);
        },
        /**
         * Find the first key for a matching value. Though this is still O(n),
         * the approach may someday take advantage of an index.
         */
        lookupTxByPattern(
          valuePattern: any,
          keyPattern: any = M.any(),
        ): TxId | undefined {
          const { transactionRegistry } = this.state;

          // eslint-disable-next-line no-unreachable-loop
          for (const txId of transactionRegistry.keys(
            keyPattern,
            valuePattern,
          )) {
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
