// @ts-check

import './externalTypes.js';
import './internalTypes.js';

import { E } from '@endo/far';

/** @type {MakeInstallSaveAndPublish} */
export const makeInstall = (bundleSource, zoe, installationManager, board) => {
  /** @type {InstallSaveAndPublish} */
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
