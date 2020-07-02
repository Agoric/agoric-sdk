// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global harden */

import produceIssuer from '@agoric/ertp';

function build(_E, _log) {
  return harden({ produceIssuer });
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
