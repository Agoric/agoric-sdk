// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { installContracts, makeVats } from '../setup';

function makeBootstrap(argv, cb, vatPowers) {
  return async (vats, devices) => {
    const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
      devices.vatAdmin,
    );
    const { zoe, feeMintAccess } = await E(vats.zoe).buildZoe(vatAdminSvc);

    const installations = await installContracts(zoe, cb);

    const [testName, startingValues] = argv;
    const { aliceP, vaultFactory } = await makeVats(
      vatPowers.testLog,
      vats,
      zoe,
      installations,
      startingValues,
      feeMintAccess,
    );

    await E(aliceP).startTest(testName, vaultFactory.publicFacet);
  };
}

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
