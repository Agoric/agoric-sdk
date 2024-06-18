import { prepareAsyncFlowTools } from '@agoric/async-flow';
import { prepareVowTools } from '@agoric/vow';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareLocalChainAccountKit } from '../exos/local-chain-account-kit.js';
import { makeOrchestrationFacade } from '../facade.js';
import { makeChainHub } from './chainHub.js';

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
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
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

  const facade = makeOrchestrationFacade({
    zcf,
    zone,
    chainHub,
    makeLocalChainAccountKit,
    makeRecorderKit,
    asyncFlowTools,
    ...remotePowers,
  });
  return { ...facade, chainHub, zone };
};
harden(provideOrchestration);
