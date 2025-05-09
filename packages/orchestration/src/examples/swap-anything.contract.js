import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as sharedFlows from './shared.flows.js';
import { swapIt } from './swap-anything.flows.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';

const trace = makeTracer('SwapAnything.Contract');

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
 * Swap assets that are currently in an ERTP purse against another cosmos asset
 * by using an Osmosis pool then have the swap output routed to any address
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
  const log = (msg, level = 'info') =>
    vowTools.watch(E(logNode).setValue(JSON.stringify({ msg, level })));

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

  void vowTools.when(sharedLocalAccountP, async sharedLocalAccount => {
    const encoded = await E(privateArgs.marshaller).toCapData({
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
