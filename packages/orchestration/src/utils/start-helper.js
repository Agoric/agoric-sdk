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

  const chainHub = makeChainHub(remotePowers.agoricNames);

  const vowTools = prepareVowTools(zone.subZone('vows'));

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
    remotePowers.timerService,
    vowTools,
    chainHub,
  );

  const asyncFlowTools = prepareAsyncFlowTools(zone.subZone('asyncFlow'), {
    vowTools,
  });

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    // FIXME what zone?
    zone,
    makeRecorderKit,
    vowTools,
    zcf,
  );

  const makeRemoteChainFacade = prepareRemoteChainFacade(zone, {
    makeCosmosOrchestrationAccount,
    orchestration: remotePowers.orchestrationService,
    storageNode: remotePowers.storageNode,
    timer: remotePowers.timerService,
    vowTools,
  });

  const makeLocalChainFacade = prepareLocalChainFacade(zone, {
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
    zone,
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
  return { ...facade, chainHub, zone };
};
harden(provideOrchestration);
