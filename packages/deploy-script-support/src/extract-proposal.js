// @ts-check
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import { deeplyFulfilled, defangAndTrim, stringify } from './code-gen.js';
import {
  makeCoreProposalBehavior,
  makeEnactCoreProposalsFromBundleCap,
} from './coreProposalBehavior.js';

const { details: X } = assert;

const require = createRequire(import.meta.url);

/**
 * @param {(ModuleSpecifier | FilePath)[]} paths
 * @typedef {string} ModuleSpecifier
 * @typedef {string} FilePath
 */
const pathResolve = (...paths) => {
  const fileName = paths.pop();
  assert(fileName, '>=1 paths required');
  try {
    return require.resolve(fileName, {
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
 * @param {(ModuleSpecifier | FilePath)[]} coreProposals - governance
 * proposals to run at chain bootstrap for scenarios such as sim-chain.
 * @param {FilePath} [dirname]
 * @param {typeof makeEnactCoreProposalsFromBundleCap} [makeEnactCoreProposals]
 * @param {(i: number) => number} [getSequenceForProposal]
 */
export const extractCoreProposalBundles = async (
  coreProposals,
  dirname = '.',
  makeEnactCoreProposals = makeEnactCoreProposalsFromBundleCap,
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

  /** @type {Map<{ bundleID?: string }, { source: string, bundle?: string }>} */
  const bundleHandleToAbsolutePaths = new Map();

  const bundleToSource = new Map();
  const extracted = await Promise.all(
    coreProposals.map(async (initCore, i) => {
      console.log(`Parsing core proposal:`, initCore);
      const thisProposalBundleHandles = new Set();
      assert(getSequenceForProposal);
      const thisProposalSequence = getSequenceForProposal(i);
      const initPath = pathResolve(dirname, initCore);
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
        // Don't harden the bundleHandle since we need to set the bundleID on
        // its unique identity later.
        thisProposalBundleHandles.add(bundleHandle);
        bundleHandleToAbsolutePaths.set(bundleHandle, harden(absolutePaths));
        return bundleHandle;
      };
      const publishRef = async handleP => {
        const handle = await handleP;
        assert(
          bundleHandleToAbsolutePaths.has(handle),
          X`${handle} not in installed bundles`,
        );
        return handle;
      };
      const proposal = await ns.defaultProposalBuilder({ publishRef, install });

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
          // Transform the bundle handle identity into a bundleID reference.
          handle.bundleID = `coreProposal${thisProposalSequence}_${j}`;
          harden(handle);

          /** @type {[string, { sourceSpec: string }]} */
          const specEntry = [
            handle.bundleID,
            { sourceSpec: absolutePaths.source },
          ];
          return specEntry;
        });

      // Now that we've assigned all the bundleIDs and hardened the handles, we
      // can extract the behavior bundle.
      const { sourceSpec, getManifestCall } = await deeplyFulfilled(
        harden(proposal),
      );
      const behaviorBundleHandle = harden({
        bundleID: `coreProposal${thisProposalSequence}_behaviors`,
      });
      const behaviorAbsolutePaths = harden({
        source: pathResolve(initDir, sourceSpec),
      });
      bundleHandleToAbsolutePaths.set(
        behaviorBundleHandle,
        behaviorAbsolutePaths,
      );

      bundleSpecEntries.unshift([
        behaviorBundleHandle.bundleID,
        { sourceSpec: behaviorAbsolutePaths.source },
      ]);

      return harden({
        ref: behaviorBundleHandle,
        call: getManifestCall,
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
  const makeCPArgs = extracted.map(({ ref, call }) => ({ ref, call }));
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
