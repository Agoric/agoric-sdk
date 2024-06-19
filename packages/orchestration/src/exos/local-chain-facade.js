/** @file ChainAccount exo */
import { V } from '@agoric/vow/vat.js';

import { ChainFacadeI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {OrchestrationService} from '../service.js';
 * @import {MakeLocalOrchestrationAccountKit} from './local-orchestration-account.js';
 * @import {ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount} from '../types.js';
 */

/**
 * @param {Zone} zone
 * @param {{
 *   makeLocalOrchestrationAccountKit: MakeLocalOrchestrationAccountKit;
 *   orchestration: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timer: Remote<TimerService>;
 *   localchain: Remote<LocalChain>;
 * }} powers
 */
export const prepareLocalChainFacade = (
  zone,
  { makeLocalOrchestrationAccountKit, localchain, storageNode },
) =>
  zone.exoClass(
    'LocalChainFacade',
    ChainFacadeI,
    /**
     * @param {CosmosChainInfo} localChainInfo
     */
    localChainInfo => {
      return { localChainInfo };
    },
    {
      async getChainInfo() {
        return this.state.localChainInfo;
      },

      // FIXME parameterize on the remoteChainInfo to make()
      // That used to work but got lost in the migration to Exo
      /** @returns {Promise<OrchestrationAccount<ChainInfo>>} */
      async makeAccount() {
        const { localChainInfo } = this.state;
        const lcaP = V(localchain).makeAccount();
        const [lca, address] = await Promise.all([lcaP, V(lcaP).getAddress()]);
        const { holder: account } = makeLocalOrchestrationAccountKit({
          account: lca,
          address: harden({
            address,
            chainId: localChainInfo.chainId,
            addressEncoding: 'bech32',
          }),
          // FIXME storage path
          storageNode,
        });

        return account;
      },
    },
  );
harden(prepareLocalChainFacade);
