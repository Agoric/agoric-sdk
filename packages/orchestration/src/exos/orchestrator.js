/** @file ChainAccount exo */
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { V } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';
import {
  ChainInfoShape,
  LocalChainAccountShape,
  DenomShape,
  BrandInfoShape,
  DenomAmountShape,
} from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ChainHub} from '../utils/chainHub.js';
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Vow, VowTools} from '@agoric/vow';
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
export const prepareOrchestrator = (
  zone,
  {
    chainHub,
    localchain,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    vowTools: _vowTools,
  },
) =>
  zone.exoClass(
    'Orchestrator',
    OrchestratorI,
    () => {
      trace('making an Orchestrator');
      return {};
    },
    {
      /** @type {Orchestrator['getChain']} */
      getChain: async name => {
        const agoricChainInfo = await chainHub.getChainInfo('agoric');

        if (name === 'agoric') {
          // @ts-expect-error XXX chainInfo generic
          return makeLocalChainFacade(agoricChainInfo);
        }

        const remoteChainInfo = await chainHub.getChainInfo(name);
        const connectionInfo = await chainHub.getConnectionInfo(
          agoricChainInfo.chainId,
          remoteChainInfo.chainId,
        );

        // @ts-expect-error XXX chainInfo generic
        return makeRemoteChainFacade(remoteChainInfo, connectionInfo);
      },
      makeLocalAccount() {
        return V(localchain).makeAccount();
      },
      getBrandInfo: () => Fail`not yet implemented`,
      asAmount: () => Fail`not yet implemented`,
    },
  );
harden(prepareOrchestrator);
