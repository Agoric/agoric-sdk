/** @file Orchestration service */

import { Fail } from '@agoric/assert';
import { pickFacet } from '@agoric/vat-data';
import { prepareOrchestratorKit } from './exos/orchestrator.js';

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
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from './types.js';
 * @import {MakeLocalChainFacade} from './exos/local-chain-facade.js';
 * @import {MakeRemoteChainFacade} from './exos/remote-chain-facade.js';
 * @import {MakeLocalOrchestrationAccountKit} from './exos/local-orchestration-account.js';
 */

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
 *   vowTools: VowTools;
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
  vowTools,
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

  const makeOrchestratorKit = prepareOrchestratorKit(zone, {
    asyncFlowTools,
    chainHub,
    localchain,
    makeRecorderKit,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    orchestrationService,
    storageNode,
    timerService,
    vowTools,
    zcf,
  });
  const makeOrchestrator = pickFacet(makeOrchestratorKit, 'orchestrator');

  return {
    /**
     * @template Return
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {Context} ctx - values to pass through the async flow membrane
     * @param {(
     *   orc: Orchestrator,
     *   ctx2: Context,
     *   ...args: Args
     * ) => Promise<Return>} fn
     * @returns {(...args: Args) => Promise<Return>}
     */
    orchestrate(durableName, ctx, fn) {
      const orc = makeOrchestrator();

      return async (...args) => vowTools.when(fn(orc, ctx, ...args));
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
