import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';

// Fungible tokens (our default for mints) do not customize
// payments, purses, etc. They use the "basic" mintKeeper (the place
// where the units per purse and payment are recorded) and use the
// "Nat" unitOps, in which units are natural numbers and use
// substraction and addition.

// This configuration and others like it are passed into `makeMint` in
// `mint.js`.
function makeBasicFungibleConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'natExtentOps',
    extentOpsArgs: [],
  });
}

export { makeBasicFungibleConfig };
