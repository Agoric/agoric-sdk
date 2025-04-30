import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as sharedFlows from './shared.flows.js';
import { swapIt, swapAnythingViaHook } from './swap-anything.flows.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';

const trace = makeTracer('SwapAnything.Contract');

const interfaceTODO = undefined;

/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 */

export const SingleNatAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, { numPropertiesLimit: 1 }),
  M.not(harden({})),
);
harden(SingleNatAmountRecord);

/**
 * Send assets currently in an ERTP purse to an account on another chain. This
 * currently supports IBC and CCTP transfers. It could eventually support other
 * protocols, like Axelar GMP or IBC Eureka.
 *
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   chainInfo?: Record<string, CosmosChainInfo>;
 *   marshaller: Marshaller;
 *   storageNode: Remote<StorageNode>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (
  zcf,
  privateArgs,
  zone,
  { chainHub, orchestrate, vowTools, zoeTools },
) => {
  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = msg => vowTools.watch(E(logNode).setValue(msg));

  const makeLocalAccount = orchestrate(
    'makeLocalAccount',
    {},
    sharedFlows.makeLocalAccount,
  );

  /**
   * @type {any} sharedLocalAccountP expects a Promise but this is a vow UNTIL
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
    makeLocalAccount(),
  );

  const swapAnythingOffer = orchestrate(
    'swapAnything',
    { chainHub, sharedLocalAccountP, log, zoeTools },
    swapIt,
  );

  const swapAnythingAddressHook = orchestrate(
    'swapAnythingViaHook',
    {
      chainHub,
      sharedLocalAccountP,
      log,
    },
    swapAnythingViaHook,
  );

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    return zone.exo('tap', interfaceTODO, {
      /*
       * @param {import('@agoric/vats').VTransferIBCEvent} event
       */
      async receiveUpcall(event) {
        await null;
        console.log('receiveUpcall', event);
        /**
         * Extract the incoming packet data.
         *
         * @type {import('@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js').FungibleTokenPacketData}
         */
        const {
          amount,
          denom,
          receiver: origReceiver,
        } = JSON.parse(atob(event.packet.data));

        trace({ amount, denom, origReceiver });

        const { baseAddress, query } = decodeAddressHook(origReceiver);

        /**
         * @type {{
         *   destAddr: string;
         *   receiverAddr: string;
         *   outDenom: string;
         * }}
         */
        // @ts-expect-error
        const { destAddr, receiverAddr, outDenom } = query;

        trace({
          baseAddress,
          destAddr,
          receiverAddr,
          outDenom,
        });

        if (!receiverAddr || !destAddr || !outDenom) return;
        // Invoke the flow to perform swap and end up at the final destination.
        return swapAnythingAddressHook(
          { denom, amount },
          {
            destAddr,
            receiverAddr,
            outDenom,
            onFailedDelivery: 'do_nothing',
            slippage: {
              slippagePercentage: '20',
              windowSeconds: 10,
            },
          },
        );
      },
    });
  });

  void vowTools.when(sharedLocalAccountP, async sharedLocalAccount => {
    sharedLocalAccount.monitorTransfers(tap);
    const encoded = await E(privateArgs.marshaller).toCapData({
      sharedLocalAccount: sharedLocalAccount.getAddress(),
    });
    void E(privateArgs.storageNode).setValue(JSON.stringify(encoded));
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      makeSendInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendInvitation() {
        return zcf.makeInvitation(
          swapAnythingOffer,
          'swap',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
    },
  );

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract, { publishAccountInfo: true });
harden(start);
