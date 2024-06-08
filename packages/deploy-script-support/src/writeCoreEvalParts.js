// @ts-check
import fs from 'fs';
import { E } from '@endo/far';

import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import path from 'node:path';
import { defangAndTrim, mergePermits, stringify } from './code-gen.js';
import {
  makeCoreProposalBehavior,
  permits as defaultPermits,
} from './coreProposalBehavior.js';

/**
 * @import {CoreEvalDescriptor} from './externalTypes.js';
 */

// TODO consider using dots instead of dashes  distinguish the module shape qualifierfrom the identifier. (e.g. `-plan.json' to `.plan.json`)
/**
 * @callback WriteCoreEval write to disk the files needed for a CoreEval (js code to `.js`, permits to `-permit.json`, an overall
 *   summary to `-plan.json), plus whatever bundles bundles the code loads)
 * see CoreEval in {@link '/golang/cosmos/x/swingset/types/swingset.pb.go'}
 * @param {string} evalName name on disk
 * @param {import('./externalTypes.js').CoreEvalBuilder} builder
 * @param {string} [scriptModule] path to calling module, which will further prefix the filename
 * @returns {Promise<void>}
 */

/**
 *
 * @param {*} homeP
 * @param {{
 *   bundleSource: (path: string) => Promise<NodeModule>,
 *   pathResolve: (path: string) => string,
 * }} endowments
 * @param {{
 *   getBundlerMaker: () => Promise<import('./getBundlerMaker.js').BundleMaker>,
 *   getBundleSpec: (...args: *) => Promise<import('./externalTypes.js').ManifestBundleRef>,
 *   log?: typeof console.log,
 *   writeFile?: typeof fs.promises.writeFile
 * }} io
 * @returns {WriteCoreEval}
 */
export const makeWriteCoreEval = (
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
  /** @returns {import('./getBundlerMaker.js').Bundler} */
  const getBundler = () => {
    if (!bundlerCache) {
      bundlerCache = E(getBundlerMaker()).makeBundler({
        zoe: E.get(homeP).zoe,
      });
    }
    return bundlerCache;
  };

  /**
   *
   * @param {CoreEvalDescriptor} coreEval
   * @param {*} additionalPermits
   */
  const mergeEvalPermit = async (coreEval, additionalPermits) => {
    const {
      sourceSpec,
      getManifestCall: [manifestGetterName, ...manifestGetterArgs],
    } = coreEval;

    const moduleNamespace = await import(pathResolve(sourceSpec));

    // We only care about the manifest, not any restoreRef calls.
    const { manifest } = await moduleNamespace[manifestGetterName](
      harden({ restoreRef: x => `restoreRef:${x}` }),
      ...manifestGetterArgs,
    );

    const mergedPermits = mergePermits(manifest);
    return {
      manifest,
      permits: mergePermits({ mergedPermits, additionalPermits }),
    };
  };

  let mutex =
    /** @type {Promise<import('./externalTypes.js').ManifestBundleRef | undefined>} */ (
      Promise.resolve()
    );
  /** @type {WriteCoreEval} */
  const writeCoreEval = async (evalName, builder, scriptModule) => {
    /**
     *
     * @param {string} entrypoint
     * @param {string} [bundlePath]
     * @returns {Promise<NodeModule>}
     */
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

    /**
     * Install an entrypoint.
     *
     * @param {string} entrypoint
     * @param {string} [bundlePath]
     * @param {unknown} [opts]
     * @returns {Promise<import('./externalTypes.js').ManifestBundleRef>}
     */
    const install = async (entrypoint, bundlePath, opts) => {
      const bundle = getBundle(entrypoint, bundlePath);

      // Serialise the installations.
      mutex = E.when(mutex, async () => {
        // console.log('installing', { evalName, entrypoint, bundlePath });
        const spec = await getBundleSpec(bundle, getBundler, opts);
        bundles.push({
          entrypoint,
          ...spec,
        });
        return spec;
      });
      // @ts-expect-error xxx mutex type narrowing
      return mutex;
    };

    // Await a reference then publish to the board.
    const cmds = [];
    /** @param {Promise<import('./externalTypes.js').ManifestBundleRef>} refP */
    const publishRef = async refP => {
      const { fileName, ...ref } = await refP;
      if (fileName) {
        cmds.push(`agd tx swingset install-bundle @${fileName}`);
      }

      return harden(ref);
    };

    // Create the eval structure.
    const evalDescriptor = await deeplyFulfilledObject(
      harden(builder({ publishRef, install })),
    );
    const { sourceSpec, getManifestCall } = evalDescriptor;
    // console.log('created', { evalName, sourceSpec, getManifestCall });

    // Extract the top-level permit.
    const { permits: evalPermits, manifest: customManifest } =
      await mergeEvalPermit(evalDescriptor, defaultPermits);

    // Get an install
    const manifestBundleRef = await publishRef(install(sourceSpec));

    // console.log('writing', { evalName, manifestBundleRef, sourceSpec });
    const code = `\
// This is generated by writeCoreEval; please edit!
/* eslint-disable */

const manifestBundleRef = ${stringify(manifestBundleRef)};
const getManifestCall = harden(${stringify(getManifestCall, true)});
const customManifest = ${stringify(customManifest, true)};

// Make a behavior function and "export" it by way of script completion value.
// It is constructed by an anonymous invocation to ensure the absence of a global binding
// for makeCoreProposalBehavior, which may not be necessary but preserves behavior pre-dating
// https://github.com/Agoric/agoric-sdk/pull/8712 .
const behavior = (${makeCoreProposalBehavior})({ manifestBundleRef, getManifestCall, customManifest, E });
behavior;
`;

    const trimmed = defangAndTrim(code);

    // If the scriptModule is present, include it in the name of the plan
    const planName = scriptModule
      ? `${path.basename(scriptModule, '.js')}-${evalName}`
      : evalName;

    const permitFile = `${planName}-permit.json`;
    log(`creating ${permitFile}`);
    await writeFile(permitFile, JSON.stringify(evalPermits, null, 2));

    const codeFile = `${planName}.js`;
    log(`creating ${codeFile}`);
    await writeFile(codeFile, trimmed);

    const plan = {
      name: planName,
      script: codeFile,
      permit: permitFile,
      bundles,
    };

    await writeFile(
      `${planName}-plan.json`,
      `${JSON.stringify(plan, null, 2)}\n`,
    );

    log(`\
You can now run a governance submission command like:
  agd tx gov submit-proposal swingset-core-eval ${permitFile} ${codeFile} \\
    --title="Enable <something>" --description="Evaluate ${codeFile}" --deposit=1000000ubld \\
    --gas=auto --gas-adjustment=1.2
Remember to install bundles before submitting the proposal:
  ${cmds.join('\n  ')}
`);
  };

  return writeCoreEval;
};
/** @deprecated use makeWriteCoreEval */
export const makeWriteCoreProposal = makeWriteCoreEval;
