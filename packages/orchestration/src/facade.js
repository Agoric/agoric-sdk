/** @file Orchestration service */

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { wellKnownChainInfo } from './chain-info.js';
import { prepareCosmosOrchestrationAccount } from './exos/cosmosOrchestrationAccount.js';
import { CosmosChainInfoShape } from './typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, OrchestrationAccount, Orchestrator} from './types.js';
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
 * @template {CosmosChainInfo} CCI
 * @param {CCI} chainInfo
 * @param {object} io
 * @param {Remote<OrchestrationService>} io.orchestration
 * @param {Remote<TimerService>} io.timer
 * @param {ZCF} io.zcf
 * @param {Zone} io.zone
 * @returns {Chain<CCI>}
 */
const makeRemoteChainFacade = (
  chainInfo,
  { orchestration, timer, zcf, zone },
) => {
  const name = chainInfo.chainId;

  const makeRecorderKit = () => anyVal;
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone.subZone(name),
    makeRecorderKit,
    zcf,
  );

  return {
    getChainInfo: async () => chainInfo,
    /** @returns {Promise<OrchestrationAccount<CCI>>} */
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
      // @ts-expect-error XXX dynamic method availability
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

  const chainInfos = makeScalarBigMapStore('chainInfos', {
    keyShape: M.string(),
    valueShape: CosmosChainInfoShape,
  });

  return {
    /**
     * Register a new chain in a heap store. The name will override a name in
     * well known chain names.
     *
     * This registration will not surve a reincarnation of the vat so if the
     * chain is not yet in the well known names at that point, it will have to
     * be registered again. In an unchanged contract `start` the call will
     * happen again naturally.
     *
     * @param {string} name
     * @param {ChainInfo} chainInfo
     */
    registerChain(name, chainInfo) {
      chainInfos.init(name, chainInfo);
    },
    /**
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {Context} ctx - values to pass through the async flow membrane
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

          // TODO look up well known realistically https://github.com/Agoric/agoric-sdk/issues/9063
          const chainInfo = chainInfos.has(name)
            ? chainInfos.get(name)
            : // @ts-expect-error may be undefined
              wellKnownChainInfo[name];
          assert(chainInfo, `unknown chain ${name}`);

          return makeRemoteChainFacade(chainInfo, {
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
