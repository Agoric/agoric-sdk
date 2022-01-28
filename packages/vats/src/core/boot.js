// @ts-check
import { E, Far } from '@agoric/far';
import { extract, makePromiseSpace } from './utils.js';
import {
  CHAIN_BOOTSTRAP_MANIFEST,
  SIM_CHAIN_BOOTSTRAP_MANIFEST,
  GOVERNANCE_ACTIONS_MANIFEST,
} from './manifest.js';

import * as behaviors from './behaviors.js';
import * as simBehaviors from './sim-behaviors.js';

const { entries } = Object;
const { details: X, quote: q } = assert;

// Choose a manifest based on runtime configured argv.ROLE.
const roleToManifest = harden({
  chain: CHAIN_BOOTSTRAP_MANIFEST,
  'sim-chain': SIM_CHAIN_BOOTSTRAP_MANIFEST,
});
const roleToBehaviors = harden({
  'sim-chain': { ...behaviors, ...simBehaviors },
});

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: DProxy
 * }} vatPowers
 * @param {{
 *   argv: { ROLE: string },
 *   bootstrapManifest?: Record<string, Record<string, unknown>>,
 *   governanceActions?: boolean,
 * }} vatParameters
 */
const buildRootObject = (vatPowers, vatParameters) => {
  const { produce, consume } = makePromiseSpace();

  const {
    argv: { ROLE },
    bootstrapManifest,
  } = vatParameters;
  console.debug(`${ROLE} bootstrap starting`);

  const bootManifest = bootstrapManifest || roleToManifest[ROLE];
  const bootBehaviors = roleToBehaviors[ROLE] || behaviors;
  assert(bootManifest, X`no configured bootstrapManifest for role ${ROLE}`);
  assert(bootBehaviors, X`no configured bootstrapBehaviors for role ${ROLE}`);

  return Far('bootstrap', {
    /**
     * Bootstrap vats and devices.
     *
     * @param {SwingsetVats} vats
     * @param {SwingsetDevices} devices
     */
    bootstrap: async (vats, devices) => {
      // Complete SwingSet wiring.
      const { D } = vatPowers;
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);

      /** @param { Record<string, Record<string, unknown>> } manifest */
      const runBehaviors = manifest => {
        const powers = {
          vatPowers,
          vatParameters,
          vats,
          devices,
          produce,
          consume,
          runBehaviors,
        };
        return Promise.all(
          entries(manifest).map(([name, permit]) =>
            Promise.resolve().then(() => {
              const endowments = extract(permit, powers);
              console.info(`bootstrap: ${name}(${q(permit)})`);
              return bootBehaviors[name](endowments);
            }),
          ),
        );
      };

      await runBehaviors(bootManifest);
      if (vatParameters.governanceActions) {
        await runBehaviors(GOVERNANCE_ACTIONS_MANIFEST);
      }
    },
  });
};

harden({ buildRootObject });
export { buildRootObject };
