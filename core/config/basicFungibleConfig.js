import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';
import { natExtentOps } from './extentOps/natExtentOps';

// Fungible tokens (our default for mints) do not customize
// payments, purses, etc. They use the "basic" mintKeeper (the place
// where the assetDescs per purse and payment are recorded) and use the
// "Nat" descOps, in which assetDescs are natural numbers and use
// substraction and addition.

// This configuration and others like it are passed into `makeMint` in
// `mint.js`.
function makeBasicFungibleConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOps: natExtentOps,
  });
}

export { makeBasicFungibleConfig };
