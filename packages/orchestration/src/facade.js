/** @file Orchestration service */

import { Fail } from '@agoric/assert';

import { prepareOrchestrator } from './exos/orchestrator.js';

/**
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationFnDef, Orchestrator} from './types.js';
 * @import {MakeLocalChainFacade} from './exos/local-chain-facade.js';
 * @import {MakeRemoteChainFacade} from './exos/remote-chain-facade.js';
 * @import {MakeLocalOrchestrationAccountKit} from './exos/local-orchestration-account.js';
 */

/**
 * @type {(
 *   durableName: OrchestrationFnDef[0],
 *   fn: OrchestrationFnDef[1],
 * ) => OrchestrationFnDef}
 */
export const makeOrchestrationFnDef = (durableName, fn) => {
  return [durableName, fn];
};

/**
 * @param {{
 *   zone: Zone;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 *   storageNode: Remote<StorageNode>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   localchain: Remote<LocalChain>;
 *   chainHub: import('./exos/chain-hub.js').ChainHub;
 *   makeLocalOrchestrationAccountKit: MakeLocalOrchestrationAccountKit;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeCosmosOrchestrationAccount: any;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   asyncFlowTools: AsyncFlowTools;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  localchain,
  chainHub,
  makeLocalOrchestrationAccountKit,
  makeRecorderKit,
  makeLocalChainFacade,
  makeRemoteChainFacade,
  asyncFlowTools,
}) => {
  (zone &&
    timerService &&
    zcf &&
    storageNode &&
    orchestrationService &&
    // @ts-expect-error type says defined but double check
    makeLocalOrchestrationAccountKit &&
    // @ts-expect-error type says defined but double check
    makeRecorderKit &&
    // @ts-expect-error type says defined but double check
    makeRemoteChainFacade &&
    asyncFlowTools) ||
    Fail`params missing`;

  const makeOrchestrator = prepareOrchestrator(zone, {
    asyncFlowTools,
    chainHub,
    localchain,
    makeRecorderKit,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    orchestrationService,
    storageNode,
    timerService,
    zcf,
  });

  return {
    /**
     * Orchestrate the arguments with the given flow function.
     *
     * @template Context
     * @template {any[]} Args
     * @param {Context} ctx - values to pass through the async flow membrane
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {(orc: Orchestrator, ctx2: Context, ...args: Args) => object} fn
     * @returns {(...args: Args) => Promise<unknown>}
     */
    orchestrate(ctx, durableName, fn) {
      const orc = makeOrchestrator();

      return async (...args) => fn(orc, ctx, ...args);
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
