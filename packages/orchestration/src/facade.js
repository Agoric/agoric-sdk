/** @file Orchestration service */

import { E } from '@endo/far';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, KnownChains, OrchestrationAccount, Orchestrator} from './types.js';
 */

/** @type {any} */
const anyVal = null;

/**
 * @param {Remote<LocalChain>} localchain
 * @returns {Chain}
 */
const makeLocalChainFacade = localchain => {
  return {
    /** @returns {Promise<ChainInfo>} */
    async getChainInfo() {
      return {
        allegedName: 'agoric',
        allowedMessages: [],
        allowedQueries: [],
        chainId: 'agoric-3',
        connections: anyVal,
        ibcHooksEnabled: true,
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
      };
    },
    async makeAccount() {
      const account = await E(localchain).makeAccount();

      return {
        deposit(payment) {
          console.log('deposit got', payment);
          return E(account).deposit(payment);
        },
        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return Promise.resolve();
        },
      };
    },
  };
};

/**
 * @template {string} C
 * @param {C} name
 * @param {object} io
 * @param {Remote<OrchestrationService>} io.orchestration
 * @returns {Chain<C>}
 */
const makeRemoteChainFacade = (name, { orchestration }) => {
  const chainInfo = /** @type {CosmosChainInfo} */ ({
    allegedName: name,
    chainId: 'fixme',
    connections: {},
    icaEnabled: true,
    icqEnabled: true,
    pfmEnabled: true,
    ibcHooksEnabled: true,
    allowedMessages: [],
    allowedQueries: [],
  });
  return {
    getChainInfo: async () => chainInfo,
    /** @returns {Promise<OrchestrationAccount<C>>} */
    makeAccount: async () => {
      console.log('makeAccount for', name);

      // FIXME look up real values
      const hostConnectionId = 'connection-1';
      const controllerConnectionId = 'connection-2';

      return E(orchestration).makeAccount(
        hostConnectionId,
        controllerConnectionId,
      );
    },
  };
};

/**
 * @param {{
 *   zone: Zone;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 *   storageNode: Remote<StorageNode>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   localchain: Remote<LocalChain>;
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
        async getChain(name) {
          if (name === 'agoric') {
            return makeLocalChainFacade(localchain);
          }

          return makeRemoteChainFacade(name, {
            orchestration: orchestrationService,
          });
        },
        makeLocalAccount() {
          return E(localchain).makeAccount();
        },
        getBrandInfo: anyVal,
        asAmount: anyVal,
      };
      return async (...args) => fn(orc, ctx, ...args);
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
