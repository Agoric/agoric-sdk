/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { V } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';

import { ChainInfoShape } from './orchestrator.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from '../service.js';
 * @import {prepareCosmosOrchestrationAccount} from './cosmos-orchestration-account.js';
 * @import {ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount} from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('RemoteChainFacade');

/** @type {any} */
const anyVal = null;

/** @see {Chain} */
export const RemoteChainFacadeI = M.interface('RemoteChainFacade', {
  getChainInfo: M.callWhen().returns(ChainInfoShape),
  makeAccount: M.callWhen().returns(M.remotable('OrchestrationAccount')),
});

/**
 * @param {Zone} zone
 * @param {{
 *   makeCosmosOrchestrationAccount: ReturnType<
 *     typeof prepareCosmosOrchestrationAccount
 *   >;
 *   orchestration: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timer: Remote<TimerService>;
 * }} powers
 */
export const prepareRemoteChainFacade = (
  zone,
  { makeCosmosOrchestrationAccount, orchestration, storageNode, timer },
) =>
  zone.exoClass(
    'RemoteChainFacade',
    RemoteChainFacadeI,
    /**
     * @param {CosmosChainInfo} remoteChainInfo
     * @param {IBCConnectionInfo} connectionInfo
     */
    (remoteChainInfo, connectionInfo) => {
      trace('making an RemoteChainFacade');
      return { remoteChainInfo, connectionInfo };
    },
    {
      async getChainInfo() {
        return this.state.remoteChainInfo;
      },

      // FIXME parameterize on the remoteChainInfo to make()
      // That used to work but got lost in the migration to Exo
      /** @returns {Promise<OrchestrationAccount<ChainInfo>>} */
      async makeAccount() {
        const { remoteChainInfo, connectionInfo } = this.state;

        const icaAccount = await V(orchestration).makeAccount(
          remoteChainInfo.chainId,
          connectionInfo.id,
          connectionInfo.counterparty.connection_id,
        );

        const address = await V(icaAccount).getAddress();

        const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
        if (!stakingDenom) {
          throw Fail`chain info lacks staking denom`;
        }
        return makeCosmosOrchestrationAccount(address, stakingDenom, {
          account: icaAccount,
          storageNode,
          icqConnection: anyVal,
          timer,
        });
      },
    },
  );
harden(prepareRemoteChainFacade);
