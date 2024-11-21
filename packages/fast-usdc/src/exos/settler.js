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
 * @import {Denom, OrchestrationAccount, LocalAccountMethods, ChainHub} from '@agoric/orchestration';
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
  return zone.exoClass(
    'Fast USDC Settler',
    M.interface('SettlerI', {
      monitorMintingDeposits: M.callWhen().returns(M.any()),
      receiveUpcall: M.call(M.record()).returns(M.promise()),
      notifyAdvancingResult: M.call(M.string(), M.nat(), M.boolean()).returns(),
      disburse: M.call(EvmHashShape, M.string(), M.nat()).returns(M.promise()),
      forward: M.call(EvmHashShape, M.string(), M.nat(), M.string()).returns(
        M.promise(),
      ),
    }),
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
      async monitorMintingDeposits() {
        const { settlementAccount } = this.state;
        const registration = await vowTools.when(
          settlementAccount.monitorTransfers(this.self),
        );
        assert.typeof(registration, 'object');
        this.state.registration = registration;
      },
      /** @param {VTransferIBCEvent} event */
      async receiveUpcall(event) {
        if (event.packet.source_channel !== this.state.sourceChannel) {
          // TODO #10390 log all early returns
          // only interested in packets from the issuing chain
          return;
        }

        // TODO: why is it safe to cast this without a runtime check?
        const tx = /** @type {FungibleTokenPacketData} */ (
          JSON.parse(atob(event.packet.data))
        );

        // given the sourceChannel check, we can be certain of this cast
        const sender = /** @type {NobleAddress} */ (tx.sender);

        if (tx.denom !== this.state.remoteDenom) {
          // only interested in uusdc
          return;
        }

        if (!addressTools.hasQueryParams(tx.receiver)) {
          // only interested in receivers with query params
          return;
        }

        const { EUD } = addressTools.getQueryParams(tx.receiver);
        if (!EUD) {
          // only interested in receivers with EUD parameter
          return;
        }

        const amount = BigInt(tx.amount); // TODO: what if this throws?

        const found = statusManager.dequeueStatus(sender, amount);
        switch (found?.status) {
          case undefined:
          case PendingTxStatus.Observed:
            return this.self.forward(found?.txHash, sender, amount, EUD);

          case PendingTxStatus.Advancing:
            this.state.mintedEarly.add(makeMintedEarlyKey(sender, amount));
            return;

          case PendingTxStatus.Advanced:
            return this.self.disburse(found.txHash, sender, amount);

          default:
            throw Error('TODO: think harder');
        }
      },
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
            void this.self.disburse(txHash, sender, amount);
          } else {
            void this.self.forward(txHash, sender, amount, EUD);
          }
        } else {
          statusManager.advanceOutcome(sender, amount, success);
        }
      },
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
        statusManager.disbursed(txHash, sender, amount);
      },
      /**
       * @param {EvmHash | undefined} txHash
       * @param {NobleAddress} sender
       * @param {NatValue} amount
       * @param {string} EUD
       */
      async forward(txHash, sender, amount, EUD) {
        const { settlementAccount } = this.state;

        const dest = chainHub.makeChainAddress(EUD);

        const txfrV = E(settlementAccount).transfer(
          dest,
          AmountMath.make(USDC, amount),
        );
        await vowTools.when(txfrV); // TODO: watch, handle failure

        statusManager.forwarded(txHash, sender, amount);
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
