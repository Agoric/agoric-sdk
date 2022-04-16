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
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestInstallRef,
  getManifestCall,
  E,
  log = console.info,
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
      consume: { board },
      evaluateInstallation,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = allPowers;
    const [exportedGetManifest, ...manifestArgs] = getManifestCall;

    // Get the on-chain installation containing the manifest and behaviors.
    const manifestInstallation = await E(board).getValue(manifestInstallRef);
    const behaviors = await evaluateInstallation(manifestInstallation);

    const restoreRef = x => E(board).getValue(x);
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
    entries(installations || {}).forEach(([key, value]) => {
      produceInstallations[key].resolve(value);
    });

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
