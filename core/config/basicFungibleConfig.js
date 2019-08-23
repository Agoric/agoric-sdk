import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';
import { natStrategy } from './strategies/natStrategy';

// Fungible tokens (our default for mints) do not customize
// payments, purses, etc. They use the "basic" mintKeeper (the place
// where the amounts per purse and payment are recorded) and use the
// "Nat" assay, in which amounts are natural numbers and use
// substraction and addition.

// This configuration and others like it are passed into `makeMint` in
// `issuers.js`.
function makeBasicFungibleConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    strategy: natStrategy,
  });
}

export { makeBasicFungibleConfig };
