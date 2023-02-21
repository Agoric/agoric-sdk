// @ts-check
import * as simBehaviors from '@agoric/inter-protocol/src/proposals/sim-behaviors.js';
import {
  CLIENT_BOOTSTRAP_MANIFEST,
  CHAIN_BOOTSTRAP_MANIFEST,
  SIM_CHAIN_BOOTSTRAP_MANIFEST,
} from './manifest.js';

import * as behaviors from './behaviors.js';
import * as clientBehaviors from './client-behaviors.js';
import * as utils from './utils.js';
import { makeBootstrap } from './lib-boot.js';

const { Fail } = assert;

// Choose a manifest based on runtime configured argv.ROLE.
const roleToManifest = harden({
  chain: CHAIN_BOOTSTRAP_MANIFEST,
  'sim-chain': SIM_CHAIN_BOOTSTRAP_MANIFEST,
  client: CLIENT_BOOTSTRAP_MANIFEST,
});
const roleToBehaviors = harden({
  'sim-chain': { ...behaviors, ...simBehaviors },
  // copy to avoid trying to harden a module namespace
  client: { ...clientBehaviors },
});

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: DProxy,
 *   logger: (msg) => void,
 * }} vatPowers
 * @param {{
 *   argv: { ROLE: string },
 *   bootstrapManifest?: Record<string, Record<string, unknown>>,
 *   coreProposalCode?: string,
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  const {
    argv: { ROLE },
    bootstrapManifest,
  } = vatParameters;
  console.debug(`${ROLE} bootstrap starting`);

  const bootManifest = bootstrapManifest || roleToManifest[ROLE];
  const bootBehaviors = roleToBehaviors[ROLE] || behaviors;
  bootManifest || Fail`no configured bootstrapManifest for role ${ROLE}`;
  bootBehaviors || Fail`no configured bootstrapBehaviors for role ${ROLE}`;

  const modules = {
    clientBehaviors: { ...clientBehaviors },
    simBehaviors: { ...simBehaviors },
    behaviors: { ...behaviors },
    utils: { ...utils },
  };

  return makeBootstrap(
    vatPowers,
    vatParameters,
    bootManifest,
    behaviors,
    modules,
  );
};

harden({ buildRootObject });
