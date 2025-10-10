import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { wrapRemoteMarshaller } from '@agoric/internal/src/marshal.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as sharedFlows from './shared.flows.js';
import { swapAnythingViaHook, swapIt } from './swap-anything.flows.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';

const trace = makeTracer('SwapAnything.Contract');
const interfaceTODO = undefined;
/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail, OrchestrationAccount} from '@agoric/orchestration';
 */

export const SingleNatAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, { numPropertiesLimit: 1 }),
  M.not(harden({})),
);
harden(SingleNatAmountRecord);

/**
 * Swap assets that are currently in an ERTP purse against another cosmos asset
 * by using an Osmosis pool then have the swap output routed to any address
 *
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   chainInfo?: Record<string, CosmosChainInfo>;
 *   marshaller: Remote<Marshaller>;
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

  /**
   * @type {OrchestrationAccount<{ chainId: 'agoric' }>} ;
   */
  let sharedLocalAccount;

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = (msg, level = 'info') =>
    vowTools.watch(E(logNode).setValue(JSON.stringify({ msg, level })));

  const { marshaller: remoteMarshaller } = privateArgs;
  const cachingMarshaller = wrapRemoteMarshaller(remoteMarshaller);

  const makeLocalAccount = orchestrate(
    'makeLocalAccount',
    {},
    sharedFlows.makeLocalAccount,
  );

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
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
      /**
       * @param {import('@agoric/vats').VTransferIBCEvent} event
       */
      async receiveUpcall(event) {
        await null;
        trace('receiveUpcall', event);

        if (event.event !== 'writeAcknowledgement') return;
        trace('Moving on...');

        const {
          amount,
          extra: { receiver: origReceiver },
        } = await vowTools.when(
          E(sharedLocalAccount).parseInboundTransfer(event.packet),
        );

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
        return swapAnythingAddressHook(amount, {
          destAddr,
          receiverAddr,
          outDenom, // swapOutDenom
          onFailedDelivery: 'do_nothing',
          slippage: {
            slippagePercentage: '20',
            windowSeconds: 10,
          },
        });
      },
    });
  });

  void vowTools.when(sharedLocalAccountP, async lca => {
    sharedLocalAccount = lca;
    await sharedLocalAccount.monitorTransfers(tap);
    const encoded = await E(cachingMarshaller).toCapData({
      sharedLocalAccount: sharedLocalAccount.getAddress(),
    });
    void E(privateArgs.storageNode).setValue(JSON.stringify(encoded));
    trace('Localchain account information published', encoded);
  });

  const publicFacet = zone.exo(
    'Swap Anything PF',
    M.interface('Swap Anything PF', {
      makeSwapInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSwapInvitation() {
        return zcf.makeInvitation(
          swapAnythingOffer,
          'swap',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract, { publishAccountInfo: true });
harden(start);
