// @ts-check
import { makeBootstrap } from './lib-boot.js';

import * as basicBehaviorsPlus from './basic-behaviors.js';
import * as chainBehaviorsPlus from './chain-behaviors.js';
import * as simBehaviorsPlus from './sim-behaviors.js';
import * as startNetPlus from './startNetIBC.js';
import * as utils from './utils.js';

const { BASIC_BOOTSTRAP_PERMITS: _b, ...basicBehaviors } = basicBehaviorsPlus;
const {
  CHAIN_BOOTSTRAP_MANIFEST: _c,
  SHARED_CHAIN_BOOTSTRAP_MANIFEST,
  ...chainBehaviors
} = chainBehaviorsPlus;
const { SIM_CHAIN_BOOTSTRAP_PERMITS, ...simBehaviors } = simBehaviorsPlus;
const { NET_MANIFEST, getNetIBCManifest: _g, ...startNet } = startNetPlus;

export const MANIFEST = {
  ...SHARED_CHAIN_BOOTSTRAP_MANIFEST,
  ...SIM_CHAIN_BOOTSTRAP_PERMITS,
  ...NET_MANIFEST,
};

const behaviors = {
  ...basicBehaviors,
  ...chainBehaviors,
  ...simBehaviors,
  ...startNet,
};

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
