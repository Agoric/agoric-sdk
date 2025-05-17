import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeBootstrap } from './lib-boot.js';

import * as basicBehaviorsPlus from './basic-behaviors.js';
import * as chainBehaviorsPlus from './chain-behaviors.js';
import * as utils from './utils.js';

const { BASIC_BOOTSTRAP_PERMITS: _b, ...basicBehaviors } = basicBehaviorsPlus;
const {
  CHAIN_BOOTSTRAP_MANIFEST,
  SHARED_CHAIN_BOOTSTRAP_MANIFEST: _s,
  ...chainBehaviors
} = chainBehaviorsPlus;
const behaviors = { ...basicBehaviors, ...chainBehaviors };

export const modules = {
  behaviors: { ...behaviors },
  utils: { ...utils },
};
/** @typedef {typeof modules} BootstrapModules */

export const MANIFEST = CHAIN_BOOTSTRAP_MANIFEST;

/**
 * Build root object of the bootstrap vat.
 *
 * @param {VatPowers & {
 *   D: DProxy;
 *   logger: (msg) => void;
 * }} vatPowers
 * @param {{
 *   coreProposalCodeSteps?: string[];
 * }} vatParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const buildRootObject = (vatPowers, vatParameters, baggage) => {
  console.debug(`chain bootstrap starting`);
  const zone = makeDurableZone(baggage);

  return makeBootstrap(
    vatPowers,
    vatParameters,
    MANIFEST,
    behaviors,
    modules,
    zone,
  );
};

harden({ buildRootObject });
