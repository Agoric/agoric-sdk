/** @file Orchestration service */

import { E } from '@endo/far';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { M, mustMatch } from '@endo/patterns';
import { prepareStakingAccountKit } from './exos/stakingAccountKit.js';

const { Fail } = assert;

/** agoricNames key for ChainInfo hub */
export const CHAIN_KEY = 'chain';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Board, NameHub} from '@agoric/vats';
 * @import {ERef} from '@endo/far';
 * @import {OrchestrationService} from './service.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {CosmosValidatorAddress} from './cosmos-api.js';
 * @import {AmountArg, Chain, ChainInfo, CosmosChainInfo, OrchestrationAccount, Orchestrator} from './types.js';
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
 * @param {CosmosChainInfo} chainInfo
 * @param {{
 *   storageNode: ERef<StorageNode>;
 *   timerService: ERef<TimerService>;
 *   orchestrationService: ERef<OrchestrationService>;
 * }} powers
 * @param {{ makeStakingAccountKit: ReturnType<typeof prepareStakingAccountKit> }} fns
 * @returns {Chain}
 */
const makeRemoteChainFacade = (
  chainInfo,
  { orchestrationService, storageNode, timerService },
  { makeStakingAccountKit },
) => {
  return {
    /** @returns {Promise<ChainInfo>} */
    getChainInfo: async () => anyVal,
    // TODO: any is horked
    /** @returns {Promise<OrchestrationAccount<unknown>>} */
    makeAccount: async () => {
      console.log('makeAccount on', chainInfo.chainId);
      // TODO: require exactly 1 staking token in the static type?
      chainInfo.stakingTokens.length >= 1 || Fail`no staking tokens`;
      if (chainInfo.stakingTokens.length > 1) {
        console.warn('>1 staking tokens; using 1st');
      }
      const [{ denom: baseDenom }] = chainInfo.stakingTokens;

      const { ibcConnectionInfo } = chainInfo;
      const controllerConnectionId =
        ibcConnectionInfo.counterparty.connection_id;
      const newICA = await E(orchestrationService).makeAccount(
        ibcConnectionInfo.id,
        controllerConnectionId,
      );
      const icqConnection = await E(orchestrationService).provideICQConnection(
        controllerConnectionId,
      );
      const addr = await E(newICA).getAddress();
      const staking = makeStakingAccountKit(addr, baseDenom, {
        account: newICA, // TODO: should an ERef work here?
        storageNode: await storageNode, // TODO: child node? ERef OK?
        icqConnection, // TODO: should an ERef work here?
        timer: await timerService, // TODO: should an ERef work here?
      });
      // @ts-expect-error fake yet
      return {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {AmountArg} amount
         */
        delegate(validator, amount) {
          console.log('delegate got', validator, amount);
          return E(staking.holder).delegate(validator, amount);
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
        /** @param {Delegation[]} delegations */
        undelegate(delegations) {
          console.log('undelegate got', delegations);
          return E(staking.holder).undelegate(delegations);
        },
        withdraw(amount) {
          console.log('withdraw got', amount);
          return Promise.resolve();
        },
      };
    },
  };
};

export const CosmosChainInfoShape = M.splitRecord(
  {
    chainId: M.string(),
    ibcConnectionInfo: M.splitRecord({
      id: M.string(), // TODO: IBCConnectionIDShape?
      client_id: M.string(),
      state: M.or('OPEN', 'TRYOPEN', 'INIT', 'CLOSED'),
      counterparty: {
        client_id: M.string(),
        connection_id: M.string(),
        prefix: {
          key_prefix: M.string(),
        },
      },
      versions: M.arrayOf({
        identifier: M.string(),
        features: M.arrayOf(M.string()),
      }),
      delay_period: M.nat(),
    }),
    stakingTokens: M.arrayOf({ denom: M.string() }),
  },
  {
    icaEnabled: M.boolean(),
    icqEnabled: M.boolean(),
    pfmEnabled: M.boolean(),
    ibcHooksEnabled: M.boolean(),
    allowedMessages: M.arrayOf(M.string()),
    allowedQueries: M.arrayOf(M.string()),
  },
);

/**
 *
 * @param {{
 *   zone: Zone;
 *   timerService: ERef<TimerService>;
 *   zcf: ZCF;
 *   storageNode: ERef<StorageNode>;
 *   orchestrationService: ERef<OrchestrationService>;
 *   localchain: ERef<LocalChain>;
 *   agoricNames: ERef<NameHub>;
 *   board: ERef<Board>;
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
  board,
}) => {
  console.log('makeOrchestrationFacade got', {
    zone,
    timerService,
    zcf,
    storageNode,
    orchestrationService,
  });

  const baggage = zone.mapStore('Recorder Baggage');
  const marshaller = E(board).getReadonlyMarshaller();
  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);

  const makeStakingAccountKit = prepareStakingAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );

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
          const chainInfo = await E(agoricNames).lookup(CHAIN_KEY, name);
          mustMatch(chainInfo, CosmosChainInfoShape);
          // TODO: match chainInfo against shape/pattern
          return makeRemoteChainFacade(
            chainInfo,
            {
              orchestrationService,
              storageNode,
              timerService,
            },
            { makeStakingAccountKit },
          );
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
