/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { V } from '@agoric/vow/vat.js';

import { ChainFacadeI } from '../typeGuards.js';
import { Far } from '@endo/far';

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

/**
 * @param {Zone} zone
 * @param {{
 *   makeCosmosOrchestrationAccount: ReturnType<
 *     typeof prepareCosmosOrchestrationAccount
 *   >;
 *   orchestration: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timer: Remote<TimerService>;
 *   vowTools: import('@agoric/vow').VowTools;
 * }} powers
 */
export const prepareRemoteChainFacade = (
  zone,
  {
    makeCosmosOrchestrationAccount,
    orchestration,
    storageNode,
    timer,
    vowTools: { allVows, watch },
  },
) =>
  zone.exoClass(
    'RemoteChainFacade',
    ChainFacadeI,
    /**
     * @param {CosmosChainInfo} remoteChainInfo
     * @param {IBCConnectionInfo} connectionInfo
     */
    (remoteChainInfo, connectionInfo) => {
      trace('making an RemoteChainFacade');
      return { remoteChainInfo, connectionInfo };
    },
    {
      getChainInfo() {
        return this.state.remoteChainInfo;
      },

      // FIXME parameterize on the remoteChainInfo to make()
      // That used to work but got lost in the migration to Exo
      /** @returns {Promise<OrchestrationAccount<ChainInfo>>} */
      makeAccount() {
        const { remoteChainInfo, connectionInfo } = this.state;

        const icaP = V(orchestration).makeAccount(
          remoteChainInfo.chainId,
          connectionInfo.id,
          connectionInfo.counterparty.connection_id,
        );

        return watch(
          allVows([icaP, V(icaP).getAddress()]),
          Far('makeAccount', {
            onFulfilled: ([icaAccount, address]) => {
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
          }),
        );
      },
    },
  );
harden(prepareRemoteChainFacade);
/** @typedef {ReturnType<typeof prepareRemoteChainFacade>} MakeRemoteChainFacade */
