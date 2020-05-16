// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeContractHost } from '../../../src/contractHost';

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    _E =>
      harden({
        makeHost() {
          return harden(makeContractHost());
        },
      }),
    helpers.vatID,
  );
}
export default harden(setup);
