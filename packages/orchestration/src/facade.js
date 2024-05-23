/** @file Orchestration service */

import { E } from '@endo/far';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {ERef} from '@endo/far';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, OrchestrationAccount, Orchestrator} from './types.js';
 */

/** @type {any} */
const anyVal = null;

/**
 * @param {ERef<LocalChain>} localchain
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
 * @returns {Chain}
 */
const makeRemoteChainFacade = name => {
  const chainInfo = {
    allegedName: name,
    chainId: 'fixme',
  };
  return {
    /** @returns {Promise<ChainInfo>} */
    getChainInfo: async () => anyVal,
    /** @returns {Promise<OrchestrationAccount<C>>} */
    makeAccount: async () => {
      console.log('makeAccount for', name);
      // @ts-expect-error fake yet
      return {
        delegate(validator, amount) {
          console.log('delegate got', validator, amount);
          return Promise.resolve();
        },
        deposit(payment) {
          console.log('deposit got', payment);
          return Promise.resolve();
        },
        getAddress() {
          return {
            chainId: chainInfo.chainId,
            address: 'an address!',
            addressEncoding: 'bech32',
          };
        },
        getBalance(_denom) {
          console.error('getBalance not yet implemented');
          return Promise.resolve({ denom: 'fixme', value: 0n });
        },
        getBalances() {
          throw new Error('not yet implemented');
        },
        getDelegations() {
          console.error('getDelegations not yet implemented');
          return [];
        },
        getRedelegations() {
          throw new Error('not yet implemented');
        },
        getUnbondingDelegations() {
          throw new Error('not yet implemented');
        },
        liquidStake() {
          console.error('liquidStake not yet implemented');
          return 0n;
        },
        send(toAccount, amount) {
          console.log('send got', toAccount, amount);
          return Promise.resolve();
        },
        transfer(amount, destination, memo) {
          console.log('transfer got', amount, destination, memo);
          return Promise.resolve();
        },
        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return Promise.resolve();
        },
        undelegate(validator, amount) {
          console.log('undelegate got', validator, amount);
          return Promise.resolve();
        },
        withdraw(amount) {
          console.log('withdraw got', amount);
          return Promise.resolve();
        },
      };
    },
  };
};

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
        async getChain(name) {
          if (name === 'agoric') {
            return makeLocalChainFacade(localchain);
          }
          return makeRemoteChainFacade(name);
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
