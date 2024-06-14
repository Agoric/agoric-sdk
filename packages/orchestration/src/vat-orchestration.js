import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareOrchestrationTools } from './service.js';

/** @import {OrchestrationPowers} from './service.js' */

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const { makeOrchestrationKit } = prepareOrchestrationTools(
    zone.subZone('orchestration'),
  );

  return Far('OrchestrationVat', {
    /** @param {Partial<OrchestrationPowers>} [initialPowers] */
    makeOrchestrationKit(initialPowers = {}) {
      return makeOrchestrationKit(initialPowers);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} OrchestrationVat */
