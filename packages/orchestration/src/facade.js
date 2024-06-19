/** @file Orchestration service */

import { Fail } from '@agoric/assert';
import { V } from '@agoric/vow/vat.js';
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

  const asyncFlow = asyncFlowTools.asyncFlow;

  const makeOrchestrator = prepareOrchestrator(zone, {
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

  return {
    /**
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {Context} ctx - values to pass through the async flow membrane
     * @param {(orc: Orchestrator, ctx2: Context, ...args: Args) => object} orchFn
     * @returns {(...args: Args) => Promise<unknown>}
     */
    orchestrate(durableName, ctx, orchFn) {
      // This portion happens once to prepare the method/function that gets orchestrated

      const subzone = zone.subZone(durableName);
      // TODO: create durable exo wrappers for ctx props
      const ctxKit = harden({}); // makeDurableCtxKit(ctx);
      const asyncFlowGuestFunc = async (flowSupportKit, ...args) => {
        // This runs inside the asyncFlow
        // TODO: Add support for recreating a `this` exo class context
        const exoContext = undefined;
        // TODO: Get orc from `flowSupportKit` once it's made durable
        const orcArg = flowSupportKit.orc;
        // TODO: build ctx from a durable skeleton using `flowSupportKit`
        // TODO: make context facade
        // const ctxArg = makeContextFacade(flowSupportKit.ctxKit);
        const ctxArg = ctx;
        return Reflect.apply(orchFn, exoContext, [orcArg, ctxArg, ...args]);
      };
      const asyncFlowHostFn = asyncFlow(
        subzone,
        'asyncFlow',
        asyncFlowGuestFunc,
      );
      // Make a function that will accept a `this` argument, but that does not allow `construction` (e.g., the `new` operator)
      // This runs outside the asaync flow. It process those arguments to pass them into the async flow
      return harden(
        {
          [durableName](...args) {
            // This happens on every invocation
            // TODO: Build the needed durable objects
            const orcKit = makeOrchestrator(); // internalMakeOrchestratorKit();
            // TODO: plumb the necessary ingredients to reconstruct a `this` exo context inside the guest
            return V.when(
              asyncFlowHostFn({ orc: orcKit.orchestrator, ctxKit }, ...args),
            );
          },
        }[durableName],
      );
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
