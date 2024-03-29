// @ts-check
import './externalTypes.js';

import { E } from '@endo/far';

/** @import {Petname} from '@agoric/deploy-script-support/src/externalTypes.js' */

// XXX board is Board but specifying that leads to type errors with imports which aren't worth fixing right now
/**
 * @param {typeof import('@endo/bundle-source')['default']} bundleSource
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<import('./startInstance.js').InstallationManager>} installationManager
 * @param {ERef<any>} board
 * @param {(bundle: any) => any} [publishBundle]
 * @param {(path: string) => string} [pathResolve]
 */
export const makeInstall = (
  bundleSource,
  zoe,
  installationManager,
  board,
  publishBundle,
  pathResolve,
) => {
  /**
   * @param {string} contractPath
   * @param {Petname} contractPetname
   * @returns {Promise<{ installation: Installation, id: string}>}
   */
  const install = async (contractPath, contractPetname) => {
    const resolvedPath = pathResolve ? pathResolve(contractPath) : contractPath;

    const bundle = await bundleSource(resolvedPath);
    console.log(`- Publishing Contract Name: ${contractPetname}`);
    const hashedBundle = await (publishBundle ? publishBundle(bundle) : bundle);
    console.log(`- Installing Contract Name: ${contractPetname}`);
    const installation = await E(zoe).install(hashedBundle);
    console.log(
      `- Adding contract to installation manager: ${contractPetname}`,
    );
    await E(installationManager).add(contractPetname, installation);

    // Let's share this installation with other people, so that
    // they can run our contract code by making a contract
    // instance (see the api deploy script in this repo to see an
    // example of how to use the installation to make a new contract
    // instance.)
    // To share the installation, we're going to put it in the
    // board. The board is a shared, on-chain object that maps
    // strings to objects.
    const id = await E(board).getId(installation);

    console.log('- SUCCESS! contract code installed on Zoe');
    console.log(`-- Contract Name: ${contractPetname}`);
    console.log(`-- Installation Board Id: ${id}`);

    return {
      installation,
      id,
    };
  };
  return install;
};
