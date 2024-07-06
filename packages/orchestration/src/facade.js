/** @file Orchestration service */

import { Fail } from '@endo/errors';
import { pickFacet } from '@agoric/vat-data';
import { prepareOrchestratorKit } from './exos/orchestrator.js';

/**
 * @import {AsyncFlowTools} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from './service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from './types.js';
 * @import {MakeLocalChainFacade} from './exos/local-chain-facade.js';
 * @import {MakeRemoteChainFacade} from './exos/remote-chain-facade.js';
 * @import {MakeLocalOrchestrationAccountKit} from './exos/local-orchestration-account.js';
 */

/**
 * @param {{
 *   zone: Zone;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 *   storageNode: Remote<StorageNode>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   chainHub: import('./exos/chain-hub.js').ChainHub;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeOrchestrator: () => Orchestrator;
 *   vowTools: VowTools;
 *   asyncFlowTools: AsyncFlowTools;
 * }} powers
 */
export const makeOrchestrationFacade = ({
  zone,
  timerService,
  zcf,
  storageNode,
  orchestrationService,
  makeRecorderKit,
  makeOrchestrator,
  vowTools,
  asyncFlowTools,
}) => {
  (zone &&
    timerService &&
    zcf &&
    storageNode &&
    orchestrationService &&
    // @ts-expect-error type says defined but double check
    makeRecorderKit &&
    // @ts-expect-error type says defined but double check
    makeOrchestrator &&
    asyncFlowTools) ||
    Fail`params missing`;

  const { prepareEndowment, asyncFlow, adminAsyncFlow } = asyncFlowTools;

  const { when } = vowTools;

  /**
   * @template GuestReturn
   * @template HostReturn
   * @template GuestContext
   * @template HostContext
   * @template {any[]} GuestArgs
   * @template {any[]} HostArgs
   * @param {string} durableName - the orchestration flow identity in the zone
   *   (to resume across upgrades)
   * @param {HostContext} hostCtx - values to pass through the async flow
   *   membrane
   * @param {(
   *   guestOrc: Orchestrator,
   *   guestCtx: GuestContext,
   *   ...args: GuestArgs
   * ) => Promise<GuestReturn>} guestFn
   * @returns {(...args: HostArgs) => Promise<HostReturn>} TODO returns a
   *   Promise for now for compat before use of asyncFlow. But really should be
   *   `Vow<HostReturn>`
   */
  const orchestrate = (durableName, hostCtx, guestFn) => {
    const subZone = zone.subZone(durableName);

    const hostOrc = makeOrchestrator();

    const [wrappedOrc, wrappedCtx] = prepareEndowment(subZone, 'endowments', [
      hostOrc,
      hostCtx,
    ]);

    const hostFn = asyncFlow(subZone, 'asyncFlow', guestFn);

    const orcFn = (...args) =>
      // TODO remove the `when` after fixing the return type
      // to `Vow<HostReturn>`
      when(hostFn(wrappedOrc, wrappedCtx, ...args));
    return harden(orcFn);
  };

  // NOTE multiple calls to this with the same guestFn name will fail
  const orchestrateAll = (guestFns, hostCtx) =>
    Object.fromEntries(
      Object.entries(guestFns).map(([name, guestFn]) => [
        name,
        orchestrate(name, hostCtx, guestFn),
      ]),
    );

  return {
    orchestrate,
    orchestrateAll,
    adminAsyncFlow,
  };
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
