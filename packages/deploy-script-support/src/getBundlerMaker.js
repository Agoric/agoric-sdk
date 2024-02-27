// @ts-check
/**
 * This helper mainly exists to bridge the gaps that would be filled by
 * bundlecap support.  It will probably go away after bundlecap support is
 * complete.  Something like it is necessary, since the desire to limit the
 * maximum Cosmos transaction size will still prevent large bundles from being
 * sent in a single message.
 *
 * This interim design is a refinement of
 * https://github.com/Agoric/agoric-sdk/issues/5002 and the replacement will be
 * linked with https://github.com/agoric/agoric-sdk/issues/4564
 */
import { E } from '@endo/far';
import url from 'url';

/** @typedef {ReturnType<import('./endo-pieces-contract.js')['start']>['publicFacet']} BundleMaker */
/** @typedef {ReturnType<BundleMaker['makeBundler']>} Bundler */

export const makeGetBundlerMaker =
  (homeP, { lookup, bundleSource }) =>
  async ({
    BUNDLER_MAKER_LOOKUP = JSON.stringify(['scratch', 'bundlerMaker']),
    log = console.log,
  } = {}) => {
    const { board: optionalBoard, zoe, scratch } = await homeP;
    /** @type {() => Promise<BundleMaker>} */
    const lookupOrCreate = async () => {
      // Locate the bundler maker if any already exists at the given path.
      let bundlerMaker = await lookup(JSON.parse(BUNDLER_MAKER_LOOKUP));
      if (bundlerMaker) {
        return bundlerMaker;
      }

      const entrypoint = url.fileURLToPath(
        new URL('./endo-pieces-contract.js', import.meta.url),
      );
      log('Bundling bundle maker', entrypoint);
      const bundle = await bundleSource(entrypoint);
      log('Instantiating bundle maker...');
      const { publicFacet } = await E(zoe).startInstance(
        E(zoe).install(bundle),
      );
      bundlerMaker = publicFacet;
      await E(scratch).set('bundlerMaker', bundlerMaker);

      return bundlerMaker;
    };

    const bundlerMaker = await lookupOrCreate();
    if (!optionalBoard) {
      return bundlerMaker;
    }

    const bundlerMakerId = await E(optionalBoard).getId(bundlerMaker);
    log(
      `-- BUNDLER_MAKER_LOOKUP='${JSON.stringify(['board', bundlerMakerId])}'`,
    );
    return bundlerMaker;
  };
