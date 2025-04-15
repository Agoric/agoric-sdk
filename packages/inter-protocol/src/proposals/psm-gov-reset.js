/* global E */
/**
 * @import {EconomyBootstrapPowers} from './econ-behaviors'
 */

const ISTUnit = 1_000_000n;
const MintLimitValue = 500_000n * ISTUnit;

let tick = 0;
const trace = (...args) => console.log('--- PGRe', (tick += 1), ...args);

trace('script started');

const { entries, fromEntries } = Object;

/**
 * Given an object whose properties may be promise-valued, return a promise for
 * an analogous object in which each such value has been replaced with its
 * fulfillment. This is a non-recursive form of endo `deeplyFulfilled`.
 *
 * @template T
 * @param {{ [K in keyof T]: T[K] | Promise<T[K]> }} obj
 * @returns {Promise<T>}
 */
const shallowlyFulfilled = async obj => {
  if (!obj) {
    return obj;
  }
  const awaitedEntries = await Promise.all(
    entries(obj).map(async ([key, valueP]) => {
      const value = await valueP;
      return [key, value];
    }),
  );
  return fromEntries(awaitedEntries);
};

/**
 * null case is vestigial
 *
 * @typedef {{
 *   consume: { chainStorage: Promise<StorageNode> };
 * }} ChainStorageNonNull
 */

/**
 * Reset MintLimit on all PSMs to 50K IST.
 *
 * parts adapted from packages/vats/src/proposals/upgrade-psm-proposal.js
 *
 * @param {EconomyBootstrapPowers & ChainStorageNonNull} powers
 * @param {object} [opts]
 * @param {string} opts.bundleID
 */
const resetPSMMintLimits = async (
  powers,
  opts = {
    // see psm-bundle-check.test.js
    bundleID:
      'b1-29e7a47537e6fedccb75dd2c01e28a4bfdf787c6c3c7d7e06156627ed5b31ba80aa05727d10350fa776af0d13eacf15af586da7a8468e9fa0a3f9d41727fc67a',
  },
) => {
  trace('resetPSMMintLimits', opts);
  const { economicCommitteeCreatorFacet, instancePrivateArgs, psmKit, zoe } =
    powers.consume;
  const { bundleID } = opts;

  const ISTbrand = await powers.brand.consume.IST;
  const MintLimit = harden({ brand: ISTbrand, value: MintLimitValue });
  trace({ MintLimit });

  const psmKitMap = await psmKit;
  for (const kit of psmKitMap.values()) {
    // const instanceKey = `psm-${Stable.symbol}-${keyword}`;
    const [_psm, _ist, keyword] = kit.label.split('-');
    trace('PSM name(s)', kit.label, keyword);
    assert(keyword, kit.label);

    const privateArgsPre = await shallowlyFulfilled(
      // @ts-expect-error instancePrivateArgs is a mixed bag
      await E(instancePrivateArgs).get(kit.psm),
    );
    const toPose = await E(economicCommitteeCreatorFacet).getPoserInvitation();
    const privateArgs = {
      ...privateArgsPre,
      paramUpdates: { MintLimit },
      initialPoserInvitation: toPose,
    };
    trace(keyword, 'privateArgs', privateArgs);
    const it = await E(kit.psmAdminFacet).upgradeContract(
      bundleID,
      privateArgs,
    );
    trace('upgraded', keyword, it);
  }
};
harden(resetPSMMintLimits);

trace('"export" using completion value', resetPSMMintLimits);
resetPSMMintLimits;
