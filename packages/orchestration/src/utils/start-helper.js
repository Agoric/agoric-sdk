import { prepareAsyncFlowTools } from '@agoric/async-flow';
import { prepareVowTools } from '@agoric/vow';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareLocalOrchestrationAccountKit } from '../exos/local-orchestration-account.js';
import { makeOrchestrationFacade } from '../facade.js';
import { makeChainHub } from '../exos/chain-hub.js';
import { prepareRemoteChainFacade } from '../exos/remote-chain-facade.js';
import { prepareCosmosOrchestrationAccount } from '../exos/cosmos-orchestration-account.js';
import { prepareLocalChainFacade } from '../exos/local-chain-facade.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosInterchainService} from '../exos/cosmos-interchain-service.js';
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
 * @param {ZCF} zcf
 * @param {Baggage} baggage
 * @param {OrchestrationPowers} remotePowers
 * @param {Marshaller} marshaller
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
      asyncFlow: zone.subZone('asyncFlow'),
      /** for contract-provided names */
      contract: zone.subZone('contract'),
      orchestration: zone.subZone('orchestration'),
      vows: zone.subZone('vows'),
    };
  })();

  const { agoricNames, timerService } = remotePowers;

  const vowTools = prepareVowTools(zones.vows);

  const chainHub = makeChainHub(agoricNames, vowTools);

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zones.orchestration,
    makeRecorderKit,
    zcf,
    timerService,
    vowTools,
    chainHub,
  );

  const asyncFlowTools = prepareAsyncFlowTools(zones.asyncFlow, {
    vowTools,
  });

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zones.orchestration,
    makeRecorderKit,
    vowTools,
    zcf,
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
    orchestration: remotePowers.orchestrationService,
    timer: remotePowers.timerService,
    vowTools,
  });

  const facade = makeOrchestrationFacade({
    zcf,
    zone: zones.orchestration,
    chainHub,
    makeLocalOrchestrationAccountKit,
    makeRecorderKit,
    makeCosmosOrchestrationAccount,
    makeLocalChainFacade,
    makeRemoteChainFacade,
    asyncFlowTools,
    vowTools,
    ...remotePowers,
  });
  return { ...facade, chainHub, vowTools, zone: zones.contract };
};
harden(provideOrchestration);

/** @typedef {Omit<ReturnType<typeof provideOrchestration>, 'zone'>} OrchestrationTools */

/**
 * Simplifies contract functions for Orchestration by wrapping a simpler
 * function with all the tools it needs in order to use Orchestration.
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
