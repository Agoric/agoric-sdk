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

type TransactionEntry = {
  destinationAddress: AccountId;
  amountValue?: bigint;
  vowKit: VowKit<void>;
  type: TxType;
  expectedAddr?: `0x${string}`;
};

const txsWithAmounts: TxType[] = [TxType.CCTP_TO_AGORIC, TxType.CCTP_TO_EVM];

const trace = makeTracer('Resolver');

// allow Promises for unit testing
const PromiseVowShape = M.any();

const ClientFacetI = M.interface('ResolverClient', {
  registerTransaction: M.call(M.or(...Object.values(TxType)), M.string())
    .optional(M.nat(), M.string())
    .returns(M.splitRecord({ result: PromiseVowShape, txId: M.string() })),
  unsubscribe: M.call(M.string(), M.string()).returns(),
});

const ReporterI = M.interface('Reporter', {
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
         * Register a transaction and return a vow that is fulfilled when the transaction is resolved.
         *
         * @param type
         * @param destinationAddress
         * @param amountValue
         * @param expectedAddr
         */
        registerTransaction(
          type: TxType,
          destinationAddress: AccountId,
          amountValue?: NatValue,
          expectedAddr?: `0x${string}`,
        ): { result: Vow<void>; txId: TxId } {
          const txId: TxId = `tx${this.state.index}`;
          this.state.index += 1;

          const { transactionRegistry } = this.state;
          const vowKit = vowTools.makeVowKit<void>();
          const txEntry: TransactionEntry = {
            destinationAddress,
            vowKit,
            type,
            ...(txsWithAmounts.includes(type) ? { amountValue } : {}),
            ...(type === TxType.MAKE_ACCOUNT ? { expectedAddr } : {}),
          };
          transactionRegistry.init(txId, harden(txEntry));
          this.facets.reporter.insertPendingTransaction(
            txId,
            destinationAddress,
            type,
            amountValue,
            expectedAddr,
          );

          trace(`Registered pending transaction: ${txId}`);
          return { result: vowKit.vow, txId };
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
        insertPendingTransaction(
          txId: TxId,
          destinationAddress: AccountId,
          type: TxType,
          amount?: NatValue,
          expectedAddr?: `0x${string}`,
        ) {
          const value: PublishedTx = {
            type,
            destinationAddress,
            status: TxStatus.PENDING,
            ...(txsWithAmounts.includes(type) ? { amount } : {}),
            ...(type === TxType.MAKE_ACCOUNT ? { expectedAddr } : {}),
          };
          const node = E(pendingTxsNode).makeChildNode(txId);
          writeToNode(node, value);
        },

        completePendingTransaction(
          txId: TxId,
          status: Exclude<TxStatus, 'pending'> = TxStatus.SUCCESS,
          rejectionReason?: string,
        ) {
          const node = E(pendingTxsNode).makeChildNode(txId);
          const txEntry = this.state.transactionRegistry.get(txId);
          const value: PublishedTx = {
            destinationAddress: txEntry.destinationAddress,
            type: txEntry.type,
            ...(txsWithAmounts.includes(txEntry.type)
              ? { amount: txEntry.amountValue }
              : {}),
            ...(txEntry.type === TxType.MAKE_ACCOUNT
              ? { expectedAddr: txEntry.expectedAddr }
              : {}),
            status,
            ...(rejectionReason ? { rejectionReason } : {}),
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
          amountValue: NatValue;
        }) {
          const { transactionRegistry } = this.state;
          for (const [txId, info] of transactionRegistry.entries()) {
            if (
              info.type === pattern.type &&
              info.destinationAddress === pattern.destination &&
              info.amountValue === pattern.amountValue
            ) {
              return txId;
            }
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
