// @ts-check
import fs from 'fs';
import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import { defangAndTrim, mergePermits, stringify } from './code-gen.js';
import { makeCoreProposalBehavior, permits } from './coreProposalBehavior.js';

export const makeWriteCoreProposal = (
  homeP,
  endowments,
  {
    getBundlerMaker,
    getBundleSpec,
    log = console.log,
    writeFile = fs.promises.writeFile,
  },
) => {
  const { bundleSource, pathResolve } = endowments;

  let bundlerCache;
  const getBundler = () => {
    if (!bundlerCache) {
      bundlerCache = E(getBundlerMaker()).makeBundler({
        zoe: E.get(homeP).zoe,
      });
    }
    return bundlerCache;
  };

  const mergeProposalPermit = async (proposal, additionalPermits) => {
    const {
      sourceSpec,
      getManifestCall: [manifestGetterName, ...manifestGetterArgs],
    } = proposal;

    const proposalNS = await import(pathResolve(sourceSpec));

    // We only care about the manifest, not any restoreRef calls.
    const { manifest } = await proposalNS[manifestGetterName](
      harden({ restoreRef: x => `restoreRef:${x}` }),
      ...manifestGetterArgs,
    );

    const mergedPermits = mergePermits(manifest);
    return {
      manifest,
      permits: mergePermits({ mergedPermits, additionalPermits }),
    };
  };

  let mutex = Promise.resolve();
  const writeCoreProposal = async (filePrefix, proposalBuilder) => {
    const getBundle = async (entrypoint, bundlePath) => {
      if (!bundlePath) {
        return bundleSource(pathResolve(entrypoint));
      }
      const bundleCache = pathResolve(bundlePath);
      await createBundles([[pathResolve(entrypoint), bundleCache]]);
      const ns = await import(bundleCache);
      return ns.default;
    };

    const bundles = [];

    // Install an entrypoint.
    const install = async (entrypoint, bundlePath, opts) => {
      const bundle = getBundle(entrypoint, bundlePath);

      // Serialise the installations.
      mutex = E.when(mutex, async () => {
        // console.log('installing', { filePrefix, entrypoint, bundlePath });
        const spec = await getBundleSpec(bundle, getBundler, opts);
        bundles.push({
          entrypoint,
          ...spec,
        });
        return spec;
      });
      return mutex;
    };

    // Await a reference then publish to the board.
    const cmds = [];
    const publishRef = async refP => {
      const { fileName, ...ref } = await refP;
      if (fileName) {
        cmds.push(`agd tx swingset install-bundle @${fileName}`);
      }

      return harden(ref);
    };

    // Create the proposal structure.
    const proposal = await deeplyFulfilled(
      harden(proposalBuilder({ publishRef, install })),
    );
    const { sourceSpec, getManifestCall } = proposal;
    // console.log('created', { filePrefix, sourceSpec, getManifestCall });

    // Extract the top-level permit.
    const { permits: proposalPermit, manifest: customManifest } =
      await mergeProposalPermit(proposal, permits);

    // Get an install
    const manifestBundleRef = await publishRef(install(sourceSpec));

    // console.log('writing', { filePrefix, manifestBundleRef, sourceSpec });
    const code = `\
// This is generated by writeCoreProposal; please edit!
/* eslint-disable */

const manifestBundleRef = ${stringify(manifestBundleRef)};
const getManifestCall = harden(${stringify(getManifestCall, true)});
const customManifest = ${stringify(customManifest, true)};

// Make a behavior function and "export" it by way of script completion value.
const behavior = (${makeCoreProposalBehavior})({ manifestBundleRef, getManifestCall, customManifest, E });
behavior;
`;

    const trimmed = defangAndTrim(code);

    const proposalPermitJsonFile = `${filePrefix}-permit.json`;
    log(`creating ${proposalPermitJsonFile}`);
    await writeFile(
      proposalPermitJsonFile,
      JSON.stringify(proposalPermit, null, 2),
    );

    const proposalJsFile = `${filePrefix}.js`;
    log(`creating ${proposalJsFile}`);
    await writeFile(proposalJsFile, trimmed);

    const plan = {
      name: filePrefix,
      script: proposalJsFile,
      permit: proposalPermitJsonFile,
      bundles,
    };

    await writeFile(
      `${filePrefix}-plan.json`,
      `${JSON.stringify(plan, null, 2)}\n`,
    );

    log(`\
You can now run a governance submission command like:
  agd tx gov submit-proposal swingset-core-eval ${proposalPermitJsonFile} ${proposalJsFile} \\
    --title="Enable <something>" --description="Evaluate ${proposalJsFile}" --deposit=1000000ubld \\
    --gas=auto --gas-adjustment=1.2
Remember to install bundles before submitting the proposal:
  ${cmds.join('\n  ')}
`);
  };

  return writeCoreProposal;
};
