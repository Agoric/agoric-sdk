// @ts-check
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { deeplyFulfilled, defangAndTrim, stringify } from './code-gen.js';
import {
  makeCoreProposalBehavior,
  makeEnactCoreProposalsFromBundleRef,
} from './coreProposalBehavior.js';

const { details: X, Fail } = assert;

const req = createRequire(import.meta.url);

/**
 * @param {(ModuleSpecifier | FilePath)[]} paths
 * @typedef {string} ModuleSpecifier
 * @typedef {string} FilePath
 */
const pathResolve = (...paths) => {
  const fileName = paths.pop();
  assert(fileName, '>=1 paths required');
  try {
    return req.resolve(fileName, {
      paths,
    });
  } catch (e) {
    return path.resolve(...paths, fileName);
  }
};

/**
 * Format core proposals to be run at bootstrap:
 * SwingSet `bundles` configuration
 * and `code` to execute them, interpolating functions
 * such as `makeCoreProposalBehavior`.
 *
 * Core proposals are proposals for use with swingset-core-eval.
 * In production, they are triggered by BLD holder governance decisions,
 * but for sim-chain and such, they can be declared statically in
 * the chain configuration, in which case they are run at bootstrap.
 *
 * @param {import('@agoric/swingset-vat').ConfigProposal[]} coreProposals - governance
 * proposals to run at chain bootstrap for scenarios such as sim-chain.
 * @param {FilePath} [dirname]
 * @param {typeof makeEnactCoreProposalsFromBundleRef} [makeEnactCoreProposals]
 * @param {(i: number) => number} [getSequenceForProposal]
 */
export const extractCoreProposalBundles = async (
  coreProposals,
  dirname = '.',
  makeEnactCoreProposals = makeEnactCoreProposalsFromBundleRef,
  getSequenceForProposal,
) => {
  if (!getSequenceForProposal) {
    // Deterministic proposal numbers.
    getSequenceForProposal = i => i;
  }

  dirname = pathResolve(dirname);
  dirname = await fs.promises
    .stat(dirname)
    .then(stbuf => (stbuf.isDirectory() ? dirname : path.dirname(dirname)));

  /** @type {Map<{ bundleName?: string }, { source: string, bundle?: string }>} */
  const bundleHandleToAbsolutePaths = new Map();

  const bundleToSource = new Map();
  const extracted = await Promise.all(
    coreProposals.map(async (coreProposal, i) => {
      // console.debug(`Parsing core proposal:`, coreProposal);

      /** @type {string} */
      let entrypoint;
      /** @type {unknown[]} */
      let args;
      /** @type {string} */
      let module;
      if (typeof coreProposal === 'string') {
        module = coreProposal;
        entrypoint = 'defaultProposalBuilder';
        args = [];
      } else {
        ({ module, entrypoint, args = [] } = coreProposal);
      }

      typeof module === 'string' ||
        Fail`coreProposal module ${module} must be string`;
      typeof entrypoint === 'string' ||
        Fail`coreProposal entrypoint ${entrypoint} must be string`;
      Array.isArray(args) || Fail`coreProposal args ${args} must be array`;

      const thisProposalBundleHandles = new Set();
      assert(getSequenceForProposal);
      const thisProposalSequence = getSequenceForProposal(i);
      const initPath = pathResolve(dirname, module);
      const initDir = path.dirname(initPath);
      const ns = await import(initPath);
      const install = (srcSpec, bundlePath) => {
        const absoluteSrc = pathResolve(initDir, srcSpec);
        const bundleHandle = {};
        const absolutePaths = { source: absoluteSrc };
        if (bundlePath) {
          const absoluteBundle = pathResolve(initDir, bundlePath);
          absolutePaths.bundle = absoluteBundle;
          const oldSource = bundleToSource.get(absoluteBundle);
          if (oldSource) {
            assert.equal(
              oldSource,
              absoluteSrc,
              X`${bundlePath} already installed from ${oldSource}, now ${absoluteSrc}`,
            );
          } else {
            bundleToSource.set(absoluteBundle, absoluteSrc);
          }
        }
        // Don't harden the bundleHandle since we need to set the bundleName on
        // its unique identity later.
        thisProposalBundleHandles.add(bundleHandle);
        bundleHandleToAbsolutePaths.set(bundleHandle, harden(absolutePaths));
        return bundleHandle;
      };
      const publishRef = async handleP => {
        const handle = await handleP;
        bundleHandleToAbsolutePaths.has(handle) ||
          Fail`${handle} not in installed bundles`;
        return handle;
      };
      const proposal = await ns[entrypoint]({ publishRef, install }, ...args);

      // Add the proposal bundle handles in sorted order.
      const bundleSpecEntries = [...thisProposalBundleHandles.keys()]
        .map(handle => [handle, bundleHandleToAbsolutePaths.get(handle)])
        .sort(([_hnda, { source: a }], [_hndb, { source: b }]) => {
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        })
        .map(([handle, absolutePaths], j) => {
          // Transform the bundle handle identity into a bundleName reference.
          handle.bundleName = `coreProposal${thisProposalSequence}_${j}`;
          harden(handle);

          /** @type {[string, { sourceSpec: string }]} */
          const specEntry = [
            handle.bundleName,
            { sourceSpec: absolutePaths.source },
          ];
          return specEntry;
        });

      // Now that we've assigned all the bundleNames and hardened the
      // handles, we can extract the behavior bundle.
      const { sourceSpec, getManifestCall } = await deeplyFulfilled(
        harden(proposal),
      );

      const behaviorSource = pathResolve(initDir, sourceSpec);
      const behaviors = await import(behaviorSource);
      const [exportedGetManifest, ...manifestArgs] = getManifestCall;
      const { manifest: overrideManifest } = await behaviors[
        exportedGetManifest
      ](harden({ restoreRef: () => null }), ...manifestArgs);

      const behaviorBundleHandle = harden({
        bundleName: `coreProposal${thisProposalSequence}_behaviors`,
      });
      const behaviorAbsolutePaths = harden({
        source: behaviorSource,
      });
      bundleHandleToAbsolutePaths.set(
        behaviorBundleHandle,
        behaviorAbsolutePaths,
      );

      bundleSpecEntries.unshift([
        behaviorBundleHandle.bundleName,
        { sourceSpec: behaviorAbsolutePaths.source },
      ]);

      return harden({
        ref: behaviorBundleHandle,
        call: getManifestCall,
        overrideManifest,
        bundleSpecs: bundleSpecEntries,
      });
    }),
  );

  // Extract all the bundle specs in already-sorted order.
  const bundles = Object.fromEntries(
    extracted.flatMap(({ bundleSpecs }) => bundleSpecs),
  );
  harden(bundles);

  // Extract the manifest references and calls.
  const makeCPArgs = extracted.map(({ ref, call, overrideManifest }) => ({
    ref,
    call,
    overrideManifest,
  }));
  harden(makeCPArgs);

  const code = `\
// This is generated by @agoric/cosmic-swingset/src/extract-proposal.js - DO NOT EDIT
/* eslint-disable */

const makeCoreProposalArgs = harden(${stringify(makeCPArgs, true)});

const makeCoreProposalBehavior = ${makeCoreProposalBehavior};

(${makeEnactCoreProposals})({ makeCoreProposalArgs, E });
`;

  // console.debug('created bundles from proposals:', coreProposals, bundles);
  return {
    bundles,
    code: defangAndTrim(code),
    bundleHandleToAbsolutePaths,
  };
};
