import { prepareAsyncFlowTools } from '@agoric/async-flow';
import { prepareVowTools } from '@agoric/vow';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeChainHub } from '../exos/chain-hub.js';
import { prepareCosmosOrchestrationAccount } from '../exos/cosmos-orchestration-account.js';
import { prepareLocalChainFacade } from '../exos/local-chain-facade.js';
import { prepareLocalOrchestrationAccountKit } from '../exos/local-orchestration-account.js';
import { prepareOrchestrator } from '../exos/orchestrator.js';
import { prepareRemoteChainFacade } from '../exos/remote-chain-facade.js';
import { makeOrchestrationFacade } from '../facade.js';
import { makeZoeTools } from './zoe-tools.js';
import { makeZcfTools } from './zcf-tools.js';

/**
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosInterchainService} from '../exos/exo-interfaces.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   agoricNames: Remote<NameHub>;
 * }} OrchestrationPowers
 */

/**
 * Helper that a contract start function can use to set up the objects needed
 * for orchestration.
 *
 * TODO strip problematic operations from ZCF (e.g., getPayouts)
 *
 * @param {ZCF} zcf
 * @param {Baggage} baggage
 * @param {OrchestrationPowers} remotePowers
 * @param {Marshaller} marshaller
 * @internal
 */
export const provideOrchestration = (
  zcf,
  baggage,
  remotePowers,
  marshaller,
) => {
  zcf.setTestJig(() => ({
    baggage,
  }));

  // separate zones
  const zones = (() => {
    const zone = makeDurableZone(baggage);
    return {
      /** system names for async flow */
      asyncFlow: zone.subZone('asyncFlow'),
      /** system names for orchestration implementation */
      orchestration: zone.subZone('orchestration'),
      /** system names for chainHub */
      chainHub: zone.subZone('chainHub'),
      /** system names for vows */
      vows: zone.subZone('vows'),
      /** contract-provided names, and subzones */
      contract: zone.subZone('contract'),
    };
  })();

  const { agoricNames, timerService, localchain } = remotePowers;

  const vowTools = prepareVowTools(zones.vows);

  const chainHub = makeChainHub(zones.chainHub, agoricNames, vowTools);

  const zoeTools = makeZoeTools(zcf, vowTools);

  const zcfTools = makeZcfTools(zcf, vowTools);

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zones.orchestration,
    {
      makeRecorderKit,
      zcf,
      timerService,
      vowTools,
      chainHub,
      localchain,
      zoeTools,
    },
  );

  const asyncFlowTools = prepareAsyncFlowTools(zones.asyncFlow, {
    vowTools,
  });

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zones.orchestration,
    {
      chainHub,
      makeRecorderKit,
      timerService,
      vowTools,
      zcf,
    },
  );

  const makeRemoteChainFacade = prepareRemoteChainFacade(zones.orchestration, {
    makeCosmosOrchestrationAccount,
    orchestration: remotePowers.orchestrationService,
    storageNode: remotePowers.storageNode,
    timer: remotePowers.timerService,
    vowTools,
  });

  const makeLocalChainFacade = prepareLocalChainFacade(zones.orchestration, {
    makeLocalOrchestrationAccountKit,
    localchain: remotePowers.localchain,
    // FIXME what path?
    storageNode: remotePowers.storageNode,
    agoricNames,
    orchestration: remotePowers.orchestrationService,
    timer: remotePowers.timerService,
    vowTools,
  });

  const makeOrchestrator = prepareOrchestrator(zones.orchestration, {
    asyncFlowTools,
    chainHub,
    localchain: remotePowers.localchain,
    makeRecorderKit,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    storageNode: remotePowers.storageNode,
    orchestrationService: remotePowers.orchestrationService,
    timerService,
    vowTools,
    zcf,
  });

  /**
   * Create orchestrate functions in a specific zone, instead of the default
   * `contract.orchestration` zone. This is used for modules that add their own
   * orchestration functions (e.g., a Portfolio with orchestration flows for
   * continuing offers)
   *
   * @param {Zone} zone
   */
  const makeOrchestrateKit = zone =>
    makeOrchestrationFacade({
      zone,
      zcf,
      makeRecorderKit,
      makeOrchestrator,
      asyncFlowTools,
      vowTools,
      ...remotePowers,
    });

  // Create orchestrate functions for the default `contract.orchestration` zone
  const defaultOrchestrateKit = makeOrchestrateKit(
    zones.contract.subZone('orchestration'),
  );

  return {
    ...defaultOrchestrateKit,
    makeOrchestrateKit,
    chainHub,
    vowTools,
    asyncFlowTools,
    zcfTools,
    zoeTools,
    zone: zones.contract,
  };
};
harden(provideOrchestration);

/** @typedef {Omit<ReturnType<typeof provideOrchestration>, 'zone'>} OrchestrationTools */

/**
 * Simplifies contract functions for Orchestration by wrapping a simpler
 * function with all the tools it needs in order to use Orchestration.
 *
 * @example
 *
 * ```js
 * const contract = (zcf, privateArgs, zone, tools) => { ... };
 * export const start = withOrchestration(contract);
 * ```
 *
 * @template {Record<string, unknown>} CT
 * @template {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} PA
 * @template R
 * @param {(
 *   zcf: ZCF<CT>,
 *   privateArgs: PA,
 *   zone: Zone,
 *   tools: OrchestrationTools,
 * ) => Promise<R>} contractFn
 * @returns {(zcf: ZCF<CT>, privateArgs: PA, baggage: Baggage) => Promise<R>} a
 *   Zoe start function
 */
export const withOrchestration =
  contractFn => async (zcf, privateArgs, baggage) => {
    const { zone, ...tools } = provideOrchestration(
      zcf,
      baggage,
      privateArgs,
      privateArgs.marshaller,
    );
    return contractFn(zcf, privateArgs, zone, tools);
  };
harden(withOrchestration);
