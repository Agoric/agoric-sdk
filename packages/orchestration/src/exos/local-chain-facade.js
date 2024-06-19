/** @file ChainAccount exo */
import { V } from '@agoric/vow/vat.js';

import { ChainFacadeI } from '../typeGuards.js';
import { Far } from '@endo/far';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Vow, VowTools} from '@agoric/vow';
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
 *   vowTools: VowTools;
 * }} powers
 */
export const prepareLocalChainFacade = (
  zone,
  {
    makeLocalOrchestrationAccountKit,
    localchain,
    storageNode,
    vowTools: { allVows, watch },
  },
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
      getChainInfo() {
        return this.state.localChainInfo;
      },

      // FIXME parameterize on the remoteChainInfo to make()
      // That used to work but got lost in the migration to Exo
      /** @returns {Vow<OrchestrationAccount<ChainInfo>>} */
      makeAccount() {
        const { localChainInfo } = this.state;
        const lcaP = V(localchain).makeAccount();

        return watch(
          allVows([lcaP, V(lcaP).getAddress()]),
          Far('makeAccount', {
            onFulfilled: ([lca, address]) => {
              const { holder: account } = makeLocalOrchestrationAccountKit({
                account: lca,
                address: harden({
                  address,
                  chainId: localChainInfo.chainId,
                  addressEncoding: 'bech32',
                }),
                // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
                storageNode,
              });

              return account;
            },
          }),
        );
      },
    },
  );
harden(prepareLocalChainFacade);
/** @typedef {ReturnType<typeof prepareLocalChainFacade>} MakeLocalChainFacade */
