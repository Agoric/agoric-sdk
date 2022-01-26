// @ts-check
import { E, Far } from '@agoric/far';
import { makePromiseKit } from '@agoric/promise-kit';
import {
  CHAIN_BOOTSTRAP_MANIFEST,
  SIM_CHAIN_BOOTSTRAP_MANIFEST,
  GOVERNANCE_ACTIONS_MANIFEST,
} from './manifest.js';

import * as behaviors from './behaviors.js';
import * as simBehaviors from './sim-behaviors.js';

const { entries, fromEntries, keys } = Object;
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
 * Make { produce, consume } where for each name, `consume[name]` is a promise
 * and `produce[name].resolve` resolves it.
 *
 * @returns {PromiseSpace}
 */
const makePromiseSpace = () => {
  /** @type {Map<string, PromiseRecord<unknown>>} */
  const state = new Map();
  const remaining = new Set();

  const findOrCreateKit = name => {
    let kit = state.get(name);
    if (!kit) {
      console.info(`${name}: new Promise`);
      kit = makePromiseKit();
      state.set(name, kit);
      remaining.add(name);
    }
    return kit;
  };

  const consume = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const kit = findOrCreateKit(name);
        return kit.promise;
      },
    },
  );

  const produce = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const { resolve, promise } = findOrCreateKit(name);
        // promise.then(
        // () => console.info(name, ': resolve'),
        // e => console.info(name, ': reject', e),
        // );
        promise.finally(() => {
          remaining.delete(name);
          console.info(
            name,
            'settled; remaining:',
            [...remaining.keys()].sort(),
          );
        });
        // Note: repeated resolves() are noops.
        return harden({ resolve });
      },
    },
  );

  return harden({ produce, consume });
};

/**
 * @param {unknown} template
 * @param {unknown} specimen
 */
const extract = (template, specimen) => {
  if (template === true) {
    return specimen;
  } else if (typeof template === 'object' && template !== null) {
    if (typeof specimen !== 'object' || specimen === null) {
      assert.fail(X`object template requires object specimen, not ${specimen}`);
    }
    const target = harden(
      fromEntries(
        entries(template).map(([propName, subTemplate]) => [
          propName,
          extract(subTemplate, specimen[propName]),
        ]),
      ),
    );
    return new Proxy(target, {
      get: (t, propName) => {
        if (typeof propName !== 'symbol') {
          assert(
            propName in t,
            X`${propName} not permitted, only ${keys(template)}`,
          );
        }
        return t[propName];
      },
    });
  } else {
    assert.fail(X`unexpected template: ${q(template)}`);
  }
};

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

harden({ buildRootObject, extract });
export { buildRootObject, extract };
