// @ts-check
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

import {
  deeplyFulfilled,
  defangAndTrim,
  stringify,
} from '@agoric/deploy-script-support/src/code-gen.js';
import {
  makeCoreProposalBehavior,
  makeEnactCoreProposals,
} from '@agoric/deploy-script-support/src/coreProposalBehavior.js';

const { details: X } = assert;

const require = createRequire(import.meta.url);

const pathResolve = (...paths) => {
  const fileName = paths.pop();
  try {
    return require.resolve(fileName, {
      paths,
    });
  } catch (e) {
    return path.resolve(...paths, fileName);
  }
};

export const extractCoreProposalBundles = async (
  coreProposals,
  dirname = '.',
) => {
  dirname = pathResolve(dirname);
  dirname = await fs.promises
    .stat(dirname)
    .then(stbuf => (stbuf.isDirectory() ? dirname : path.dirname(dirname)));

  const bundleToSource = new Map();
  const bundleHandles = new Set();
  const makeCPArgs = await Promise.all(
    coreProposals.map(async (initCore, i) => {
      console.log(`Parsing core proposal:`, initCore);
      const initPath = pathResolve(dirname, initCore);
      const initDir = path.dirname(initPath);
      const ns = await import(initPath);
      let lastInstallID = 0;
      const install = (srcPath, bundlePath) => {
        lastInstallID += 1;
        const bundleID = `coreProposal${i}_${lastInstallID}`;
        const absSrc = pathResolve(initDir, srcPath);
        const bundleHandle = { bundleID, source: absSrc };
        if (bundlePath) {
          const absBundle = pathResolve(initDir, bundlePath);
          const oldSource = bundleToSource.get(absBundle);
          if (oldSource) {
            assert.equal(
              oldSource,
              absSrc,
              X`${bundlePath} already installed from ${oldSource}, now ${absSrc}`,
            );
          } else {
            bundleToSource.set(absBundle, absSrc);
          }
          bundleHandle.bundle = absBundle;
        }
        bundleHandles.add(harden(bundleHandle));
        return bundleHandle;
      };
      const publishRef = async handleP => {
        const handle = await handleP;
        assert(
          bundleHandles.has(handle),
          X`${handle} not in installed bundles`,
        );
        return handle;
      };
      const proposal = await deeplyFulfilled(
        harden(ns.defaultProposalBuilder({ publishRef, install })),
      );
      const { sourceSpec, getManifestCall } = proposal;

      const absSrc = pathResolve(initDir, sourceSpec);
      const bundleHandle = harden({
        bundleID: `coreProposal${i}_behaviors`,
        source: absSrc,
      });
      bundleHandles.add(bundleHandle);

      return harden({ ref: bundleHandle, call: getManifestCall });
    }),
  );
  const bundles = {};
  for (const { bundleID, source } of bundleHandles.values()) {
    bundles[bundleID] = { sourceSpec: source };
  }

  const code = `\
// This is generated by @agoric/cosmic-swingset/src/extract-proposal.js - DO NOT EDIT
/* eslint-disable */

const makeCoreProposalArgs = harden(${stringify(makeCPArgs, true)});

const makeCoreProposalBehavior = ${makeCoreProposalBehavior};

(${makeEnactCoreProposals})({ makeCoreProposalArgs, E });
`;

  console.debug('created bundles from proposals:', coreProposals, bundles);
  return { bundles, code: defangAndTrim(code) };
};
