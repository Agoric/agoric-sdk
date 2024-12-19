import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { ChainAddressShape } from '@agoric/orchestration';
import { atob } from '@endo/base64';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { PendingTxStatus } from '../constants.js';
import { makeFeeTools } from '../utils/fees.js';
import { EvmHashShape, makeNatAmountShape } from '../type-guards.js';

/**
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Denom, OrchestrationAccount, ChainHub, ChainAddress} from '@agoric/orchestration';
 * @import {WithdrawToSeat} from '@agoric/orchestration/src/utils/zoe-tools'
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {HostOf, HostInterface} from '@agoric/async-flow';
 * @import {TargetRegistration} from '@agoric/vats/src/bridge-target.js';
 * @import {NobleAddress, LiquidityPoolKit, FeeConfig, EvmHash, LogFn} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 */

/**
 * NOTE: not meant to be parsable.
 *
 * @param {NobleAddress} addr
 * @param {bigint} amount
 */
const makeMintedEarlyKey = (addr, amount) =>
  `pendingTx:${JSON.stringify([addr, String(amount)])}`;

/** @param {Brand<'nat'>} USDC */
export const makeAdvanceDetailsShape = USDC =>
  harden({
    destination: ChainAddressShape,
    forwardingAddress: M.string(),
    fullAmount: makeNatAmountShape(USDC),
    txHash: EvmHashShape,
  });

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {StatusManager} caps.statusManager
 * @param {Brand<'nat'>} caps.USDC
 * @param {Pick<ZCF, 'makeEmptySeatKit' | 'atomicRearrange'>} caps.zcf
 * @param {FeeConfig} caps.feeConfig
 * @param {HostOf<WithdrawToSeat>} caps.withdrawToSeat
 * @param {import('@agoric/vow').VowTools} caps.vowTools
 * @param {ChainHub} caps.chainHub
 * @param {LogFn} [caps.log]
 */
