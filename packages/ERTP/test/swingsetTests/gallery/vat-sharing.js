// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';

import { makeSharingService } from '../../../more/sharing/sharing';

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        makeSharingService() {
          return harden(makeSharingService(E, evaluate));
        },
      }),
    helpers.vatID,
  );
}
export default harden(setup);
