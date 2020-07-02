// Copyright (C) 2018 Agoric, under Apache License 2.0

/* global harden */

import { makeContractHost } from '@agoric/spawner';

function setup(syscall, state, helpers, vatPowers0) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (_E, _D, vatPowers) =>
      harden({
        makeHost() {
          return harden(makeContractHost(vatPowers));
        },
      }),
    helpers.vatID,
    vatPowers0,
  );
}
export default harden(setup);
