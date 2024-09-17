/** @file Orchestrator exo */
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { Shape as NetworkShape } from '@agoric/network';
import { pickFacet } from '@agoric/vat-data';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import {
  ChainInfoShape,
  DenomAmountShape,
  DenomInfoShape,
  DenomShape,
  LocalChainAccountShape,
} from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ActualChainInfo, ChainHub} from './chain-hub.js';
 * @import {AsyncFlowTools, HostInterface, HostOf} from '@agoric/async-flow';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {PickFacet} from '@agoric/swingset-liveslots';
 * @import {CosmosInterchainService} from './exo-interfaces.js';
 * @import {MakeLocalChainFacade} from './local-chain-facade.js';
 * @import {MakeRemoteChainFacade} from './remote-chain-facade.js';
 * @import {Chain, ChainInfo, IBCConnectionInfo, Orchestrator} from '../types.js';
 */

const { Vow$ } = NetworkShape; // TODO #9611
const trace = makeTracer('Orchestrator');

/** @see {Orchestrator} */
export const OrchestratorI = M.interface('Orchestrator', {
  getChain: M.call(M.string()).returns(Vow$(ChainInfoShape)),
  makeLocalAccount: M.call().returns(Vow$(LocalChainAccountShape)),
  getDenomInfo: M.call(DenomShape).returns(DenomInfoShape),
  asAmount: M.call(DenomAmountShape).returns(AmountShape),
});

/**
 * @param {Zone} zone
 * @param {{
 *   asyncFlowTools: AsyncFlowTools;
 *   chainHub: ChainHub;
 *   localchain: Remote<LocalChain>;
 *   chainByName: MapStore<string, HostInterface<Chain>>;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   vowTools: VowTools;
 *   zcf: ZCF;
 * }} powers
 */
const prepareOrchestratorKit = (
  zone,
  {
    chainHub,
    localchain,
    chainByName,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    vowTools: { watch, asVow },
  },
) =>
  zone.exoClassKit(
    'Orchestrator',
    {
      orchestrator: OrchestratorI,
      makeLocalChainFacadeWatcher: M.interface('makeLocalChainFacadeWatcher', {
        onFulfilled: M.call(M.record()).returns(M.remotable()),
      }),
      makeRemoteChainFacadeWatcher: M.interface(
        'makeRemoteChainFacadeWatcher',
        {
          onFulfilled: M.call(M.any(), M.string())
            .optional(M.arrayOf(M.undefined())) // XXX needed?
            .returns(M.remotable()),
        },
      ),
    },
    () => {
      trace('making an Orchestrator');
      return {};
    },
    {
      /** Waits for `chainInfo` and returns a LocalChainFacade */
      makeLocalChainFacadeWatcher: {
        /**
         * @param {ActualChainInfo<'agoric'>} agoricChainInfo
         */
        onFulfilled(agoricChainInfo) {
          const it = makeLocalChainFacade(agoricChainInfo);
          chainByName.init('agoric', it);
          return it;
        },
      },
      /**
       * Waits for `chainInfo` for `agoric` and a remote chain and returns a
       * RemoteChainFacade
       */
      makeRemoteChainFacadeWatcher: {
        /**
         * Waits for `chainInfo` for `agoric` and a remote chain and returns a
         * RemoteChainFacade
         *
         * @param {[ChainInfo, ChainInfo, IBCConnectionInfo]} chainsAndConnection
         * @param {string} name
         */
        onFulfilled([_agoricChainInfo, remoteChainInfo, connectionInfo], name) {
          const it = makeRemoteChainFacade(remoteChainInfo, connectionInfo);
          chainByName.init(name, it);
          return it;
        },
      },
      orchestrator: {
        /** @type {HostOf<Orchestrator['getChain']>} */
        getChain(name) {
          if (chainByName.has(name)) {
            return asVow(() => chainByName.get(name));
          }
          if (name === 'agoric') {
            return watch(
              chainHub.getChainInfo('agoric'),
              this.facets.makeLocalChainFacadeWatcher,
            );
          }
          return watch(
            chainHub.getChainsAndConnection('agoric', name),
            this.facets.makeRemoteChainFacadeWatcher,
            name,
          );
        },
        makeLocalAccount() {
          return watch(E(localchain).makeAccount());
        },
        /** @type {HostOf<Orchestrator['getDenomInfo']>} */
        getDenomInfo(denom) {
          const denomDetail = chainHub.getAsset(denom);
          if (!denomDetail) throw Fail`No denom detail for ${q(denom)}`;
          const { chainName, baseName, baseDenom, brand } = denomDetail;
          chainByName.has(chainName) ||
            Fail`use getChain(${q(chainName)}) before getDenomInfo(${q(denom)})`;
          const chain = chainByName.get(chainName);
          chainByName.has(baseName) ||
            Fail`use getChain(${q(baseName)}) before getDenomInfo(${q(denom)})`;
          const base = chainByName.get(baseName);
          return harden({ chain, base, brand, baseDenom });
        },
        /** @type {HostOf<Orchestrator['asAmount']>} */
        asAmount: () => Fail`not yet implemented`,
      },
    },
  );
harden(prepareOrchestratorKit);

/**
 * @param {Zone} zone
 * @param {{
 *   asyncFlowTools: AsyncFlowTools;
 *   chainHub: ChainHub;
 *   localchain: Remote<LocalChain>;
 *   chainByName: MapStore<string, HostInterface<Chain>>;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   vowTools: VowTools;
 *   zcf: ZCF;
 * }} powers
 */
export const prepareOrchestrator = (zone, powers) => {
  const makeOrchestratorKit = prepareOrchestratorKit(zone, powers);
  return pickFacet(makeOrchestratorKit, 'orchestrator');
};

/**
 * Host side of the Orchestrator interface. (Methods return vows instead of
 * promises as the interface within the guest function.)
 *
 * @typedef {ReturnType<
 *   ReturnType<typeof prepareOrchestratorKit>
 * >['orchestrator']} HostOrchestrator
 */
