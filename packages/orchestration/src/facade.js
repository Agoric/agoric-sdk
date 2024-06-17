/** @file Orchestration service */

import { V as E } from '@agoric/vow/vat.js';
import { Fail } from '@agoric/assert';
import { prepareCosmosOrchestrationAccount } from './exos/cosmosOrchestrationAccount.js';

/**
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from './types.js';
 */

/** @type {any} */
const anyVal = null;

/**
 * @param {Remote<LocalChain>} localchain
 * @param {ReturnType<
 *   typeof import('./exos/local-chain-account-kit.js').prepareLocalChainAccountKit
 * >} makeLocalChainAccountKit
 * @param {ChainInfo} localInfo
 * @returns {Chain}
 */
const makeLocalChainFacade = (
  localchain,
  makeLocalChainAccountKit,
  localInfo,
) => {
  return {
    /** @returns {Promise<ChainInfo>} */
    async getChainInfo() {
      return localInfo;
    },

    async makeAccount() {
      const lcaP = E(localchain).makeAccount();
      const [lca, address] = await Promise.all([lcaP, E(lcaP).getAddress()]);
      const { holder: account } = makeLocalChainAccountKit({
        account: lca,
        address,
        // @ts-expect-error TODO: Remote
        storageNode: null,
      });

      return {
        async deposit(payment) {
          console.log('deposit got', payment);
          await E(account).deposit(payment);
        },
        getAddress() {
          const addressStr = account.getAddress();
          return {
            address: addressStr,
            chainId: localInfo.chainId,
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

          const natAmount = await E(lca).getBalance(brand);
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
          console.log('transfer got', amount, destination, opts);
          return account.transfer(amount, destination, opts);
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
 * @param {IBCConnectionInfo} connectionInfo
 * @param {object} io
 * @param {Remote<OrchestrationService>} io.orchestration
 * @param {MakeRecorderKit} io.makeRecorderKit
 * @param {Remote<StorageNode>} io.storageNode
 * @param {Remote<TimerService>} io.timer
 * @param {ZCF} io.zcf
 * @param {Zone} io.zone
 * @returns {Chain<CCI>}
 */
const makeRemoteChainFacade = (
  chainInfo,
  connectionInfo,
  { orchestration, makeRecorderKit, storageNode, timer, zcf, zone },
) => {
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone.subZone(chainInfo.chainId),
    makeRecorderKit,
    zcf,
  );

  return {
    getChainInfo: async () => chainInfo,
    /** @returns {Promise<OrchestrationAccount<CCI>>} */
    makeAccount: async () => {
      const icaAccount = await E(orchestration).makeAccount(
        chainInfo.chainId,
        connectionInfo.id,
        connectionInfo.counterparty.connection_id,
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
        storageNode,
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
 *   chainHub: import('./utils/chainHub.js').ChainHub;
 *   makeLocalChainAccountKit: ReturnType<
 *     typeof import('./exos/local-chain-account-kit.js').prepareLocalChainAccountKit
 *   >;
 *   makeRecorderKit: MakeRecorderKit;
 *   asyncFlowTools: AsyncFlowTools;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  localchain,
  chainHub,
  makeLocalChainAccountKit,
  makeRecorderKit,
  asyncFlowTools,
}) => {
  (zone &&
    timerService &&
    zcf &&
    storageNode &&
    orchestrationService &&
    // @ts-expect-error type says defined but double check
    makeLocalChainAccountKit &&
    // @ts-expect-error type says defined but double check
    makeRecorderKit &&
    asyncFlowTools) ||
    Fail`params missing`;

  return {
    /**
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {Context} ctx - values to pass through the async flow membrane
     * @param {(orc: Orchestrator, ctx2: Context, ...args: Args) => object} fn
     * @returns {(...args: Args) => Vow<unknown>}
     */
    orchestrate(durableName, ctx, fn) {
      /** @type {Orchestrator} */
      const orc = {
        async getChain(name) {
          const agoricChainInfo = await chainHub.getChainInfo('agoric');

          if (name === 'agoric') {
            return makeLocalChainFacade(
              localchain,
              makeLocalChainAccountKit,
              agoricChainInfo,
            );
          }

          const remoteChainInfo = await chainHub.getChainInfo(name);
          const connectionInfo = await chainHub.getConnectionInfo(
            agoricChainInfo.chainId,
            remoteChainInfo.chainId,
          );

          return makeRemoteChainFacade(remoteChainInfo, connectionInfo, {
            orchestration: orchestrationService,
            makeRecorderKit,
            storageNode,
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

      const { asyncFlow } = asyncFlowTools;
      /** @type {(...args: Args) => Promise<unknown>} */
      // TODO The lexical references to `orc` and `ctx` below are a
      // stopgap for a correct endowments mechanism. This stopgap passes
      // them through directly, rather than through the membrane. As a result,
      // interactions with these endowments will not yet be replayable.
      // Even as a stopgap, this will bypass too much. But we gotta get
      // started somewhere.
      const guestFunc = async (...args) => fn(orc, ctx, ...args);
      const hostFunc = asyncFlow(zone, durableName, guestFunc);
      return hostFunc;
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
