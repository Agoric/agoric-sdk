/** @file Orchestration service */

import { E } from '@endo/far';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {ERef} from '@endo/far';
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
 *   zcf: ZCF;
 *   storageNode: ERef<StorageNode>;
 *   orchestrationService: ERef<OrchestrationService>;
 *   localchain: ERef<LocalChain>;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  localchain,
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
      /** @type {Orchestrator} */
      const orc = {
        getChain: async name => ({
          getChainInfo: async () => anyVal,
          /** @type {any} */
          makeAccount: async () => {
            await null;
            console.log('makeAccount got', name);
            if (name === 'agoric') {
              const account = await E(localchain).makeAccount();

              return {
                deposit(payment) {
                  console.log('deposit got', payment);
                  // XXX yet again tripped up on remote methods looking local statically
                  return E(account).deposit(payment);
                },
                transferSteps(amount, msg) {
                  console.log('transferSteps got', amount, msg);
                  return Promise.resolve();
                },
              };
            }
            return {
              delegate(validator, amount) {
                console.log('delegate got', validator, amount);
                return Promise.resolve();
              },
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
