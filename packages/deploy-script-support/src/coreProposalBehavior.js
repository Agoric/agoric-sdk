// @ts-check
const t = 'makeCoreProposalBehavior';

/**
 * TODO import these from @agoric/vats when the types are better managed
 *
 * @typedef {*} ChainBootstrapSpace
 * @typedef {*} BootstrapPowers
 */

// These permits limit the powers passed to the `behavior` function returned by
// `makeCoreProposalBehavior`.
export const permits = {
  consume: { agoricNamesAdmin: t, vatAdminSvc: t, zoe: t },
  evaluateBundleCap: t,
  installation: { produce: t },
  modules: { utils: { runModuleBehaviors: t } },
};

/**
 * Create a behavior for a core-eval proposal.
 *
 * We rely on directly stringifying this function to leverage our JS toolchain
 * for catching bugs.  Thus, this maker must not reference any other modules or
 * definitions.
 *
 * @param {object} opts
 * @param {import('./externalTypes.js').ManifestBundleRef} opts.manifestBundleRef
 * @param {[methodName: string, ...args: unknown[]]} opts.getManifestCall
 * @param {Record<string, Record<string, unknown>>} [opts.overrideManifest]
 * @param {typeof import('@endo/far').E} opts.E
 * @param {(...args: unknown[]) => void} [opts.log]
 * @param {(ref: import('./externalTypes.js').ManifestBundleRef) => Promise<import('@agoric/zoe/src/zoeService/utils.js').Installation<unknown>>} [opts.restoreRef]
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestBundleRef,
  getManifestCall: [manifestGetterName, ...manifestGetterArgs],
  overrideManifest,
  E,
  log = console.info,
  restoreRef: overrideRestoreRef,
}) => {
  const { entries, fromEntries } = Object;

  // deeplyFulfilled is a bit overkill for what we need.
  const shallowlyFulfilled = async obj => {
    if (!obj) {
      return obj;
    }
    const ents = await Promise.all(
      entries(obj).map(async ([key, valueP]) => {
        const value = await valueP;
        return [key, value];
      }),
    );
    return fromEntries(ents);
  };

  const makeRestoreRef = (vatAdminSvc, zoe) => {
    /** @type {(ref: import('./externalTypes.js').ManifestBundleRef) => Promise<Installation<unknown>>} */
    const defaultRestoreRef = async bundleRef => {
      // extract-proposal.js creates these records, and bundleName is
      // the name under which the bundle was installed into
      // config.bundles
      const bundleIdP =
        'bundleName' in bundleRef
          ? E(vatAdminSvc).getBundleIDByName(bundleRef.bundleName)
          : bundleRef.bundleID;
      const bundleID = await bundleIdP;
      const label = bundleID.slice(0, 8);
      return E(zoe).installBundleID(bundleID, label);
    };
    return defaultRestoreRef;
  };

  /** @param {ChainBootstrapSpace & BootstrapPowers & { evaluateBundleCap: any }} powers */
  const behavior = async powers => {
    // NOTE: If updating any of these names extracted from `powers`, you must
    // change `permits` above to reflect their accessibility.
    const {
      consume: { vatAdminSvc, zoe, agoricNamesAdmin },
      evaluateBundleCap,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = powers;

    // Get the on-chain installation containing the manifest and behaviors.
    console.info('evaluateBundleCap', {
      manifestBundleRef,
      exportedGetManifest: manifestGetterName,
      vatAdminSvc,
    });
    let bcapP;
    if ('bundleName' in manifestBundleRef) {
      bcapP = E(vatAdminSvc).getNamedBundleCap(manifestBundleRef.bundleName);
    } else if ('bundleID' in manifestBundleRef) {
      bcapP = E(vatAdminSvc).getBundleCap(manifestBundleRef.bundleID);
    } else {
      const keys = Reflect.ownKeys(manifestBundleRef).map(key =>
        typeof key === 'string' ? JSON.stringify(key) : String(key),
      );
      const keysStr = `[${keys.join(', ')}]`;
      throw Error(
        `bundleRef must have own bundleName or bundleID, missing in ${keysStr}`,
      );
    }
    const bundleCap = await bcapP;

    const manifestNS = await evaluateBundleCap(bundleCap);

    // Get the manifest and its metadata.
    console.error('execute', {
      exportedGetManifest: manifestGetterName,
      behaviors: Object.keys(manifestNS),
    });
    const restoreRef = overrideRestoreRef || makeRestoreRef(vatAdminSvc, zoe);
    const {
      manifest,
      options: rawOptions,
      installations: rawInstallations,
    } = await manifestNS[manifestGetterName](
      harden({ restoreRef }),
      ...manifestGetterArgs,
    );

    // Await references in the options or installations.
    const [options, installations] = await Promise.all(
      [rawOptions, rawInstallations].map(shallowlyFulfilled),
    );

    // Publish the installations for behavior dependencies.
    const installAdmin = E(agoricNamesAdmin).lookupAdmin('installation');
    await Promise.all(
      entries(installations || {}).map(([key, value]) => {
        produceInstallations[key].resolve(value);
        return E(installAdmin).update(key, value);
      }),
    );

    // Evaluate the manifest for our behaviors.
    return runModuleBehaviors({
      allPowers: powers,
      behaviors: manifestNS,
      manifest: overrideManifest || manifest,
      makeConfig: (name, _permit) => {
        log('coreProposal:', name);
        return { options };
      },
    });
  };

  // Make the behavior the completion value.
  return behavior;
};

export const makeEnactCoreProposalsFromBundleRef =
  ({ makeCoreProposalArgs, E }) =>
  async powers => {
    await Promise.all(
      makeCoreProposalArgs.map(async ({ ref, call, overrideManifest }) => {
        const subBehavior = makeCoreProposalBehavior({
          manifestBundleRef: ref,
          getManifestCall: call,
          overrideManifest,
          E,
        });
        return subBehavior(powers);
      }),
    );
  };
