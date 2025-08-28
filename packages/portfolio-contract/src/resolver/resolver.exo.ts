/**
 * @file Transaction Resolver - handles cross-chain transaction confirmations
 *
 * This resolver is responsible for tracking pending transactions and providing
 * promises/vows that resolve when transactions are confirmed.
 * This is an orchestration component that can be used independently of portfolio logic.
 */

import { makeTracer, mustMatch } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { AccountId } from '@agoric/orchestration';
import { type Vow, type VowKit, VowShape, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import type { ERef } from '@endo/far';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { TxStatus, TxType } from './constants.js';
import type {
  PublishedTx,
  TransactionKey,
  TransactionSettlementArgs,
  TransactionSettlementOfferArgs,
} from './types.js';
import {
  ResolverOfferArgsShapes,
  TransactionSettlementArgsShape,
} from './types.js';

type TransactionEntry = {
  vowKit: VowKit<void>;
};

const trace = makeTracer('Resolver');

const ClientFacetI = M.interface('ResolverClient', {
  registerTransaction: M.call(M.string(), M.string(), M.nat()).returns(VowShape),
});

const ReporterI = M.interface('Reporter', {
  insertPendingTransaction: M.call(M.nat(), M.string()).returns(),
  completePendingTransaction: M.call(
    M.string(),
    M.string(),
    M.string(),
  ).returns(),
});

const ServiceFacetI = M.interface('ResolverService', {
  settleTransaction: M.call(TransactionSettlementArgsShape).returns(),
});

const InvitationMakersFacetI = M.interface('ResolverInvitationMakers', {
  SettleTransaction: M.callWhen().returns(M.remotable()),
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
 * Prepare Transaction Resolver Kit.
 *
 * This prepares a resolver maker with generic transaction functionality
 * that supports multiple transaction types through key-based identification.
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
        .mapStore<TransactionKey, TransactionEntry>('transactionRegistry'),
      index: 0,
    }),
    {
      client: {
        /**
         * Register a transaction and return a vow that resolves when settled.
         *
         * @param transactionKey - Unique transaction key
         */
        registerTransaction(
          type: TxType,
          destinationAddress: AccountId,
          amountValue: bigint,
        ): Vow<void> {
          const transactionKey: TransactionKey = `${type}:${destinationAddress}:${amountValue}`;
          const { transactionRegistry } = this.state;
          if (transactionRegistry.has(transactionKey)) {
            trace(`Transaction already registered: ${transactionKey}`);
            return transactionRegistry.get(transactionKey).vowKit.vow;
          }
          const vowKit = vowTools.makeVowKit<void>();
          transactionRegistry.init(
            transactionKey,
            harden({ destinationAddress, amountValue, vowKit }),
          );
          this.facets.reporter.insertPendingTransaction(
            amountValue,
            destinationAddress,
          );

          trace(`Registered pending transaction: ${transactionKey}`);
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
          transactionKey: string,
          status: Exclude<TxStatus, 'pending'> = TxStatus.SUCCESS,
        ) {
          const node = E(pendingTxsNode).makeChildNode(vstorageId);
          const [type, chainName, chainId, destinationAddress, amount] =
            transactionKey.split(':');
          const value: PublishedTx = {
            type: type as TxType,
            amount: BigInt(amount),
            destinationAddress: `${chainName}:${chainId}:${destinationAddress as `0x${string}`}`,
            status,
          };
          writeToNode(node, value);
        },
      },
      service: {
        settleTransaction(args: TransactionSettlementArgs) {
          const { transactionRegistry } = this.state;
          const { transactionKey, status, txId } = args;
          if (!transactionRegistry.has(transactionKey)) {
            trace('No pending transaction found for key:', transactionKey);
            throw Error(
              `No pending transaction found matching: ${q(transactionKey)}`,
            );
          }

          const registryEntry = transactionRegistry.get(transactionKey);

          switch (status) {
            case TxStatus.SUCCESS:
              trace(
                'Transaction confirmed - resolving pending operation for key:',
                transactionKey,
              );
              registryEntry.vowKit.resolver.resolve();
              this.facets.reporter.completePendingTransaction(
                txId,
                transactionKey,
                TxStatus.SUCCESS,
              );
              transactionRegistry.delete(transactionKey);
              return;

            case TxStatus.FAILED:
              trace(
                'Transaction failed - rejecting pending operation for key:',
                transactionKey,
              );
              registryEntry.vowKit.resolver.reject(
                Error('Transaction failed'),
              );
              this.facets.reporter.completePendingTransaction(
                txId,
                transactionKey,
                TxStatus.FAILED,
              );
              transactionRegistry.delete(transactionKey);
              return;

            default:
              throw Fail`Unexpected status ${q(status)} for transaction: ${q(transactionKey)}`;
          }
        },
      },
      settlementHandler: {
        async handle(seat: ZCFSeat, offerArgs: TransactionSettlementOfferArgs) {
          mustMatch(offerArgs, ResolverOfferArgsShapes.SettleTransaction);
          const { transactionKey, status, txId } = offerArgs;

          trace('Transaction settlement:', {
            transactionKey,
            status,
          });

          seat.exit();
          this.facets.service.settleTransaction({
            transactionKey,
            status,
            txId,
          });

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
