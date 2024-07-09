import { Far } from '@endo/far';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareCosmosInterchainService } from './exos/cosmos-interchain-service.js';

/** @import {OrchestrationPowers} from './exos/cosmos-interchain-service.js' */

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareSwingsetVowTools(zone.subZone('VowTools'));
  const makeCosmosInterchainService = prepareCosmosInterchainService(
    zone.subZone('orchestration'),
    vowTools,
  );

  return Far('OrchestrationVat', {
    /** @param {Partial<OrchestrationPowers>} [initialPowers] */
    makeCosmosInterchainService(initialPowers = {}) {
      return makeCosmosInterchainService(initialPowers);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} OrchestrationVat */
