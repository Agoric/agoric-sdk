import { Far } from '@endo/far';
import { prepareVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareOrchestrationTools } from './service.js';

/** @import {OrchestrationPowers} from './service.js' */

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareVowTools(zone.subZone('VowTools'));
  const { makeOrchestrationKit } = prepareOrchestrationTools(
    zone.subZone('orchestration'),
    vowTools,
  );

  return Far('OrchestrationVat', {
    /** @param {Partial<OrchestrationPowers>} [initialPowers] */
    makeOrchestrationKit(initialPowers = {}) {
      return makeOrchestrationKit(initialPowers);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} OrchestrationVat */
