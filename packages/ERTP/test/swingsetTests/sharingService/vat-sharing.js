// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeSharingService } from '../../../more/sharing/sharing';

function build(_E, _log) {
  return harden({ makeSharingService });
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
