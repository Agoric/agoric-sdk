import './externalTypes.js';

import { E } from '@endo/far';

/** @typedef {import('@agoric/deploy-script-support/src/externalTypes').Petname} Petname */

/**
 * @callback BundleSource
 * @param {string} startFilename - the filepath to start the bundling from
 * @param {(ModuleFormat | BundleOptions)=} moduleFormat
 * @param {object=} powers
 * @param {ReadFn=} powers.read
 * @param {CanonicalFn=} powers.canonical
 */

// XXX board is Board but specifying that leads to type errors with imports which aren't worth fixing right now
/**
 * @param {BundleSource} bundleSource
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<import('./startInstance.js').InstallationManager>} installationManager
 * @param {ERef<any>} board
 */
export const makeInstall = (bundleSource, zoe, installationManager, board) => {
  /**
   * @param {string} resolvedPath
   * @param {Petname} contractPetname
   * @returns {Promise<{ installation: Installation, id: string}>}
   * */
  const install = async (resolvedPath, contractPetname) => {
    console.log(`- Installing Contract Name: ${contractPetname}`);

    const bundle = await bundleSource(resolvedPath);
    const installation = await E(zoe).install(bundle);

    await E(installationManager).add(contractPetname, installation);

    console.log(`- Installed Contract Name: ${contractPetname}`);

    const id = await E(board).getId(installation);
    return { installation, id };
  };
  return install;
};
