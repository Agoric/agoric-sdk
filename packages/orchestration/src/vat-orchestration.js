import { Far } from '@endo/far';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareCosmosInterchainService } from './exos/cosmos-interchain-service.js';

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {CosmosOrchestrationPowers} from './exos/cosmos-interchain-service.js';
 */

/**
 * Build root object of the Orchestration vat.
 *
 * @param {VatPowers & {
 *   D: DProxy;
 * }} vatPowers
 * @param {never} vatParameters
 * @param {Baggage} baggage
 */
export const buildRootObject = (vatPowers, vatParameters, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareSwingsetVowTools(zone.subZone('VowTools'));
  const makeCosmosInterchainService = prepareCosmosInterchainService(
    zone.subZone('orchestration'),
    vowTools,
  );

  return Far('OrchestrationVat', {
    /** @param {Partial<CosmosOrchestrationPowers>} [initialPowers] */
    makeCosmosInterchainService(initialPowers = {}) {
      return makeCosmosInterchainService(initialPowers);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} OrchestrationVat */
