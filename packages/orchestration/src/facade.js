/** @file Orchestration service */

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {OrchestrationService} from './service.js';
 * @import {Orchestrator} from './types.js';
 */

/**
 *
 * @param {{
 *   zone: Zone;
 *   timerService: ERef<TimerService>;
 *   zcf: ERef<ZCF>;
 *   storageNode: ERef<StorageNode>;
 *   orchestrationService: ERef<OrchestrationService>;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
}) => {
  console.log('makeOrchestrationFacade got', {
    zone,
    timerService,
    zcf,
    storageNode,
    orchestrationService,
  });

  return {
    /**
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName
     * @param {Context} ctx
     * @param {(orc: Orchestrator, ctx2: Context, ...args: Args) => object} fn
     * @returns {(...args: Args) => Promise<unknown>}
     */
    orchestrate(durableName, ctx, fn) {
      console.log('orchestrate got', durableName, ctx, fn);
      throw new Error('Not yet implemented');
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
