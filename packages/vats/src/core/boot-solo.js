import { makeBootstrap } from './lib-boot.js';

import * as basicBehaviorsPlus from './basic-behaviors.js';
import * as chainBehaviorsPlus from './chain-behaviors.js';
import * as clientBehaviorsPlus from './client-behaviors.js';
import * as utils from './utils.js';

const { BASIC_BOOTSTRAP_PERMITS: _b, ...basicBehaviors } = basicBehaviorsPlus;
const {
  CHAIN_BOOTSTRAP_MANIFEST: _c,
  SHARED_CHAIN_BOOTSTRAP_MANIFEST: _s,
  ...chainBehaviors
} = chainBehaviorsPlus;
const { CLIENT_BOOTSTRAP_MANIFEST, ...clientBehaviors } = clientBehaviorsPlus;
const behaviors = harden({
  ...basicBehaviors,
  ...chainBehaviors,
  ...clientBehaviors,
});

export const MANIFEST = CLIENT_BOOTSTRAP_MANIFEST;

const modules = harden({
  clientBehaviors: { ...clientBehaviors },
  behaviors: { ...behaviors },
  utils: { ...utils },
});

/**
 * Build root object of the bootstrap vat.
 *
 * @param {VatPowers & {
 *   D: DProxy;
 *   logger: (msg) => void;
 * }} vatPowers
 * @param {{
 *   bootstrapManifest?: Record<string, Record<string, unknown>>;
 *   coreProposalCodeSteps?: string[];
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  console.debug(`solo client bootstrap starting`);

  return makeBootstrap(vatPowers, vatParameters, MANIFEST, behaviors, modules);
};

harden({ buildRootObject });
