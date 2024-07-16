/** @file Orchestration facade */

import { assertAllDefined } from '@agoric/internal';

/**
 * @import {AsyncFlowTools, GuestInterface, HostArgs, HostOf} from '@agoric/async-flow';
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
 * For a given guest passed to orchestrate(), return the host-side form.
 *
 * @template {(orc: Orchestrator, ctx: any, ...args: any[]) => Promise<any>} GF
 * @typedef {GF extends (
 *   orc: Orchestrator,
 *   ctx: any,
 *   ...args: infer GA
 * ) => Promise<infer GR>
 *   ? (...args: HostArgs<GA>) => Vow<GR>
 *   : never} HostForGuest
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

  /**
   * @template GR - return type
   * @template HC - host context
   * @template {any[]} GA - guest args
   * @param {string} durableName - the orchestration flow identity in the zone
   *   (to resume across upgrades)
   * @param {HC} hostCtx - values to pass through the async flow membrane
   * @param {(
   *   guestOrc: Orchestrator,
   *   guestCtx: GuestInterface<HC>,
   *   ...args: GA
   * ) => Promise<GR>} guestFn
   * @returns {(...args: HostArgs<GA>) => Vow<GR>}
   */
  const orchestrate = (durableName, hostCtx, guestFn) => {
    const subZone = zone.subZone(durableName);

    const hostOrc = makeOrchestrator();

    const [wrappedOrc, wrappedCtx] = prepareEndowment(subZone, 'endowments', [
      hostOrc,
      hostCtx,
    ]);

    const hostFn = asyncFlow(subZone, 'asyncFlow', guestFn);

    // cast because return could be arbitrary subtype
    const orcFn = /** @type {(...args: HostArgs<GA>) => Vow<GR>} */ (
      (...args) => hostFn(wrappedOrc, wrappedCtx, ...args)
    );

    return harden(orcFn);
  };

  /**
   * Orchestrate all the guest functions.
   *
   * NOTE multiple calls to this with the same guestFn name will fail
   *
   * @template HC - host context
   * @template {{
   *   [durableName: string]: (
   *     orc: Orchestrator,
   *     ctx: GuestInterface<HC>,
   *     ...args: any[]
   *   ) => Promise<any>;
   * }} GFM
   *   guest fn map
   * @param {GFM} guestFns
   * @param {HC} hostCtx
   * @returns {{ [N in keyof GFM]: HostForGuest<GFM[N]> }}
   */
  const orchestrateAll = (guestFns, hostCtx) =>
    /** @type {{ [N in keyof GFM]: HostForGuest<GFM[N]> }} */ (
      Object.fromEntries(
        Object.entries(guestFns).map(([name, guestFn]) => [
          name,
          orchestrate(name, hostCtx, guestFn),
        ]),
      )
    );

  return harden({
    adminAsyncFlow,
    orchestrate,
    orchestrateAll,
  });
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
