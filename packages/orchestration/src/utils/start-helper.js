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
import { makeZoeUtils } from './zoeutils.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {OrchestrationService} from '../service.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<OrchestrationService>;
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
 */
export const provideOrchestration = (
  zcf,
  baggage,
  remotePowers,
  marshaller,
) => {
  const zone = makeDurableZone(baggage);
  const { agoricNames, timerService } = remotePowers;

  const chainHub = makeChainHub(agoricNames);

  const vowTools = prepareVowTools(zone.subZone('vows'));

  const zoeTools = makeZoeUtils(zone.subZone('zoe'), { zcf, vowTools });

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
    timerService,
    vowTools,
    chainHub,
  );

  const asyncFlowTools = prepareAsyncFlowTools(zone.subZone('asyncFlow'), {
    vowTools,
  });

  const orchZone = zone.subZone('orchestration');
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    // FIXME what zone?
    orchZone,
    makeRecorderKit,
    vowTools,
    zcf,
  );

  const makeRemoteChainFacade = prepareRemoteChainFacade(orchZone, {
    makeCosmosOrchestrationAccount,
    orchestration: remotePowers.orchestrationService,
    storageNode: remotePowers.storageNode,
    timer: remotePowers.timerService,
    vowTools,
  });

  const makeLocalChainFacade = prepareLocalChainFacade(orchZone, {
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
    zone: orchZone.subZone('orchestrationFunctions'),
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
  return { ...facade, chainHub, vowTools, zone, zoeTools };
};
harden(provideOrchestration);

/**
 * @template {unknown} CT
 * @template {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} PA
 * @template {any} R
 * @param {(
 *   zcf: ZCF<CT>,
 *   privateArgs: PA,
 *   zone: Zone,
 *   rest: Omit<ReturnType<typeof provideOrchestration>, 'zone'>,
 * ) => Promise<R>} fn
 * @returns {(zcf: ZCF<CT>, privateArgs: PA, baggage: Baggage) => Promise<R>}
 */
export const withOrchestration = fn => async (zcf, privateArgs, baggage) => {
  const { zone, ...rest } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );
  return fn(zcf, privateArgs, zone, rest);
};
harden(withOrchestration);
