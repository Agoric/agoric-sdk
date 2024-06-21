/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { V, watch } from '@agoric/vow/vat.js';

import { ChainFacadeI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {Vow, VowTools} from '@agoric/vow';
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
 *   vowTools: VowTools;
 * }} powers
 */
export const prepareRemoteChainFacade = (
  zone,
  {
    makeCosmosOrchestrationAccount,
    orchestration,
    storageNode,
    timer,
    vowTools: { allVows },
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
        return watch(this.state.remoteChainInfo);
      },

      // FIXME parameterize on the remoteChainInfo to make()
      // That used to work but got lost in the migration to Exo
      /** @returns {Vow<OrchestrationAccount<ChainInfo>>} */
      makeAccount() {
        const { remoteChainInfo, connectionInfo } = this.state;
        const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
        if (!stakingDenom) {
          // FIXME methods that return vows must not throw synchronously
          throw Fail`chain info lacks staking denom`;
        }

        const icaP = V(orchestration).makeAccount(
          remoteChainInfo.chainId,
          connectionInfo.id,
          connectionInfo.counterparty.connection_id,
        );

        // FIXME use watch() from vowTools
        return watch(allVows([icaP, V(icaP).getAddress()]), {
          onFulfilled: ([account, address]) => {
            return makeCosmosOrchestrationAccount(address, stakingDenom, {
              account,
              storageNode,
              // FIXME provide real ICQ connection
              icqConnection: anyVal,
              timer,
            });
          },
        });
      },
    },
  );
harden(prepareRemoteChainFacade);
/** @typedef {ReturnType<typeof prepareRemoteChainFacade>} MakeRemoteChainFacade */
