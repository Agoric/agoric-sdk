/** @file Orchestration service */

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { prepareCosmosOrchestrationAccount } from './exos/cosmosOrchestrationAccount.js';
import { CosmosChainInfoShape } from './typeGuards.js';

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, OrchestrationAccount, Orchestrator} from './types.js';
 */

/** @type {any} */
const anyVal = null;

// TODO define key hierarchy in shared constants
/** agoricNames key for ChainInfo hub */
export const CHAIN_KEY = 'chain';

// FIXME look up real values
// UNTIL https://github.com/Agoric/agoric-sdk/issues/9063
const mockLocalChainInfo = {
  allegedName: 'agoric',
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

    async makeAccount() {
      const account = await E(localchain).makeAccount();

      return {
        async deposit(payment) {
          console.log('deposit got', payment);
          await E(account).deposit(payment);
        },
        getAddress() {
          const addressStr = account.getAddress();
          return {
            address: addressStr,
            chainId: mockLocalChainInfo.chainId,
            addressEncoding: 'bech32',
          };
        },
        async getBalance(denomArg) {
          // FIXME look up real values
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/9211
          const [brand, denom] =
            typeof denomArg === 'string'
              ? [/** @type {any} */ (null), denomArg]
              : [denomArg, 'FIXME'];

          const natAmount = await account.getBalance(brand);
          return harden({ denom, value: natAmount.value });
        },
        getBalances() {
          throw new Error('not yet implemented');
        },
        async send(toAccount, amount) {
          // FIXME implement
          console.log('send got', toAccount, amount);
        },
        async transfer(amount, destination, opts) {
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
      // FIXME look up real values
      // UNTIL https://github.com/Agoric/agoric-sdk/issues/9063
      const hostConnectionId = 'connection-1';
      const controllerConnectionId = 'connection-2';

      const icaAccount = await E(orchestration).makeAccount(
        hostConnectionId,
        controllerConnectionId,
      );

      const address = await E(icaAccount).getAddress();

      const [{ denom: bondDenom }] = chainInfo.stakingTokens || [
        {
          denom: null,
        },
      ];
      assert(bondDenom, 'missing bondDenom');
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
 *   agoricNames: Remote<NameHub>;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  localchain,
  agoricNames,
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

  /**
   * @param {string} name
   * @returns {Promise<CosmosChainInfo>}
   */
  const getChainInfo = async name => {
    // Either from registerChain or memoized remote lookup()
    if (chainInfos.has(name)) {
      return chainInfos.get(name);
    }

    const chainInfo = await E(agoricNames).lookup(CHAIN_KEY, name);
    assert(chainInfo, `unknown chain ${name}`);
    chainInfos.init(name, chainInfo);
    return chainInfo;
  };

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

          const chainInfo = await getChainInfo(name);

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
