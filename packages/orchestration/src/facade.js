/** @file Orchestration facade */

import { assertAllDefined } from '@agoric/internal';

/**
 * @import {AsyncFlowTools, GuestInterface, HostArgs} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {HostOrchestrator} from './exos/orchestrator.js';
 * @import {Remote} from '@agoric/internal';
 * @import {CosmosInterchainService} from './exos/cosmos-interchain-service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, Orchestrator} from './types.js';
 */

/**
 * @param {{
 *   zone: Zone;
 *   timerService: Remote<TimerService>;
 *   zcf: ZCF;
 *   storageNode: Remote<StorageNode>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   makeRecorderKit: MakeRecorderKit;
 *   makeOrchestrator: () => HostOrchestrator;
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
  assertAllDefined({
    zone,
    timerService,
    zcf,
    storageNode,
    orchestrationService,
    makeRecorderKit,
    makeOrchestrator,
    vowTools,
    asyncFlowTools,
  });

  const { prepareEndowment, asyncFlow, adminAsyncFlow } = asyncFlowTools;

  const { when } = vowTools;

  /**
   * @template RT - return type
   * @template HC - host context
   * @template {any[]} GA - guest args
   * @param {string} durableName - the orchestration flow identity in the zone
   *   (to resume across upgrades)
   * @param {HC} hostCtx - values to pass through the async flow membrane
   * @param {(
   *   guestOrc: Orchestrator,
   *   guestCtx: GuestInterface<HC>,
   *   ...args: GA
   * ) => Promise<RT>} guestFn
   * @returns {(...args: HostArgs<GA>) => Promise<RT>}
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
      // @ts-expect-error cast
      when(hostFn(wrappedOrc, wrappedCtx, ...args));

    // @ts-expect-error cast
    return harden(orcFn);
  };

  /**
   * Orchestrate all the guest functions.
   *
   * NOTE multiple calls to this with the same guestFn name will fail
   *
   * @param {{ [durableName: string]: (...args: any[]) => any }} guestFns
   * @param {any} hostCtx
   */
  const orchestrateAll = (guestFns, hostCtx) =>
    Object.fromEntries(
      Object.entries(guestFns).map(([name, guestFn]) => [
        name,
        orchestrate(name, hostCtx, guestFn),
      ]),
    );

  return harden({
    adminAsyncFlow,
    orchestrate,
    orchestrateAll,
  });
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
