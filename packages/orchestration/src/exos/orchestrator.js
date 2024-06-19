/** @file ChainAccount exo */
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  ChainInfoShape,
  LocalChainAccountShape,
  DenomShape,
  BrandInfoShape,
  DenomAmountShape,
} from '../typeGuards.js';
import { getChainsAndConnection } from '../utils/chainHub.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {VowTools} from '@agoric/vow';
 * @import {ChainHub} from './chain-hub.js';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
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
export const prepareOrchestrator = (
  zone,
  {
    chainHub,
    localchain,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    vowTools: { watch },
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
          onFulfilled: M.call(M.arrayOf(M.record()))
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
            // @ts-expect-error Vow vs Promise
            return watch(
              chainHub.getChainInfo('agoric'),
              this.facets.makeLocalChainFacadeWatcher,
            );
          }
          // @ts-expect-error Vow vs Promise
          return watch(
            getChainsAndConnection(chainHub, 'agoric', name),
            this.facets.makeRemoteChainFacadeWatcher,
          );
        },
        makeLocalAccount() {
          return watch(E(localchain).makeAccount());
        },
        getBrandInfo: () => Fail`not yet implemented`,
        asAmount: () => Fail`not yet implemented`,
      },
    },
  );
harden(prepareOrchestrator);
