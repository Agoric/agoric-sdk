// @ts-check
import fs from 'fs';
import { E } from '@endo/far';

import {
  deeplyFulfilled,
  defangAndTrim,
  mergePermits,
  stringify,
} from './code-gen.js';
import { makeCoreProposalBehavior } from './coreProposalBehavior.js';
import { createBundles } from './createBundles.js';

export const makeWriteCoreProposal = (
  homeP,
  endowments,
  {
    getBundlerMaker,
    installInPieces,
    log = console.log,
    writeFile = fs.promises.writeFile,
  },
) => {
  const { board, zoe } = E.get(homeP);
  const { bundleSource, pathResolve } = endowments;

  let bundlerCache;
  const getBundler = () => {
    if (!bundlerCache) {
      bundlerCache = E(getBundlerMaker()).makeBundler({
        zoe,
      });
    }
    return bundlerCache;
  };

  const mergeProposalPermit = async (proposal, additionalPermits) => {
    const {
      sourceSpec,
      getManifestCall: [exportedGetManifest, ...manifestArgs],
    } = proposal;

    const manifestNs = await import(pathResolve(sourceSpec));

    // We only care about the manifest, not any restoreRef calls.
    const { manifest } = await manifestNs[exportedGetManifest](
      { restoreRef: x => `restoreRef:${x}` },
      ...manifestArgs,
    );

    const mergedPermits = mergePermits(manifest);
    return mergePermits({ mergedPermits, additionalPermits });
  };

  const writeCoreProposal = async (filePrefix, proposalBuilder) => {
    let mutex = Promise.resolve();
    // Install an entrypoint.
    const install = async (entrypoint, bundlePath) => {
      const bundler = getBundler();
      let bundle;
      if (bundlePath) {
        const bundleCache = pathResolve(bundlePath);
        await createBundles([[pathResolve(entrypoint), bundleCache]]);
        const ns = await import(bundleCache);
        bundle = ns.default;
      } else {
        bundle = await bundleSource(pathResolve(entrypoint));
      }

      // Serialise the installations.
      mutex = mutex.then(() => installInPieces(bundle, bundler));
      return mutex;
    };

    // Await a reference then publish to the board.
    const publishRef = async refP => {
      const ref = await refP;
      return E(board).getId(ref);
    };

    // Create the proposal structure.
    const proposal = await deeplyFulfilled(
      harden(proposalBuilder({ publishRef, install })),
    );
    const { sourceSpec, getManifestCall } = proposal;

    // Extract the top-level permit.
    const t = 'writeCoreProposal';
    const proposalPermit = await mergeProposalPermit(proposal, {
      consume: { board: t },
      evaluateInstallation: t,
      installation: { produce: t },
      modules: { utils: { runModuleBehaviors: t } },
    });

    // Get an install
    const manifestInstallRef = await publishRef(install(sourceSpec));

    const code = `\
// This is generated by writeCoreProposal; please edit!
/* eslint-disable */

const manifestInstallRef = ${stringify(manifestInstallRef)};
const getManifestCall = harden(${stringify(getManifestCall, true)});

// Make the behavior the completion value.
(${makeCoreProposalBehavior})({ manifestInstallRef, getManifestCall, E });
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

    log(`\
You can now run a governance submission command like:
  agd tx gov submit-proposal swingset-core-eval ${proposalPermitJsonFile} ${proposalJsFile} \\
    --title="Enable <something>" --description="Evaluate ${proposalJsFile}" --deposit=1000000ubld \\
    --gas=auto --gas-adjustment=1.2
`);
  };

  return writeCoreProposal;
};
