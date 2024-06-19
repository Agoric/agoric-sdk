/** @file Orchestration service */

import { Fail } from '@agoric/assert';
import { V as E } from '@agoric/vow/vat.js';
import { Far } from '@endo/far';
// eslint-disable-next-line import/no-cycle -- FIXME
import { prepareOrchestrator } from './exos/orchestrator.js';

/**
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from './types.js';
 * @import {MakeLocalOrchestrationAccountKit} from './exos/local-orchestration-account.js';
 */

// FIXME turn this into an Exo
/**
 * @param {Remote<LocalChain>} localchain
 * @param {MakeLocalOrchestrationAccountKit} makeLocalOrchestrationAccountKit
 * @param {ChainInfo} localInfo
 * @returns {Chain}
 */
export const makeLocalChainFacade = (
  localchain,
  makeLocalOrchestrationAccountKit,
  localInfo,
) => {
  return Far('LocalChainFacade', {
    /** @returns {Promise<ChainInfo>} */
    async getChainInfo() {
      return localInfo;
    },

    async makeAccount() {
      const lcaP = E(localchain).makeAccount();
      const [lca, address] = await Promise.all([lcaP, E(lcaP).getAddress()]);
      const { holder: account } = makeLocalOrchestrationAccountKit({
        account: lca,
        address: harden({
          address,
          chainId: localInfo.chainId,
          addressEncoding: 'bech32',
        }),
        // @ts-expect-error TODO: Remote
        storageNode: null,
      });

      return account;
    },
  });
};

/**
 * @param {{
 *   zone: Zone;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 *   storageNode: Remote<StorageNode>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   localchain: Remote<LocalChain>;
 *   chainHub: import('./utils/chainHub.js').ChainHub;
 *   makeLocalOrchestrationAccountKit: MakeLocalOrchestrationAccountKit;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeCosmosOrchestrationAccount: any;
 *   makeRemoteChainFacade: any;
 *   asyncFlowTools: AsyncFlowTools;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  localchain,
  chainHub,
  makeLocalOrchestrationAccountKit,
  makeRecorderKit,
  makeRemoteChainFacade,
  asyncFlowTools,
}) => {
  (zone &&
    timerService &&
    zcf &&
    storageNode &&
    orchestrationService &&
    // @ts-expect-error type says defined but double check
    makeLocalOrchestrationAccountKit &&
    // @ts-expect-error type says defined but double check
    makeRecorderKit &&
    makeRemoteChainFacade &&
    asyncFlowTools) ||
    Fail`params missing`;

  const makeOrchestrator = prepareOrchestrator(zone, {
    asyncFlowTools,
    chainHub,
    localchain,
    makeLocalOrchestrationAccountKit,
    makeRecorderKit,
    makeRemoteChainFacade,
    orchestrationService,
    storageNode,
    timerService,
    zcf,
  });

  return {
    /**
     * @template Context
     * @template {any[]} Args
     * @param {string} durableName - the orchestration flow identity in the zone
     *   (to resume across upgrades)
     * @param {Context} ctx - values to pass through the async flow membrane
     * @param {(orc: Orchestrator, ctx2: Context, ...args: Args) => object} fn
     * @returns {(...args: Args) => Promise<unknown>}
     */
    orchestrate(durableName, ctx, fn) {
      const orc = makeOrchestrator();

      return async (...args) => fn(orc, ctx, ...args);
    },
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
