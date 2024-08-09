/** @file Orchestration facade */

import { assertAllDefined } from '@agoric/internal';

/**
 * @import {AsyncFlowTools, GuestInterface, HostArgs, HostFn} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {TimerService} from '@agoric/time';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {HostOrchestrator} from './exos/orchestrator.js';
 * @import {Remote} from '@agoric/internal';
 * @import {CosmosInterchainService} from './exos/cosmos-interchain-service.js';
 * @import {Chain, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, OrchestrationFlow, Orchestrator} from './types.js';
 */

/**
 * For a given guest passed to orchestrate(), return the host-side form.
 *
 * @template {OrchestrationFlow} GF
 * @typedef {GF extends OrchestrationFlow<any, infer Args, infer Return>
 *     ? (...args: HostArgs<Args>) => Vow<Return>
 *     : never} HostForGuest
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

  const { prepareEndowment, asyncFlow } = asyncFlowTools;

  /**
   * @template HC - host context
   * @template {OrchestrationFlow<GuestInterface<HC>>} GF guest fn
   * @param {string} durableName - the orchestration flow identity in the zone
   *   (to resume across upgrades)
   * @param {HC} hostCtx - values to pass through the async flow membrane
   * @param {GF} guestFn
   * @returns {HostForGuest<GF>}
   */
  const orchestrate = (durableName, hostCtx, guestFn) => {
    const subZone = zone.subZone(durableName);
    const [wrappedCtx] = prepareEndowment(subZone, 'endowments', [hostCtx]);
    const hostFn = asyncFlow(subZone, 'asyncFlow', guestFn);

    // cast because return could be arbitrary subtype
    const orcFn = /** @type {HostForGuest<GF>} */ (
      (...args) => {
        // each invocation gets a new orchestrator
        const hostOrc = makeOrchestrator();
        // TODO: why are the types showing the guest types for arguments?
        // @ts-expect-error XXX fix broken types
        return hostFn(hostOrc, wrappedCtx, ...args);
      }
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
   *   [durableName: string]: OrchestrationFlow<GuestInterface<HC>>;
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
    orchestrate,
    orchestrateAll,
  });
};
harden(makeOrchestrationFacade);
/** @typedef {ReturnType<typeof makeOrchestrationFacade>} OrchestrationFacade */
