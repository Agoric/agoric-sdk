/** @file ChainAccount exo */
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { V } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';
// eslint-disable-next-line import/no-cycle -- FIXME
import { makeLocalChainFacade } from '../facade.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ChainHub} from '../utils/chainHub.js';
 * @import {Connection, Port} from '@agoric/network';
 * @import {AnyJson} from '@agoric/cosmic-proto';
 * @import {TxBody} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from '../service.js';
 * @import {MakeLocalOrchestrationAccountKit} from './local-orchestration-account.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('Orchestrator');

// TODO more validation
export const ChainInfoShape = M.any();
export const LocalChainAccountShape = M.remotable('LocalChainAccount');
export const DenomShape = M.string();
export const BrandInfoShape = M.any();

export const DenomAmountShape = { denom: DenomShape, value: M.bigint() };

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
 *   makeLocalChainAccountKit: MakeLocalOrchestrationAccountKit;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeRemoteChainFacade: any;
 *   orchestrationService: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 * }} powers
 */
export const prepareOrchestrator = (
  zone,
  { chainHub, localchain, makeLocalChainAccountKit, makeRemoteChainFacade },
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
