// @ts-check
import { makeBootstrap } from './lib-boot.js';

import * as basicBehaviorsPlus from './basic-behaviors.js';
import { SHARED_CHAIN_BOOTSTRAP_MANIFEST } from './chain-behaviors.js';
import { SIM_CHAIN_BOOTSTRAP_PERMITS } from './sim-behaviors.js';
import * as chainBehaviorsPlus from './chain-behaviors.js';
import * as simBehaviorsPlus from './sim-behaviors.js';
import * as utils from './utils.js';

export const MANIFEST = {
  ...SHARED_CHAIN_BOOTSTRAP_MANIFEST,
  ...SIM_CHAIN_BOOTSTRAP_PERMITS,
};

const {
  BASIC_BOOTSTRAP_PERMITS: _b,
  PowerFlags: _p,
  makeMyAddressNameAdminKit: _m,
  ...basicBehaviors
} = basicBehaviorsPlus;
const {
  CHAIN_BOOTSTRAP_MANIFEST: _c,
  SHARED_CHAIN_BOOTSTRAP_MANIFEST: _s,
  ...chainBehaviors
} = chainBehaviorsPlus;
const { SIM_CHAIN_BOOTSTRAP_PERMITS: _sc, ...simBehaviors } = simBehaviorsPlus;
const behaviors = { ...basicBehaviors, ...chainBehaviors, ...simBehaviors };

const modules = harden({ behaviors: { ...behaviors }, utils: { ...utils } });

/**
 * Build root object of the bootstrap vat for the simulated chain.
 *
 * @param {{
 *   D: DProxy,
 *   logger: (msg) => void,
 * }} vatPowers
 * @param {{
 *   coreProposalCode?: string,
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  console.debug(`sim bootstrap starting`);

  return makeBootstrap(vatPowers, vatParameters, MANIFEST, behaviors, modules);
};

harden({ buildRootObject });
