import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { PendingTxStatus } from '../constants.js';
import { addressTools } from '../utils/address.js';
import { makeFeeTools } from '../utils/fees.js';
import { EvmHashShape } from '../type-guards.js';

/**
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Denom, OrchestrationAccount, ChainHub} from '@agoric/orchestration';
 * @import {WithdrawToSeat} from '@agoric/orchestration/src/utils/zoe-tools'
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {HostOf, HostInterface} from '@agoric/async-flow';
 * @import {TargetRegistration} from '@agoric/vats/src/bridge-target.js';
 * @import {NobleAddress, LiquidityPoolKit, FeeConfig, EvmHash} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 */

const trace = makeTracer('Settler');

/**
 * NOTE: not meant to be parsable.
 *
 * @param {NobleAddress} addr
 * @param {bigint} amount
 */
const makeMintedEarlyKey = (addr, amount) =>
  `pendingTx:${JSON.stringify([addr, String(amount)])}`;

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
 */
export const prepareSettler = (
  zone,
  { statusManager, USDC, zcf, feeConfig, withdrawToSeat, vowTools, chainHub },
) => {
  assertAllDefined({ statusManager });
  return zone.exoClassKit(
    'Fast USDC Settler',
    {
      creator: M.interface('SettlerCreatorI', {
        monitorMintingDeposits: M.callWhen().returns(M.any()),
      }),
      tap: M.interface('SettlerTapI', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      notify: M.interface('SettlerNotifyI', {
        notifyAdvancingResult: M.call(
          M.string(),
          M.nat(),
          M.boolean(),
        ).returns(),
      }),
      self: M.interface('SettlerSelfI', {
        disburse: M.call(EvmHashShape, M.string(), M.nat()).returns(
          M.promise(),
        ),
        forward: M.call(
          M.opt(EvmHashShape),
          M.string(),
          M.nat(),
          M.string(),
        ).returns(),
      }),
      transferHandler: M.interface('SettlerTransferI', {
        onFulfilled: M.call(M.any(), M.record()).returns(),
        onRejected: M.call(M.any(), M.record()).returns(),
      }),
    },
    /**
     * @param {{
     *   sourceChannel: IBCChannelID;
     *   remoteDenom: Denom;
     *   repayer: LiquidityPoolKit['repayer'];
     *   settlementAccount: HostInterface<OrchestrationAccount<{ chainId: 'agoric' }>>
     * }} config
     */
    config => {
      return {
        ...config,
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
      },
      tap: {
        /** @param {VTransferIBCEvent} event */
        async receiveUpcall(event) {
          const { sourceChannel, remoteDenom } = this.state;
          const { packet } = event;
          if (packet.source_channel !== sourceChannel) {
            const { source_channel: actual } = packet;
            trace('unexpected channel', { actual, expected: sourceChannel });
            return;
          }

          // TODO: why is it safe to cast this without a runtime check?
          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(packet.data))
          );

          // given the sourceChannel check, we can be certain of this cast
          const sender = /** @type {NobleAddress} */ (tx.sender);

          if (tx.denom !== remoteDenom) {
            const { denom: actual } = tx;
            trace('unexpected denom', { actual, expected: remoteDenom });
            return;
          }

          if (!addressTools.hasQueryParams(tx.receiver)) {
            console.log('not query params', tx.receiver);
            return;
          }

          const { EUD } = addressTools.getQueryParams(tx.receiver);
          if (!EUD) {
            console.log('no EUD parameter', tx.receiver);
            return;
          }

          const amount = BigInt(tx.amount); // TODO: what if this throws?

          const { self } = this.facets;
          const found = statusManager.dequeueStatus(sender, amount);
          trace('dequeued', found, 'for', sender, amount);
          switch (found?.status) {
            case PendingTxStatus.Advanced:
              return self.disburse(found.txHash, sender, amount);

            case PendingTxStatus.Advancing:
              this.state.mintedEarly.add(makeMintedEarlyKey(sender, amount));
              return;

            case undefined:
            case PendingTxStatus.Observed:
            case PendingTxStatus.AdvanceFailed:
            default:
              return self.forward(found?.txHash, sender, amount, EUD);
          }
        },
      },
      notify: {
        /**
         * @param {EvmHash} txHash
         * @param {NobleAddress} sender
         * @param {NatValue} amount
         * @param {string} EUD
         * @param {boolean} success
         * @returns {void}
         */
        notifyAdvancingResult(txHash, sender, amount, EUD, success) {
          const { mintedEarly } = this.state;
          const key = makeMintedEarlyKey(sender, amount);
          if (mintedEarly.has(key)) {
            mintedEarly.delete(key);
            if (success) {
              void this.facets.self.disburse(txHash, sender, amount);
            } else {
              void this.facets.self.forward(txHash, sender, amount, EUD);
            }
          } else {
            statusManager.advanceOutcome(sender, amount, success);
          }
        },
      },
      self: {
        /**
         * @param {EvmHash} txHash
         * @param {NobleAddress} sender
         * @param {NatValue} amount
         */
        async disburse(txHash, sender, amount) {
          const { repayer, settlementAccount } = this.state;
          const received = AmountMath.make(USDC, amount);
          const { zcfSeat: settlingSeat } = zcf.makeEmptySeatKit();
          const { calculateSplit } = makeFeeTools(feeConfig);
          const split = calculateSplit(received);
          trace('disbursing', split);

          // TODO: what if this throws?
          // arguably, it cannot. Even if deposits
          // and notifications get out of order,
          // we don't ever withdraw more than has been deposited.
          await vowTools.when(
            withdrawToSeat(
              // @ts-expect-error Vow vs. Promise stuff. TODO: is this OK???
              settlementAccount,
              settlingSeat,
              harden({ In: received }),
            ),
          );
          zcf.atomicRearrange(
            harden([[settlingSeat, settlingSeat, { In: received }, split]]),
          );
          repayer.repay(settlingSeat, split);

          // update status manager, marking tx `SETTLED`
          statusManager.disbursed(txHash);
        },
        /**
         * @param {EvmHash | undefined} txHash
         * @param {NobleAddress} sender
         * @param {NatValue} amount
         * @param {string} EUD
         */
        forward(txHash, sender, amount, EUD) {
          const { settlementAccount } = this.state;

          const dest = chainHub.makeChainAddress(EUD);

          // TODO? statusManager.forwarding(txHash, sender, amount);
          const txfrV = E(settlementAccount).transfer(
            dest,
            AmountMath.make(USDC, amount),
          );
          void vowTools.watch(txfrV, this.facets.transferHandler, {
            txHash,
            sender,
            amount,
          });
        },
      },
      transferHandler: {
        /**
         * @param {unknown} _result
         * @param {SettlerTransferCtx} ctx
         *
         * @typedef {{
         *   txHash: EvmHash;
         *   sender: NobleAddress;
         *   amount: NatValue;
         * }} SettlerTransferCtx
         */
        onFulfilled(_result, ctx) {
          const { txHash, sender, amount } = ctx;
          statusManager.forwarded(txHash, sender, amount);
        },
        /**
         * @param {unknown} reason
         * @param {SettlerTransferCtx} ctx
         */
        onRejected(reason, ctx) {
          trace('transfer rejected!', reason, ctx);
          // const { txHash, sender, amount } = ctx;
          // TODO: statusManager.forwardFailed(txHash, sender, amount);
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
      }),
    },
  );
};
harden(prepareSettler);

/**
 * XXX consider using pickFacet (do we have pickFacets?)
 * @typedef {ReturnType<ReturnType<typeof prepareSettler>>} SettlerKit
 */
