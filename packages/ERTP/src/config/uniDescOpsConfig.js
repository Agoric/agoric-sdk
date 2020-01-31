import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';
import { makeUniExtentOps } from './extentOps/uniExtentOps';

// This UniDescOps config is used to create invites and similar assets.
// It does not customize the purses, payments, mints, or assays, and
// it uses the core mintKeeper as well as the uniDescOps (naturally)
function makeUniDescOpsConfigMaker(descriptionCoercer) {
  function makeUniDescOpsConfig() {
    return harden({
      ...noCustomization,
      makeMintKeeper: makeCoreMintKeeper,
      extentOps: makeUniExtentOps(descriptionCoercer),
    });
  }
  return makeUniDescOpsConfig;
}

export { makeUniDescOpsConfigMaker };
