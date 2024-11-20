import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { PendingTxStatus } from '../constants.js';
import { addressTools } from '../utils/address.js';
import { makeFeeTools } from '../utils/fees.js';

/**
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Denom, OrchestrationAccount, LocalAccountMethods, ChainHub} from '@agoric/orchestration';
 * @import {WithdrawToSeat} from '@agoric/orchestration/src/utils/zoe-tools'
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {HostOf, HostInterface} from '@agoric/async-flow';
 * @import {TargetRegistration} from '@agoric/vats/src/bridge-target.js';
 * @import {NobleAddress, LiquidityPoolKit, FeeConfig} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 */

const trace = makeTracer('Settler');

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
      monitorTransfers: M.callWhen().returns(M.any()),
      receiveUpcall: M.call(M.record()).returns(M.promise()),
      settleSansFees: M.call(M.string(), M.string(), M.nat()).returns(
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
      };
    },
    {
      async monitorTransfers() {
        const { settlementAccount } = this.state;
        const registration = await vowTools.when(
          settlementAccount.monitorTransfers(this.self),
        );
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

        const amountInt = BigInt(tx.amount); // TODO: what if this throws?

        if (!statusManager.hasPendingSettlement(sender, amountInt)) {
          // TODO FAILURE PATH -> put money in recovery account or .transfer to receiver
          // TODO should we have an ORPHANED TxStatus for this?
          throw makeError(
            `🚨 No pending settlement found for ${q(tx.sender)} ${q(tx.amount)}`,
          );
        }

        const pending = statusManager.lookupPending(sender, amountInt);
        if (pending.find(it => it.status === PendingTxStatus.Observed)) {
          return this.self.settleSansFees(sender, EUD, amountInt);
        }

        // Disperse funds

        const { repayer, settlementAccount } = this.state;
        const received = AmountMath.make(USDC, amountInt);
        const { zcfSeat: settlingSeat } = zcf.makeEmptySeatKit();
        const { calculateSplit } = makeFeeTools(feeConfig);
        const split = calculateSplit(received);
        trace('dispersing', split);

        // TODO: what if this throws?
        // arguably, it cannot. Even if deposits
        // and notifications get out of order,
        // we don't ever withdraw more than has been deposited.
        await vowTools.when(
          withdrawToSeat(
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
        statusManager.settle(sender, amountInt);
      },
      /**
       * @param {NobleAddress} sender
       * @param {string} EUD
       * @param {bigint} amountInt
       */
      async settleSansFees(sender, EUD, amountInt) {
        const { settlementAccount } = this.state;

        const dest = chainHub.makeChainAddress(EUD);

        const txfrV = E(settlementAccount).transfer(
          dest,
          AmountMath.make(USDC, amountInt),
        );
        await vowTools.when(txfrV); // TODO: watch, handle failure

        statusManager.settle(sender, amountInt);
      },
    },
    {
      stateShape: harden({
        repayer: M.remotable('Repayer'),
        settlementAccount: M.remotable('Account'),
        registration: M.or(M.undefined(), M.remotable('Registration')),
        sourceChannel: M.string(),
        remoteDenom: M.string(),
      }),
    },
  );
};
harden(prepareSettler);
