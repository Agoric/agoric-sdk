// @ts-check
const t = 'makeCoreProposalBehavior';

/**
 * TODO import these from @agoric/vats when the types are better managed
 *
 * @typedef {*} ChainBootstrapSpace
 * @typedef {*} BootstrapPowers
 */

export const permits = {
  consume: { board: t, agoricNamesAdmin: t },
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
 * @param {{ bundleName: string } | { bundleID: string }} opts.manifestBundleRef
 * @param {[string, ...unknown[]]} opts.getManifestCall
 * @param {Record<string, Record<string, unknown>>} [opts.overrideManifest]
 * @param {typeof import('@endo/far').E} opts.E
 * @param {(...args: unknown[]) => void} [opts.log]
 * @param {(ref: unknown) => Promise<unknown>} [opts.restoreRef]
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestBundleRef,
  getManifestCall,
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

  /** @param {ChainBootstrapSpace & BootstrapPowers & { evaluateBundleCap: any }} allPowers */
  const behavior = async allPowers => {
    const {
      consume: { vatAdminSvc, zoe, agoricNamesAdmin },
      evaluateBundleCap,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = allPowers;
    const [exportedGetManifest, ...manifestArgs] = getManifestCall;

    const defaultRestoreRef = async ref => {
      // extract-proposal.js creates these records, and bundleName is
      // the name under which the bundle was installed into
      // config.bundles
      const p = ref.bundleName
        ? E(vatAdminSvc).getBundleIDByName(ref.bundleName)
        : ref.bundleID;
      const bundleID = await p;
      return E(zoe).installBundleID(bundleID);
    };
    const restoreRef = overrideRestoreRef || defaultRestoreRef;

    // Get the on-chain installation containing the manifest and behaviors.
    console.info('evaluateBundleCap', {
      manifestBundleRef,
      exportedGetManifest,
      vatAdminSvc,
    });
    let bcapP;
    if ('bundleName' in manifestBundleRef) {
      bcapP = E(vatAdminSvc).getNamedBundleCap(manifestBundleRef.bundleName);
    } else {
      bcapP = E(vatAdminSvc).getBundleCap(manifestBundleRef.bundleID);
    }
    const bundleCap = await bcapP;

    const manifestNS = await evaluateBundleCap(bundleCap);

    console.error('execute', {
      exportedGetManifest,
      behaviors: Object.keys(manifestNS),
    });
    const {
      manifest,
      options: rawOptions,
      installations: rawInstallations,
    } = await manifestNS[exportedGetManifest](
      harden({ restoreRef }),
      ...manifestArgs,
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
      allPowers,
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
  async allPowers => {
    await Promise.all(
      makeCoreProposalArgs.map(async ({ ref, call, overrideManifest }) => {
        const subBehavior = makeCoreProposalBehavior({
          manifestBundleRef: ref,
          getManifestCall: call,
          overrideManifest,
          E,
        });
        return subBehavior(allPowers);
      }),
    );
  };
