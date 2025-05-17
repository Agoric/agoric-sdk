// @ts-check
const t = 'makeCoreProposalBehavior';

/**
 * @import {Installation} from '@agoric/zoe/src/zoeService/utils.js';
 */

/**
 * TODO import these from @agoric/vats when the types are better managed
 *
 * @typedef {*} ChainBootstrapSpace
 * @typedef {*} BootstrapPowers
 */

/**
 * @import {ManifestBundleRef} from './externalTypes.js'
 * @typedef {[methodName: string, ...args: unknown[]]} FlatMethargs
 * @typedef {Record<string, Record<string, unknown>>} Manifest
 */

/**
 * These permits are expected to be the minimum powers required by the
 * `coreProposalBehavior` function returned from `makeCoreProposalBehavior`.
 * They are merged with all of the manifest getter's permits to produce the
 * total permits needed by the resulting core proposal (such as might be---and
 * generally are---written into a *-permit.json file).
 * @see {@link ./writeCoreEvalParts.js}
 */
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
 * @param {object} inputs
 * @param {ManifestBundleRef} inputs.manifestBundleRef
 * @param {FlatMethargs} inputs.getManifestCall
 * @param {Manifest} [inputs.customManifest]
 * @param {typeof import('@endo/far').E} inputs.E
 * @param {(...args: unknown[]) => void} [inputs.log]
 * @param {(ref: import('./externalTypes.js').ManifestBundleRef) => Promise<import('@agoric/zoe/src/zoeService/utils.js').Installation<unknown>>} [inputs.customRestoreRef]
 * @returns {(vatPowers: unknown) => Promise<unknown>}
 */
export const makeCoreProposalBehavior = ({
  manifestBundleRef,
  getManifestCall: [manifestGetterName, ...manifestGetterArgs],
  customManifest,
  E,
  log = console.info,
  customRestoreRef,
}) => {
  const { entries, fromEntries } = Object;

  /**
   * Given an object whose properties may be promise-valued, return a promise
   * for an analogous object in which each such value has been replaced with its
   * fulfillment.
   * This is a non-recursive form of endo `deeplyFulfilled`.
   *
   * @template T
   * @param {{[K in keyof T]: (T[K] | Promise<T[K]>)}} obj
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

  const makeRestoreRef = (vatAdminSvc, zoe) => {
    /** @type {(ref: import('./externalTypes.js').ManifestBundleRef) => Promise<Installation<unknown>>} */
    const defaultRestoreRef = async bundleRef => {
      // extract-proposal.js creates these records, and bundleName is
      // the optional name under which the bundle was installed into
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
  const coreProposalBehavior = async powers => {
    // NOTE: `powers` is expected to match or be a superset of the above `permits` export,
    // which should therefore be kept in sync with this deconstruction code.
    // HOWEVER, do note that this function is invoked with at least the *union* of powers
    // required by individual moduleBehaviors declared by the manifest getter, which is
    // necessary so it can use `runModuleBehaviors` to provide the appropriate subset to
    // each one (see ./writeCoreEvalParts.js).
    // Handle `powers` with the requisite care.
    const {
      consume: { vatAdminSvc, zoe, agoricNamesAdmin },
      evaluateBundleCap,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = powers;

    // Get the on-chain installation containing the manifest and behaviors.
    log('evaluateBundleCap', {
      manifestBundleRef,
      manifestGetterName,
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

    const proposalNS = await evaluateBundleCap(bundleCap);

    // Get the manifest and its metadata.
    log('execute', {
      manifestGetterName,
      bundleExports: Object.keys(proposalNS),
    });
    const restoreRef = customRestoreRef || makeRestoreRef(vatAdminSvc, zoe);
    const {
      manifest,
      options: rawOptions,
      installations: rawInstallations,
    } = await proposalNS[manifestGetterName](
      harden({ restoreRef }),
      ...manifestGetterArgs,
    );

    // Await promises in the returned options and installations records.
    const [options, installations] = await Promise.all(
      [rawOptions, rawInstallations].map(shallowlyFulfilled),
    );

    // Publish the installations for our dependencies.
    const installationEntries = entries(installations || {});
    if (installationEntries.length > 0) {
      const installAdmin = E(agoricNamesAdmin).lookupAdmin('installation');
      await Promise.all(
        installationEntries.map(([key, value]) => {
          produceInstallations[key].reset();
          produceInstallations[key].resolve(value);
          return E(installAdmin).update(key, value);
        }),
      );
    }

    // Evaluate the manifest.
    return runModuleBehaviors({
      // Remember that `powers` may be arbitrarily broad.
      allPowers: powers,
      behaviors: proposalNS,
      manifest: customManifest || manifest,
      makeConfig: (name, _permit) => {
        log('coreProposal:', name);
        return { options };
      },
    });
  };

  return coreProposalBehavior;
};

/**
 * @param {object} inputs
 * @param {Array<{ ref: ManifestBundleRef, call: FlatMethargs, customManifest?: Manifest }>} inputs.metadataRecords
 * @param {typeof import('@endo/far').E} inputs.E
 */
export const makeEnactCoreProposalsFromBundleRef = ({ metadataRecords, E }) => {
  /**
   * @param {ChainBootstrapSpace & BootstrapPowers & { evaluateBundleCap: any }} powers
   * @returns {Promise<void>}
   */
  const enactCoreProposals = async powers => {
    await Promise.all(
      metadataRecords.map(async ({ ref, call, customManifest }) => {
        const coreProposalBehavior = makeCoreProposalBehavior({
          manifestBundleRef: ref,
          getManifestCall: call,
          customManifest,
          E,
        });
        return coreProposalBehavior(powers);
      }),
    );
  };
  return enactCoreProposals;
};
