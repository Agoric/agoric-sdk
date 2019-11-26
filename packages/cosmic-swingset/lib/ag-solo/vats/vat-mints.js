import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';

// This vat contains the registrar for the demo.

function build(E, log) {
  const mints = new Map([
    ['moola', makeMint('moola')],
    ['simolean', makeMint('simolean')],
  ]);

  function getNewPurse(desc, nickname) {
    return mints.get(desc).mint(1000, nickname);
  }

  function getMint(desc) {
    return harden(mints.get(desc));
  }

  return harden({
    getMint,
    getNewPurse,
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
