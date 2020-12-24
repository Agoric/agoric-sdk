// @ts-check

import './externalTypes';
import './internalTypes';

import { E } from '@agoric/eventual-send';

/** @type {MakeInstallSaveAndPublish} */
export const makeInstall = (bundleSource, zoe, installationManager, board) => {
  /** @type {InstallSaveAndPublish} */
  const install = async (resolvedPath, contractPetname) => {
    const bundle = await bundleSource(resolvedPath);
    const installation = await E(zoe).install(bundle);

    await E(installationManager).add(contractPetname, installation);

    console.log('- SUCCESS! contract code installed on Zoe');
    console.log(`-- Contract Name: ${contractPetname}`);

    const id = await E(board).getId(installation);
    return { installation, id };
  };
  return install;
};
