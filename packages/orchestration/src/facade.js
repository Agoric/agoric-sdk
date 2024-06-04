/** @file Orchestration service */

import { E } from '@endo/far';
import { prepareCosmosOrchestrationAccount } from './exos/cosmosOrchestrationAccount.js';

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

// FIXME should be configurable
const mockLocalChainInfo = {
  allegedName: 'agoric',
  allowedMessages: [],
  allowedQueries: [],
  chainId: 'agoriclocal',
  connections: anyVal,
  ibcHooksEnabled: true,
  icaEnabled: true,
  icqEnabled: true,
  pfmEnabled: true,
};

/**
 * @param {Remote<LocalChain>} localchain
 * @returns {Chain}
 */
const makeLocalChainFacade = localchain => {
  return {
    /** @returns {Promise<ChainInfo>} */
    async getChainInfo() {
      return mockLocalChainInfo;
    },

    // @ts-expect-error FIXME promise resolution through membrane
    async makeAccount() {
      const account = await E(localchain).makeAccount();

      return {
        deposit(payment) {
          console.log('deposit got', payment);
          return E(account).deposit(payment);
        },
        async getAddress() {
          const addressStr = await E(account).getAddress();
          return {
            address: addressStr,
            chainId: mockLocalChainInfo.chainId,
            addressEncoding: 'bech32',
          };
        },
        getBalance(_denom) {
          // FIXME map denom to Brand
          const brand = /** @type {any} */ (null);
          return E(account).getBalance(brand);
        },
        getBalances() {
          throw new Error('not yet implemented');
        },
        send(toAccount, amount) {
          // FIXME implement
          console.log('send got', toAccount, amount);
        },
        transfer(amount, destination, opts) {
          // FIXME implement
          console.log('transfer got', amount, destination, opts);
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
 * @param {Remote<TimerService>} io.timer
 * @param {ZCF} io.zcf
 * @param {Zone} io.zone
 * @returns {Chain<C>}
 */
const makeRemoteChainFacade = (name, { orchestration, timer, zcf, zone }) => {
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
  const makeRecorderKit = () => anyVal;
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone.subZone(name),
    makeRecorderKit,
    zcf,
  );

  return {
    getChainInfo: async () => chainInfo,
    /** @returns {Promise<OrchestrationAccount<C>>} */
    makeAccount: async () => {
      console.log('makeAccount for', name);

      // FIXME look up real values
      const hostConnectionId = 'connection-1';
      const controllerConnectionId = 'connection-2';

      const icaAccount = await E(orchestration).makeAccount(
        hostConnectionId,
        controllerConnectionId,
      );

      const address = await E(icaAccount).getAddress();

      // FIXME look up real values
      const bondDenom = name;
      // @ts-expect-error FIXME missing methods
      return makeCosmosOrchestrationAccount(address, bondDenom, {
        account: icaAccount,
        storageNode: anyVal,
        icqConnection: anyVal,
        timer,
      });
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
            timer: timerService,
            zcf,
            zone,
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
