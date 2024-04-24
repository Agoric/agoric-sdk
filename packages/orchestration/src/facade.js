// @ts-check
/** @file Orchestration service */

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {OrchestrationService} from './service.js';
 * @import {OrchestrationHandlerMaker} from './types.js';
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
     * @type {OrchestrationHandlerMaker}
     */
    orchestrate(durableName, ctx, fn) {
      console.log('orchestrate got', durableName, ctx, fn);
      throw new Error('Not yet implemented');
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
