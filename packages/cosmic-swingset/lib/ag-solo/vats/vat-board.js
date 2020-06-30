/* global harden */

import { makeBoard } from './lib-board';

function build(_E, _log) {
  const board = makeBoard();
  return harden({ getBoard: () => board });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
