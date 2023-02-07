const t = 'makeCoreProposalBehavior';

/**
 * TODO import these from @agoric/vats when the types are better managed
 *
 * @typedef {*} ChainBootstrapSpace
 * @typedef {*} BootstrapPowers
 */

export const permits = {
  consume: { board: t, agoricNamesAdmin: t },
  evaluateInstallation: t,
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
 * @param {{ bundleName: string?, bundleID: string?}} opts.manifestInstallRef
 * @param {[string, ...unknown[]]} opts.getManifestCall
 * @param {Record<string, Record<string, unknown>>} [opts.overrideManifest]
 * @param {typeof import('@endo/far').E} opts.E
 * @param {(...args: unknown[]) => void} [opts.log]
 * @param {(ref: unknown) => Promise<unknown>} [opts.restoreRef]
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestInstallRef,
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

  /** @param {ChainBootstrapSpace & BootstrapPowers & { evaluateInstallation: any }} allPowers */
  const behavior = async allPowers => {
    const {
      consume: { vatAdminService, zoe, agoricNamesAdmin },
      evaluateBundleCap,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = allPowers;
    const [exportedGetManifest, ...manifestArgs] = getManifestCall;

    const restoreRef = overrideRestoreRef || (({bundleID}) => E(zoe).installBundleID(bundleID));

    // Get the on-chain installation containing the manifest and behaviors.
    console.info('restoreRef, evaluateInstallation', {
      manifestInstallRef,
      exportedGetManifest,
    });
    const { bundleName, bundleID } = manifestInstallRef;
    let bundleCap;
    if (bundleName) {
      bundleCap = await E(vatAdminService).getNamedBundleCap(bundleName);
    } else {
      bundleCap = await E(vatAdminService).getBundleCap(bundleID);
    }

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

export const makeEnactCoreProposalsFromBundleName =
  ({ makeCoreProposalArgs, E }) =>
  async allPowers => {
    const {
      consume: { vatAdminService, zoe },
    } = allPowers;
    const restoreRef = async ref => {
      // extract-proposal.js creates these records, and bundleName is
      // the name under which the bundle was installed into
      // config.bundles
      const { bundleName } = ref;
      const bundleID = await E(vatAdminService).getBundleIDByName(bundleName);
      const install = await E(zoe).installBundleID(bundleID);
      return install;
    };

    await Promise.all(
      makeCoreProposalArgs.map(async ({ ref, call, overrideManifest }) => {
        const subBehavior = makeCoreProposalBehavior({
          manifestInstallRef: ref,
          getManifestCall: call,
          overrideManifest,
          E,
          restoreRef,
        });
        return subBehavior(allPowers);
      }),
    );
  };
