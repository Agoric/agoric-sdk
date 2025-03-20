/** @file Orchestrator exo */
import { AmountShape } from '@agoric/ertp';
import { makeScalarMapStore, pickFacet } from '@agoric/vat-data';
import { makeTracer } from '@agoric/internal';
import { Shape as NetworkShape } from '@agoric/network';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { DenomInfoShape, DenomAmountShape, DenomShape } from '../typeGuards.js';

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
 * @import {Chain, ChainInfo, IBCConnectionInfo, KnownChains, Orchestrator} from '../types.js';
 */

const { Vow$ } = NetworkShape; // TODO #9611
const trace = makeTracer('Orchestrator');

/** @see {Orchestrator} */
export const OrchestratorI = M.interface('Orchestrator', {
  getChain: M.call(M.string()).returns(Vow$(M.remotable())),
  getDenomInfo: M.call(DenomShape, M.string()).returns(DenomInfoShape),
  asAmount: M.call(DenomAmountShape).returns(AmountShape),
});

/**
 * @param {Zone} zone
 * @param {{
 *   chainHub: ChainHub;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   vowTools: VowTools;
 * }} powers
 */
const prepareOrchestratorKit = (
  zone,
  {
    chainHub,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    vowTools: { watch, asVow },
  },
) => {
  /**
   * @template T
   * @typedef {{ vow: Vow<T>; pending: true } | { value: T; pending: false }} MaybePendingValue
   */

  /**
   * heap store is fine for a cache
   *
   * @type {MapStore<string, MaybePendingValue<HostInterface<Chain>>>}
   */
  const chainByName = makeScalarMapStore('chainName');

  return zone.exoClassKit(
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
          chainByName.set('agoric', harden({ value: it, pending: false }));
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
          chainByName.set(name, harden({ value: it, pending: false }));
          return it;
        },
      },
      orchestrator: {
        /** @type {HostOf<Orchestrator['getChain']>} */
        getChain(name) {
          return asVow(() => {
            if (chainByName.has(name)) {
              const maybeChain = chainByName.get(name);
              return maybeChain.pending ? maybeChain.vow : maybeChain.value;
            }
            const vow =
              name === 'agoric'
                ? watch(
                    chainHub.getChainInfo('agoric'),
                    this.facets.makeLocalChainFacadeWatcher,
                  )
                : watch(
                    chainHub.getChainsAndConnection('agoric', name),
                    this.facets.makeRemoteChainFacadeWatcher,
                    name,
                  );
            chainByName.init(name, harden({ vow, pending: true }));
            return vow;
          });
        },
        /** @type {HostOf<Orchestrator['getDenomInfo']>} */
        getDenomInfo(denom, holdingChainName) {
          const denomDetail = chainHub.getAsset(denom, holdingChainName);
          if (!denomDetail) throw Fail`No denom detail for ${q(denom)}`;
          const { chainName, baseName, baseDenom, brand } = denomDetail;
          chainByName.has(chainName) ||
            Fail`use getChain(${q(chainName)}) before getDenomInfo(${q(denom)})`;
          const maybeChain = chainByName.get(chainName);
          if (maybeChain.pending) {
            throw Fail`wait until getChain(${q(chainName)}) completes before getDenomInfo(${q(denom)})`;
          }
          const chain =
            /** @type {HostInterface<Chain<KnownChains[keyof KnownChains]>>} */ (
              maybeChain.value
            );
          chainByName.has(baseName) ||
            Fail`use getChain(${q(baseName)}) before getDenomInfo(${q(denom)})`;
          const maybeBase = chainByName.get(baseName);
          if (maybeBase.pending) {
            throw Fail`wait until getChain(${q(baseName)}) completes before getDenomInfo(${q(denom)})`;
          }
          const base =
            /** @type {HostInterface<Chain<KnownChains[keyof KnownChains]>>} */ (
              maybeBase.value
            );
          return harden({ chain, base, brand, baseDenom });
        },
        /** @type {HostOf<Orchestrator['asAmount']>} */
        asAmount: () => Fail`not yet implemented`,
      },
    },
  );
};
harden(prepareOrchestratorKit);

/**
 * @param {Zone} zone
 * @param {{
 *   chainHub: ChainHub;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   vowTools: VowTools;
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
