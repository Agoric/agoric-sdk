// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';

import { makeHandoffService } from '../../more/handoff/handoff';

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        makeHandoffService() {
          return harden(makeHandoffService(E, evaluate));
        },
      }),
    helpers.vatID,
  );
}
export default harden(setup);
