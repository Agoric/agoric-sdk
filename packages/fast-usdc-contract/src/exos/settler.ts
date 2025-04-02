/**
 * @file Settler is responsible for monitoring (receiveUpcall) deposits to the
 * settlementAccount. It either "disburses" funds to the Pool (if funds were
 * "advance"d to the payee), or "forwards" funds to the payee (if pool funds
 * were not advanced).
 *
 * main export: @see {prepareSettler}
 */

import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { CosmosChainAddressShape } from '@agoric/orchestration';
import { atob } from '@endo/base64';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { fromOnly } from '@agoric/zoe/src/contractSupport/index.js';
import { PendingTxStatus } from '@agoric/fast-usdc/src/constants.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import {
  CctpTxEvidenceShape,
  EvmHashShape,
  makeNatAmountShape,
} from '@agoric/fast-usdc/src/type-guards.js';

import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { Amount, Brand, NatAmount, NatValue } from '@agoric/ertp';
import type {
  AccountId,
  Denom,
  OrchestrationAccount,
  ChainHub,
  CosmosChainAddress,
} from '@agoric/orchestration';
import type { WithdrawToSeat } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { IBCChannelID, IBCPacket, VTransferIBCEvent } from '@agoric/vats';
import type { Zone } from '@agoric/zone';
import type { HostOf, HostInterface } from '@agoric/async-flow';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import type {
  NobleAddress,
  FeeConfig,
  EvmHash,
  LogFn,
  CctpTxEvidence,
} from '@agoric/fast-usdc/src/types.js';
import type { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
import type { MapStore } from '@agoric/store';
import type { VowTools } from '@agoric/vow';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { Baggage } from '@agoric/vat-data';
import { Fail } from '@endo/errors';
import type { LiquidityPoolKit } from './liquidity-pool.js';
import type { StatusManager } from './status-manager.js';
import { asMultiset } from '../utils/store.ts';
import { NOBLE_ICA_BAGGAGE_KEY } from '../fast-usdc.contract.ts';
import { makeSupportsCctp } from '../utils/cctp.ts';

const decodeEventPacket = (
  { data }: IBCPacket,
  remoteDenom: string,
):
  | { nfa: NobleAddress; amount: bigint; EUD: string }
  | { error: unknown[] } => {
  // NB: may not be a FungibleTokenPacketData or even JSON
  let tx: FungibleTokenPacketData;
  try {
    tx = JSON.parse(atob(data));
  } catch (e) {
    return { error: ['could not parse packet data', data] };
  }

  // given the sourceChannel check, we can be certain of this cast
  const nfa = tx.sender as NobleAddress;

  if (tx.denom !== remoteDenom) {
    const { denom: actual } = tx;
    return { error: ['unexpected denom', { actual, expected: remoteDenom }] };
  }

  let EUD;
  try {
    ({ EUD } = decodeAddressHook(tx.receiver).query);
    if (!EUD) {
      return { error: ['no EUD parameter', tx.receiver] };
    }
    if (typeof EUD !== 'string') {
      return { error: ['EUD is not a string', EUD] };
    }
  } catch (e) {
    return { error: ['no query params', tx.receiver] };
  }

  let amount: bigint;
  try {
    amount = BigInt(tx.amount);
  } catch (e) {
    return { error: ['invalid amount', tx.amount] };
  }

  return { nfa, amount, EUD };
};
harden(decodeEventPacket);

/**
 * NOTE: not meant to be parsable.
 *
 * @param {NobleAddress} addr
 * @param {bigint} amount
 */
const makeMintedEarlyKey = (addr: NobleAddress, amount: bigint): string =>
  `pendingTx:${JSON.stringify([addr, String(amount)])}`;

/** @param {Brand<'nat'>} USDC */
export const makeAdvanceDetailsShape = (USDC: Brand<'nat'>) =>
  harden({
    destination: CosmosChainAddressShape,
    forwardingAddress: M.string(),
    fullAmount: makeNatAmountShape(USDC),
    txHash: EvmHashShape,
  });

export const stateShape = harden({
  repayer: M.remotable('Repayer'),
  settlementAccount: M.remotable('Account'),
  registration: M.or(M.undefined(), M.remotable('Registration')),
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  mintedEarly: M.remotable('mintedEarly'),
  intermediateRecipient: M.opt(CosmosChainAddressShape),
});

/**
 * The Settler is responsible for monitoring (using receiveUpcall) deposits to
 * the settlementAccount. It either "disburses" funds to the Pool (if funds were
 * "advance"d to the payee), or "forwards" funds to the payee (if pool funds
 * were not advanced).
 *
 * `receiveUpcall` is configured to receive notifications in
 * `monitorMintingDeposits()`, with a call to
 * `settlementAccount.monitorTransfers()`.
 */
export const prepareSettler = (
  zone: Zone,
  {
    baggage,
    currentChainReference,
    chainHub,
    feeConfig,
    log = makeTracer('Settler', true),
    statusManager,
    USDC,
    vowTools,
    withdrawToSeat,
    zcf,
  }: {
    baggage: Baggage;
    /** e.g., `agoric-3` */
    currentChainReference: string;
    chainHub: ChainHub;
    feeConfig: FeeConfig;
    log?: LogFn;
    statusManager: StatusManager;
    USDC: Brand<'nat'>;
    vowTools: VowTools;
    withdrawToSeat: HostOf<WithdrawToSeat>;
    zcf: Pick<ZCF, 'makeEmptySeatKit' | 'atomicRearrange'>;
  },
) => {
  assertAllDefined({ statusManager });

  const supportsCctp = makeSupportsCctp(chainHub);

  /**
   * aka `IntermediateRecipientAccount`. A contract-controlled ICA on Noble that can send `MsgDepositForBurn`.
   * retrieve from baggage, until:
   * [Allow state shape with new optional fields #10200](https://github.com/Agoric/agoric-sdk/issues/10200)
   */
  const getNobleICA = (): OrchestrationAccount<{ chainId: 'noble-1' }> =>
    baggage.get(NOBLE_ICA_BAGGAGE_KEY);

  return zone.exoClassKit(
    'Fast USDC Settler',
    {
      creator: M.interface('SettlerCreatorI', {
        monitorMintingDeposits: M.callWhen().returns(M.any()),
        setIntermediateRecipient: M.call(CosmosChainAddressShape).returns(),
      }),
      tap: M.interface('SettlerTapI', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      notifier: M.interface('SettlerNotifyI', {
        notifyAdvancingResult: M.call(
          makeAdvanceDetailsShape(USDC),
          M.boolean(),
        ).returns(),
        checkMintedEarly: M.call(
          CctpTxEvidenceShape,
          CosmosChainAddressShape,
        ).returns(M.boolean()),
      }),
      self: M.interface('SettlerSelfI', {
        addMintedEarly: M.call(M.string(), M.nat()).returns(),
        disburse: M.call(EvmHashShape, M.nat()).returns(M.promise()),
        forward: M.call(EvmHashShape, M.nat(), M.string()).returns(),
      }),
      transferHandler: M.interface('SettlerTransferI', {
        onFulfilled: M.call(M.undefined(), M.string()).returns(),
        onRejected: M.call(M.error(), M.string()).returns(),
      }),
      intermediateTransferHandler: M.interface('SettlerIntermediateTransferI', {
        onFulfilled: M.call(M.undefined(), M.record()).returns(),
        onRejected: M.call(M.error(), M.record()).returns(),
      }),
      depositForBurnHandler: M.interface('SettlerDepositForBurnI', {
        onFulfilled: M.call(M.undefined(), M.string()).returns(),
        onRejected: M.call(M.error(), M.string()).returns(),
      }),
    },

    (config: {
      sourceChannel: IBCChannelID;
      remoteDenom: Denom;
      repayer: LiquidityPoolKit['repayer'];
      settlementAccount: HostInterface<
        OrchestrationAccount<{ chainId: 'agoric-any' }>
      >;
      intermediateRecipient?: CosmosChainAddress;
    }) => {
      log('config', config);
      return {
        ...config,
        // make sure the state record has this property, perhaps with an undefined value
        intermediateRecipient: config.intermediateRecipient,
        registration: undefined as
          | HostInterface<TargetRegistration>
          | undefined,
        mintedEarly: zone.detached().mapStore('mintedEarly') as MapStore<
          ReturnType<typeof makeMintedEarlyKey>,
          number
        >,
      };
    },
    {
      creator: {
        async monitorMintingDeposits() {
          const { settlementAccount } = this.state;
          const registration = await vowTools.when(
            settlementAccount.monitorTransfers(this.facets.tap),
          );
          assert.typeof(registration, 'object');
          this.state.registration = registration;
        },
        setIntermediateRecipient(intermediateRecipient: CosmosChainAddress) {
          this.state.intermediateRecipient = intermediateRecipient;
        },
      },
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          log('upcall event', event.packet.sequence, event.blockTime);
          const { sourceChannel, remoteDenom } = this.state;
          const { packet } = event;
          if (packet.source_channel !== sourceChannel) {
            const { source_channel: actual } = packet;
            log('unexpected channel', { actual, expected: sourceChannel });
            return;
          }

          const decoded = decodeEventPacket(event.packet, remoteDenom);
          if ('error' in decoded) {
            log('invalid event packet', decoded.error);
            return;
          }

          const { nfa, amount, EUD } = decoded;
          const { self } = this.facets;
          const found = statusManager.dequeueStatus(nfa, amount);
          log('dequeued', found, 'for', nfa, amount);
          switch (found?.status) {
            case PendingTxStatus.Advanced:
              return self.disburse(found.txHash, amount);

            case PendingTxStatus.Advancing:
              log('⚠️ tap: minted while advancing', nfa, amount);
              self.addMintedEarly(nfa, amount);
              return;

            case PendingTxStatus.AdvanceSkipped:
            case PendingTxStatus.AdvanceFailed:
              return self.forward(found.txHash, amount, EUD);

            case undefined:
            default:
              log('⚠️ tap: minted before observed', nfa, amount);
              // XXX consider capturing in vstorage
              // we would need a new key, as this does not have a txHash
              self.addMintedEarly(nfa, amount);
          }
        },
      },
      notifier: {
        notifyAdvancingResult(
          {
            txHash,
            forwardingAddress,
            fullAmount,
            destination,
          }: {
            txHash: EvmHash;
            forwardingAddress: NobleAddress;
            fullAmount: Amount<'nat'>;
            destination: CosmosChainAddress;
          },
          success: boolean,
        ): void {
          const { mintedEarly } = this.state;
          const { value: fullValue } = fullAmount;
          const key = makeMintedEarlyKey(forwardingAddress, fullValue);
          if (mintedEarly.has(key)) {
            asMultiset(mintedEarly).remove(key);
            statusManager.advanceOutcomeForMintedEarly(txHash, success);
            if (success) {
              void this.facets.self.disburse(txHash, fullValue);
            } else {
              void this.facets.self.forward(
                txHash,
                fullValue,
                destination.value,
              );
            }
          } else {
            statusManager.advanceOutcome(forwardingAddress, fullValue, success);
          }
        },
        /**
         * If the EUD received minted funds without an advance, forward the
         * funds to the pool.
         *
         * @param {CctpTxEvidence} evidence
         * @param {CosmosChainAddress} destination
         * @returns {boolean} whether the EUD received funds without an advance
         */
        checkMintedEarly(
          evidence: CctpTxEvidence,
          destination: CosmosChainAddress,
        ): boolean {
          const {
            tx: { forwardingAddress, amount },
            txHash,
          } = evidence;
          const key = makeMintedEarlyKey(forwardingAddress, amount);
          const { mintedEarly } = this.state;
          if (mintedEarly.has(key)) {
            log(
              'matched minted early key, initiating forward',
              forwardingAddress,
              amount,
            );
            asMultiset(mintedEarly).remove(key);
            statusManager.advanceOutcomeForUnknownMint(evidence);
            void this.facets.self.forward(txHash, amount, destination.value);
            return true;
          }
          return false;
        },
      },
      self: {
        /**
         * Helper function to track a minted-early transaction by incrementing or initializing its counter
         * @param address
         * @param amount
         */
        addMintedEarly(address: NobleAddress, amount: NatValue) {
          const key = makeMintedEarlyKey(address, amount);
          const { mintedEarly } = this.state;
          asMultiset(mintedEarly).add(key);
        },
        /**
         * The intended payee received an advance from the pool. When the funds
         * are minted, disburse them to the pool and fee seats.
         *
         * @param {EvmHash} txHash
         * @param {NatValue} fullValue
         */
        async disburse(txHash: EvmHash, fullValue: NatValue) {
          const { repayer, settlementAccount } = this.state;
          const received = AmountMath.make(USDC, fullValue);
          const { zcfSeat: settlingSeat } = zcf.makeEmptySeatKit();
          const { calculateSplit } = makeFeeTools(feeConfig);
          const split = calculateSplit(received);
          log('disbursing', split);

          // If this throws, which arguably can't occur since we don't ever
          // withdraw more than has been deposited (as denoted by
          // `FungibleTokenPacketData`), funds will remain in the
          // `settlementAccount`. A remediation can occur in a future upgrade.
          await vowTools.when(
            withdrawToSeat(
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              settlementAccount,
              settlingSeat,
              harden({ In: received }),
            ),
          );
          const transferPart = fromOnly(settlingSeat, { In: received });
          repayer.repay(transferPart, split);
          settlingSeat.exit();

          // update status manager, marking tx `DISBURSED`
          statusManager.disbursed(txHash, split);
        },
        /**
         * Funds were not advanced. Forward proceeds to the payee directly.
         *
         * @param {EvmHash} txHash
         * @param {NatValue} fullValue
         * @param {string} EUD
         */
        forward(txHash: EvmHash, fullValue: NatValue, EUD: string) {
          const { settlementAccount, intermediateRecipient } = this.state;
          log('forwarding', fullValue, 'to', EUD, 'for', txHash);
          if (!intermediateRecipient) throw Fail`No intermediate recipient`;

          const dest: AccountId | null = (() => {
            try {
              return chainHub.resolveAccountId(EUD);
            } catch (e) {
              log('⚠️ forward transfer failed!', e, txHash);
              statusManager.forwarded(txHash, false);
              return null;
            }
          })();
          if (!dest) return;

          const { namespace, reference } = parseAccountId(dest);
          const amt = AmountMath.make(USDC, fullValue);

          if (namespace === 'cosmos') {
            const transferOrSendV =
              reference === currentChainReference
                ? E(settlementAccount).send(dest, amt)
                : E(settlementAccount).transfer(dest, amt, {
                    forwardOpts: { intermediateRecipient },
                  });
            void vowTools.watch(
              transferOrSendV,
              this.facets.transferHandler,
              txHash,
            );
          } else if (supportsCctp(dest)) {
            // send to Noble then call `.depositForBurn(dest, amt)`
            void vowTools.watch(
              E(settlementAccount).transfer(intermediateRecipient, amt),
              this.facets.intermediateTransferHandler,
              { amt, dest, txHash },
            );
          } else {
            log(
              '🚨 forward not attempted!',
              'unsupported destination',
              txHash,
              dest,
            );
            statusManager.forwarded(txHash, false);
          }
        },
      },
      transferHandler: {
        onFulfilled(_result: unknown, txHash: EvmHash) {
          // update status manager, marking tx `FORWARDED` without fee split
          statusManager.forwarded(txHash, true);
        },
        onRejected(reason: unknown, txHash: EvmHash) {
          // funds remain in `settlementAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward transfer rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs to be
          // manual intervention or a code update to remediate
          statusManager.forwarded(txHash, false);
        },
      },
      intermediateTransferHandler: {
        onFulfilled(
          _result: unknown,
          {
            amt,
            dest,
            txHash,
          }: { amt: NatAmount; dest: AccountId; txHash: EvmHash },
        ) {
          const nobleIca = getNobleICA();
          void vowTools.watch(
            E(nobleIca).depositForBurn(dest, amt),
            this.facets.depositForBurnHandler,
            txHash,
          );
        },
        onRejected(
          reason: unknown,
          { txHash }: { amt: NatAmount; dest: AccountId; txHash: EvmHash },
        ) {
          // funds remain in `settlementAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward intermediate transfer rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs manual
          // intervention or a code update to remediate
          statusManager.forwarded(txHash, false);
        },
      },
      depositForBurnHandler: {
        onFulfilled(_result: unknown, txHash: EvmHash) {
          // update status manager, marking tx `FORWARDED` without fee split
          statusManager.forwarded(txHash, true);
        },
        onRejected(reason: unknown, txHash: EvmHash) {
          // funds remain in `nobleAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward depositForBurn rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs manual
          // intervention or a code update to remediate
          statusManager.forwarded(txHash, false);
        },
      },
    },
    {
      stateShape,
    },
  );
};
harden(prepareSettler);

// Expose the whole kit because the contract needs `creatorFacet` and the Advancer needs `notifier`
export type SettlerKit = ReturnType<ReturnType<typeof prepareSettler>>;
