// @ts-check
import { E, Far } from '@endo/far';

import { extract, makePromiseSpace } from './utils.js';
import {
  CLIENT_BOOTSTRAP_MANIFEST,
  CHAIN_BOOTSTRAP_MANIFEST,
  SIM_CHAIN_BOOTSTRAP_MANIFEST,
  GOVERNANCE_ACTIONS_MANIFEST,
  DEMO_ECONOMY,
} from './manifest.js';

import * as behaviors from './behaviors.js';
import * as simBehaviors from './sim-behaviors.js';
import * as clientBehaviors from './client-behaviors.js';

const { entries } = Object;
const { details: X, quote: q } = assert;

// Choose a manifest based on runtime configured argv.ROLE.
const roleToManifest = harden({
  chain: CHAIN_BOOTSTRAP_MANIFEST,
  'sim-chain': SIM_CHAIN_BOOTSTRAP_MANIFEST,
  client: CLIENT_BOOTSTRAP_MANIFEST,
});
const roleToBehaviors = harden({
  'sim-chain': { ...behaviors, ...simBehaviors },
  client: clientBehaviors,
});
const roleToGovernanceActions = harden({
  chain: CHAIN_POST_BOOT_MANIFEST,
  'sim-chain': SIM_CHAIN_POST_BOOT_MANIFEST,
  client: {},
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
  const { produce, consume } = makePromiseSpace(console.info);

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
     * @param {SoloDevices | ChainDevices} devices
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
              const {
                // TODO: use these for more than just visualization.
                home: _h,
                installation: _i1,
                instance: _i2,
                issuer: _i3,
                brand: _b,
                ...effectivePermit
              } = permit;
              const endowments = extract(effectivePermit, powers);
              const config = vatParameters[name];
              console.info(`bootstrap: ${name}(${q(permit)})`);
              return bootBehaviors[name](endowments, config);
            }),
          ),
        );
      };

      await runBehaviors(bootManifest);
      if (vatParameters.governanceActions) {
        const actions = roleToGovernanceActions[ROLE];
        await runBehaviors(actions);
      }
    },
  });
};

harden({ buildRootObject });
export { buildRootObject };
