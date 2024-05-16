/** @file Orchestration service */

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {OrchestrationService} from './service.js';
 * @import {Orchestrator} from './types.js';
 */

/** @type {any} */
const anyVal = null;

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
      /** @type {Orchestrator} */
      const orc = {
        getChain: async name => ({
          getChainInfo: async () => anyVal,
          /** @type {any} */
          makeAccount: async () => {
            if (name === 'agoric') {
              return {
                deposit(payment) {
                  console.log('deposit got', payment);
                },
                transferSteps(amount, msg) {
                  console.log('transferSteps got', amount, msg);
                  return Promise.resolve();
                },
              };
            }
            return {
              getAddress() {
                return 'an address!';
              },
            };
          },
        }),
        makeLocalAccount: anyVal,
        getBrandInfo: anyVal,
        asAmount: anyVal,
      };
      return async (...args) => fn(orc, ctx, ...args);
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
