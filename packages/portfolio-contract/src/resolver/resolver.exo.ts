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
  GMPSettlementArgs,
  GMPSettlementOfferArgs,
  PublishedTx,
} from './types.js';
import {
  CCTPSettlementArgsShape,
  GMPSettlementArgsShape,
  ResolverOfferArgsShapes,
} from './types.js';
import type { AxelarId } from '../portfolio.contract.js';

type CCTPTransactionEntry = {
  destinationAddress: AccountId;
  amountValue: bigint;
  vowKit: VowKit<void>;
};

type GMPTransactionEntry = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: string;
  vowKit: VowKit<void>;
};

const trace = makeTracer('Resolver');

const ClientFacetI = M.interface('ResolverClient', {
  registerCCTPTransaction: M.call(M.string(), M.nat()).returns(VowShape),
  registerGMPTransaction: M.call(M.string(), M.string(), M.string()).returns(
    VowShape,
  ),
});

const ReporterI = M.interface('Reporter', {
  insertPendingTransaction: M.call(M.bigint(), M.string()).returns(),
  completePendingTransaction: M.call(M.string(), M.string()).returns(),
  insertPendingGMPTransaction: M.call(
    M.string(),
    M.string(),
    M.string(),
  ).returns(),
  completePendingGMPTransaction: M.call(M.string()).returns(),
});

const ServiceFacetI = M.interface('ResolverService', {
  settleCCTPTransaction: M.call(CCTPSettlementArgsShape).returns(),
  settleGMPTransaction: M.call(GMPSettlementArgsShape).returns(),
});

const InvitationMakersFacetI = M.interface('ResolverInvitationMakers', {
  SettleCCTPTransaction: M.callWhen().returns(M.remotable()),
  SettleGMPTransaction: M.callWhen().returns(M.remotable()),
});

const SettlementHandlerFacetI = M.interface('SettlementHandler', {
  handle: M.callWhen(M.remotable(), M.any()).returns(M.string()),
  handleGMP: M.callWhen(M.remotable(), M.any()).returns(M.string()),
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
      gmpTransactionRegistry: resolverZone
        .detached()
        .mapStore<`tx${number}`, GMPTransactionEntry>('gmpTransactionRegistry'),
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

        /**
         * Register a GMP transaction and return a vow that resolves when settled.
         *
         * @param lcaAddr - LCA address
         * @param destinationChain - Axelar destination chain
         * @param contractAddress - Contract address on destination chain
         */
        registerGMPTransaction(
          lcaAddr: string,
          destinationChain: AxelarId,
          contractAddress: string,
        ) {
          const { gmpTransactionRegistry } = this.state;
          const txId = `tx${this.state.index}` as `tx${number}`;
          this.state.index += 1;

          const vowKit = vowTools.makeVowKit<void>();
          gmpTransactionRegistry.init(
            txId,
            harden({
              lcaAddr,
              destinationChain,
              contractAddress,
              vowKit,
            }),
          );

          this.facets.reporter.insertPendingGMPTransaction(
            lcaAddr,
            destinationChain,
            contractAddress,
          );

          trace(`Registered pending GMP transaction: ${txId}`);
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

        insertPendingGMPTransaction(
          lcaAddr: string,
          destinationChain: AxelarId,
          contractAddress: string,
        ) {
          const value: PublishedTx = {
            type: TxType.GMP,
            lcaAddr,
            destinationChain,
            contractAddress,
            status: TxStatus.PENDING,
          };
          const node = E(pendingTxsNode).makeChildNode(
            `tx${this.state.index - 1}`,
          );
          writeToNode(node, value);
        },

        completePendingGMPTransaction(vstorageId: `tx${number}`) {
          const node = E(pendingTxsNode).makeChildNode(vstorageId);
          const txEntry = this.state.gmpTransactionRegistry.get(vstorageId);
          const value: PublishedTx = {
            type: TxType.GMP,
            lcaAddr: txEntry.lcaAddr,
            destinationChain: txEntry.destinationChain,
            contractAddress: txEntry.contractAddress,
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

        settleGMPTransaction(args: GMPSettlementArgs) {
          const { gmpTransactionRegistry } = this.state;
          const {
            lcaAddr,
            destinationChain,
            contractAddress,
            status,
            rejectionReason,
            txId,
          } = args;

          if (!gmpTransactionRegistry.has(txId)) {
            trace('No pending GMP transaction found for txId:', txId);
            throw Error(
              `No pending GMP transaction found matching: ${q(txId)}`,
            );
          }

          const registryEntry = gmpTransactionRegistry.get(txId);

          // Verify the transaction details match
          if (
            registryEntry.lcaAddr !== lcaAddr ||
            registryEntry.destinationChain !== destinationChain ||
            registryEntry.contractAddress !== contractAddress
          ) {
            throw Error(
              `GMP transaction details mismatch for ${txId}: expected ${q({
                lcaAddr: registryEntry.lcaAddr,
                destinationChain: registryEntry.destinationChain,
                contractAddress: registryEntry.contractAddress,
              })}, got ${q({ lcaAddr, destinationChain, contractAddress })}`,
            );
          }

          switch (status) {
            case 'success':
              trace(
                'GMP transaction confirmed - resolving pending operation for txId:',
                txId,
              );
              registryEntry.vowKit.resolver.resolve();
              this.facets.reporter.completePendingGMPTransaction(txId);
              gmpTransactionRegistry.delete(txId);
              return;

            case 'failed':
              trace(
                'GMP transaction failed - rejecting pending operation for txId:',
                txId,
              );
              registryEntry.vowKit.resolver.reject(
                Error(rejectionReason || 'GMP transaction failed'),
              );
              this.facets.reporter.completePendingGMPTransaction(txId);
              gmpTransactionRegistry.delete(txId);
              return;

            default:
              throw Fail`Unexpected status ${q(status)} for GMP transaction: ${q(txId)}`;
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

        async handleGMP(seat: ZCFSeat, offerArgs: GMPSettlementOfferArgs) {
          mustMatch(offerArgs, ResolverOfferArgsShapes.SettleGMPTransaction);
          const { txDetails, txId } = offerArgs;

          trace('GMP transaction settlement:', {
            lcaAddr: txDetails.lcaAddr,
            destinationChain: txDetails.destinationChain,
            contractAddress: txDetails.contractAddress,
            status: txDetails.status,
          });

          seat.exit();
          this.facets.service.settleGMPTransaction({
            lcaAddr: txDetails.lcaAddr,
            destinationChain: txDetails.destinationChain,
            contractAddress: txDetails.contractAddress,
            status: txDetails.status,
            txId,
          });

          return 'GMP transaction settlement processed';
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

        SettleGMPTransaction() {
          trace('SettleGMPTransaction');
          const { settlementHandler } = this.facets;

          return zcf.makeInvitation(
            settlementHandler.handleGMP,
            'settleGMPTransaction',
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
