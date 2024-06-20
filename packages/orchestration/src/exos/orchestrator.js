/** @file ChainAccount exo */
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  BrandInfoShape,
  ChainInfoShape,
  DenomAmountShape,
  DenomShape,
  LocalChainAccountShape,
} from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ChainHub} from './chain-hub.js';
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {PickFacet} from '@agoric/swingset-liveslots';
 * @import {OrchestrationService} from '../service.js';
 * @import {MakeLocalOrchestrationAccountKit} from './local-orchestration-account.js';
 * @import {MakeLocalChainFacade} from './local-chain-facade.js';
 * @import {MakeRemoteChainFacade} from './remote-chain-facade.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('Orchestrator');

/** @see {Orchestrator} */
export const OrchestratorI = M.interface('Orchestrator', {
  getChain: M.callWhen(M.string()).returns(ChainInfoShape),
  makeLocalAccount: M.callWhen().returns(LocalChainAccountShape),
  getBrandInfo: M.call(DenomShape).returns(BrandInfoShape),
  asAmount: M.call(DenomAmountShape).returns(AmountShape),
});

/**
 * @param {Zone} zone
 * @param {{
 *   asyncFlowTools: AsyncFlowTools;
 *   chainHub: ChainHub;
 *   localchain: Remote<LocalChain>;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeLocalChainFacade: MakeLocalChainFacade;
 *   makeRemoteChainFacade: MakeRemoteChainFacade;
 *   orchestrationService: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   vowTools: VowTools;
 *   zcf: ZCF;
 * }} powers
 */
export const prepareOrchestratorKit = (
  zone,
  {
    chainHub,
    localchain,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    vowTools: { watch, when },
  },
) =>
  zone.exoClassKit(
    'Orchestrator',
    {
      orchestrator: OrchestratorI,
      makeLocalChainFacadeWatcher: M.interface('makeLocalChainFacadeWatcher', {
        onFulfilled: M.call(M.record())
          .optional(M.arrayOf(M.undefined()))
          .returns(M.any()), // FIXME narrow
      }),
      makeRemoteChainFacadeWatcher: M.interface(
        'makeRemoteChainFacadeWatcher',
        {
          onFulfilled: M.call(M.any())
            .optional(M.arrayOf(M.undefined()))
            .returns(M.any()), // FIXME narrow
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
        /** @param {ChainInfo} agoricChainInfo */
        onFulfilled(agoricChainInfo) {
          return makeLocalChainFacade(agoricChainInfo);
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
         */
        onFulfilled([_agoricChainInfo, remoteChainInfo, connectionInfo]) {
          return makeRemoteChainFacade(remoteChainInfo, connectionInfo);
        },
      },
      orchestrator: {
        /** @type {Orchestrator['getChain']} */
        getChain(name) {
          if (name === 'agoric') {
            // XXX when() until membrane
            return when(
              watch(
                chainHub.getChainInfo('agoric'),
                this.facets.makeLocalChainFacadeWatcher,
              ),
            );
          }
          // XXX when() until membrane
          return when(
            watch(
              chainHub.getChainsAndConnection('agoric', name),
              this.facets.makeRemoteChainFacadeWatcher,
            ),
          );
        },
        makeLocalAccount() {
          return when(watch(E(localchain).makeAccount()));
        },
        getBrandInfo: () => Fail`not yet implemented`,
        asAmount: () => Fail`not yet implemented`,
      },
    },
  );
harden(prepareOrchestratorKit);
