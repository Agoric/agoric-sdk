// @ts-check
import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools } from '@agoric/vow/vat.js';

import { prepareLocalChainTools } from './localchain.js';

/**
 * @import {LocalChainPowers} from './localchain.js';
 */

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareVowTools(zone.subZone('VowTools'));
  const { makeLocalChain, overridePowers } = prepareLocalChainTools(
    zone.subZone('localchain'),
    vowTools,
  );

  return Far('LocalChainVat', {
    /**
     * Create a local chain that allows permissionlessly making fresh local
     * chain accounts, then using them to send chain queries and transactions.
     *
     * @param {LocalChainPowers} powers
     */
    makeLocalChain(powers) {
      return makeLocalChain(powers);
    },

    /**
     * Override specific powers for prepareLocalChainTools. Explicitly
     * `undefined` values disable a power.
     *
     * @param {Partial<LocalChainPowers>} partialPowers
     */
    overridePowers(partialPowers) {
      overridePowers(partialPowers);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} LocalChainVat */