export const prepareSettler = (
  zone,
  {
    chainHub,
    feeConfig,
    log = makeTracer('Settler', true),
    statusManager,
    USDC,
    vowTools,
    withdrawToSeat,
    zcf,
  },
) => {
  assertAllDefined({ statusManager });
  return zone.exoClassKit(
    'Fast USDC Settler',
    {
      creator: M.interface('SettlerCreatorI', {
        monitorMintingDeposits: M.callWhen().returns(M.any()),
        setIntermediateRecipient: M.call(ChainAddressShape).returns(),
      }),
      tap: M.interface('SettlerTapI', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      notify: M.interface('SettlerNotifyI', {
        notifyAdvancingResult: M.call(
          makeAdvanceDetailsShape(USDC),
          M.boolean(),
        ).returns(),
      }),
      self: M.interface('SettlerSelfI', {
        disburse: M.call(EvmHashShape, M.nat()).returns(M.promise()),
        forward: M.call(EvmHashShape, M.nat(), M.string()).returns(),
      }),
      transferHandler: M.interface('SettlerTransferI', {
        onFulfilled: M.call(M.undefined(), M.string()).returns(),
        onRejected: M.call(M.error(), M.string()).returns(),
      }),
    },
    /**
     * @param {{
     *   sourceChannel: IBCChannelID;
     *   remoteDenom: Denom;
     *   repayer: LiquidityPoolKit['repayer'];
     *   settlementAccount: HostInterface<OrchestrationAccount<{ chainId: 'agoric' }>>
     *   intermediateRecipient?: ChainAddress;
     * }} config
     */
    config => {
      log('config', config);
      return {
        ...config,
        // make sure the state record has this property, perhaps with an undefined value
        intermediateRecipient: config.intermediateRecipient,
        /** @type {HostInterface<TargetRegistration>|undefined} */
        registration: undefined,
        /** @type {SetStore<ReturnType<typeof makeMintedEarlyKey>>} */
        mintedEarly: zone.detached().setStore('mintedEarly'),
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
        /** @param {ChainAddress} intermediateRecipient */
        setIntermediateRecipient(intermediateRecipient) {
          this.state.intermediateRecipient = intermediateRecipient;
        },
      },
      tap: {
        /** @param {VTransferIBCEvent} event */
        async receiveUpcall(event) {
          log('upcall event', event.packet.sequence, event.blockTime);
          const { sourceChannel, remoteDenom } = this.state;
          const { packet } = event;
          if (packet.source_channel !== sourceChannel) {
            const { source_channel: actual } = packet;
            log('unexpected channel', { actual, expected: sourceChannel });
            return;
          }

          // TODO: why is it safe to cast this without a runtime check?
          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(packet.data))
          );

          // given the sourceChannel check, we can be certain of this cast
          const nfa = /** @type {NobleAddress} */ (tx.sender);

          if (tx.denom !== remoteDenom) {
            const { denom: actual } = tx;
            log('unexpected denom', { actual, expected: remoteDenom });
            return;
          }

          let EUD;
          try {
            ({ EUD } = decodeAddressHook(tx.receiver).query);
            if (!EUD) {
              log('no EUD parameter', tx.receiver);
              return;
            }
            if (typeof EUD !== 'string') {
              log('EUD is not a string', EUD);
              return;
            }
          } catch (e) {
            log('no query params', tx.receiver);
            return;
          }

          const amount = BigInt(tx.amount); // TODO: what if this throws?

          const { self } = this.facets;
          const found = statusManager.dequeueStatus(nfa, amount);
          log('dequeued', found, 'for', nfa, amount);
          switch (found?.status) {
            case PendingTxStatus.Advanced:
              return self.disburse(found.txHash, amount);

            case PendingTxStatus.Advancing:
              log('⚠️ tap: minted while advancing', nfa, amount);
              this.state.mintedEarly.add(makeMintedEarlyKey(nfa, amount));
              return;

            case PendingTxStatus.Observed:
            case PendingTxStatus.AdvanceFailed:
              return self.forward(found.txHash, amount, EUD);

            case undefined:
            default:
              log('⚠️ tap: no status for ', nfa, amount);
          }
        },
      },
      notify: {
        /**
         * @param {object} ctx
         * @param {EvmHash} ctx.txHash
         * @param {NobleAddress} ctx.forwardingAddress
         * @param {Amount<'nat'>} ctx.fullAmount
         * @param {ChainAddress} ctx.destination
         * @param {boolean} success
         * @returns {void}
         */
        notifyAdvancingResult(
          { txHash, forwardingAddress, fullAmount, destination },
          success,
        ) {
          const { mintedEarly } = this.state;
          const { value: fullValue } = fullAmount;
          // XXX i think this only contains Advancing txs - should this be a separate store?
          const key = makeMintedEarlyKey(forwardingAddress, fullValue);
          if (mintedEarly.has(key)) {
            mintedEarly.delete(key);
            if (success) {
              // TODO: does not write `ADVANCED` to vstorage
              // this is the "slow" experience, but we've already earmarked fees so disburse
              void this.facets.self.disburse(txHash, fullValue);
            } else {
              // TODO: does not write `ADVANCE_FAILED` to vstorage
              // if advance fails, attempt to forward (no fees)
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
      },
      self: {
        /**
         * @param {EvmHash} txHash
         * @param {NatValue} fullValue
         */
        async disburse(txHash, fullValue) {
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
          zcf.atomicRearrange(
            harden([[settlingSeat, settlingSeat, { In: received }, split]]),
          );
          repayer.repay(settlingSeat, split);

          // update status manager, marking tx `DISBURSED`
          statusManager.disbursed(txHash, split);
        },
        /**
         * @param {EvmHash} txHash
         * @param {NatValue} fullValue
         * @param {string} EUD
         */
        forward(txHash, fullValue, EUD) {
          const { settlementAccount, intermediateRecipient } = this.state;

          const dest = chainHub.makeChainAddress(EUD);

          // TODO? statusManager.forwarding(txHash, sender, amount);
          const txfrV = E(settlementAccount).transfer(
            dest,
            AmountMath.make(USDC, fullValue),
            { forwardOpts: { intermediateRecipient } },
          );
          void vowTools.watch(txfrV, this.facets.transferHandler, txHash);
        },
      },
      transferHandler: {
        /**
         * @param {unknown} _result
         * @param {EvmHash} txHash
         */
        onFulfilled(_result, txHash) {
          statusManager.forwarded(txHash);
        },
        /**
         * @param {unknown} reason
         * @param {EvmHash} txHash
         */
        onRejected(reason, txHash) {
          log('⚠️ transfer rejected!', reason, txHash);
          // TODO(#10510): statusManager.forwardFailed(txHash, nfa, amount);
        },
      },
    },
    {
      stateShape: harden({
        repayer: M.remotable('Repayer'),
        settlementAccount: M.remotable('Account'),
        registration: M.or(M.undefined(), M.remotable('Registration')),
        sourceChannel: M.string(),
        remoteDenom: M.string(),
        mintedEarly: M.remotable('mintedEarly'),
        intermediateRecipient: M.opt(ChainAddressShape),
      }),
    },
  );
};
harden(prepareSettler);

/**
 * XXX consider using pickFacet (do we have pickFacets?)
 * @typedef {ReturnType<ReturnType<typeof prepareSettler>>} SettlerKit
 */
