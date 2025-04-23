import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as sharedFlows from './shared.flows.js';
import { swapIt } from './swap-anything.flows.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';

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

  const swapAnything = orchestrate(
    'swapAnything',
    { chainHub, sharedLocalAccountP, log, zoeTools },
    swapIt,
  );

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      makeSendInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendInvitation() {
        return zcf.makeInvitation(
          swapAnything,
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
