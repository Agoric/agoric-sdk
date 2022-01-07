// @ts-check
import { Far } from '@agoric/far';
import { makePromiseKit } from '@agoric/promise-kit';
// TODO: choose sim behaviors based on runtime config
import * as behaviors from './bootstrap-behaviors-sim.js';
import { simBootstrapManifest } from './bootstrap-behaviors-sim.js';

const { entries, fromEntries } = Object;
const { details: X, quote: q } = assert;

/**
 * Make { produce, consume } where for each name, `consume[name]` is a promise and `produce[name].resolve` resolves it.
 *
 * @returns {PromiseSpace}
 */
const makePromiseSpace = () => {
  /** @type {Map<string, PromiseRecord<unknown>>} */
  const state = new Map();

  const findOrCreateKit = name => {
    let kit = state.get(name);
    if (kit) {
      return kit;
    } else {
      console.info(name, ': new Promise');
      kit = makePromiseKit();
      state.set(name, kit);
      return kit;
    }
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
        promise.then(() => console.info(name, ': resolve'));
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
    return harden(
      fromEntries(
        entries(template).map(([propName, subTemplate]) => [
          propName,
          extract(subTemplate, specimen[propName]),
        ]),
      ),
    );
  } else {
    assert.fail(X`unexpected template: ${q(template)}`);
  }
};

const manifestByRole = {
  'sim-chain': simBootstrapManifest,
};
/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: EProxy // approximately
 * }} vatPowers
 * @param {{
 *   argv: Record<string, unknown>,
 * }} vatParameters
 */
const buildRootObject = (vatPowers, vatParameters) => {
  const { produce, consume } = makePromiseSpace();

  const { ROLE } = vatParameters.argv;
  console.debug(`${ROLE} bootstrap starting`);

  const manifest = manifestByRole[ROLE];
  assert(manifest, X`no manifest for ${ROLE}`);

  return Far('bootstrap', {
    /**
     * Bootstrap vats and devices.
     *
     * @param {SwingsetVats} vats
     * @param {SwingsetDevices} devices
     */
    bootstrap: (vats, devices) =>
      Promise.all(
        entries(manifest).map(([name, permit]) =>
          Promise.resolve().then(() => {
            const endowments = extract(permit, {
              vatPowers,
              vatParameters,
              vats,
              devices,
              produce,
              consume,
            });
            console.info(`bootstrap: ${name}(${q(permit)})`);
            return behaviors[name](endowments);
          }),
        ),
      ),
  });
};

harden({ buildRootObject, extract });
export { buildRootObject, extract };
