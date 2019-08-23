import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';
import { makeUniStrategy } from './strategies/uniStrategy';

// This UniAssay config is used to create invites and similar assets.
// It does not customize the purses, payments, mints, or issuers, and
// it uses the core mintKeeper as well as the uniAssay (naturally)
function makeUniAssayConfigMaker(descriptionCoercer) {
  function makeUniAssayConfig() {
    return harden({
      ...noCustomization,
      makeMintKeeper: makeCoreMintKeeper,
      strategy: makeUniStrategy(descriptionCoercer),
    });
  }
  return makeUniAssayConfig;
}

export { makeUniAssayConfigMaker };
