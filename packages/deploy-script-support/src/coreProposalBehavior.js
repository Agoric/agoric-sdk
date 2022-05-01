/**
 * Create a behavior for a core-eval proposal.
 *
 * We rely on directly stringifying this function to leverage our JS toolchain
 * for catching bugs.  Thus, this maker must not reference any other modules or
 * definitions.
 *
 * @param {object} opts
 * @param {string} opts.manifestInstallRef
 * @param {[string, ...unknown[]]} opts.getManifestCall
 * @param {typeof import('@endo/far').E} opts.E
 * @param {(...args: unknown[]) => void} [opts.log]
 * @param {(ref: string) => Promise<unknown>} [opts.restoreRef]
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestInstallRef,
  getManifestCall,
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

  const behavior = async allPowers => {
    const {
      consume: { board, agoricNamesAdmin },
      evaluateInstallation,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = allPowers;
    const [exportedGetManifest, ...manifestArgs] = getManifestCall;

    const restoreRef = overrideRestoreRef || (x => E(board).getValue(x));

    // Get the on-chain installation containing the manifest and behaviors.
    console.info('restoreRef, evaluateInstallation', {
      manifestInstallRef,
      exportedGetManifest,
    });
    const manifestInstallation = await restoreRef(manifestInstallRef);
    const behaviors = await evaluateInstallation(manifestInstallation);

    console.error('execute', {
      exportedGetManifest,
      behaviors: Object.keys(behaviors),
    });
    const {
      manifest,
      options: rawOptions,
      installations: rawInstallations,
    } = await behaviors[exportedGetManifest](
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
      behaviors,
      manifest,
      makeConfig: (name, _permit) => {
        log('coreProposal:', name);
        return { options };
      },
    });
  };

  // Make the behavior the completion value.
  return behavior;
};

export const makeEnactCoreProposalsFromBundleCap =
  ({ makeCoreProposalArgs, E }) =>
  allPowers => {
    const {
      vatPowers: { D },
      devices: { vatAdmin },
      consume: { zoe },
    } = allPowers;
    const restoreRef = async ref => {
      const { bundleID } = ref;
      const bundleCap = D(vatAdmin).getNamedBundleCap(bundleID);
      const bundle = D(bundleCap).getBundle();
      const install = await E(zoe).install(bundle);
      return install;
    };

    return Promise.all(
      makeCoreProposalArgs.map(async ({ ref, call }) => {
        const subBehavior = makeCoreProposalBehavior({
          manifestInstallRef: ref,
          getManifestCall: call,
          E,
          restoreRef,
        });
        return subBehavior(allPowers);
      }),
    );
  };
