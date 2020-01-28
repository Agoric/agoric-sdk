import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';

// This vat contains the registrar for the demo.

function build(_E, _log) {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simolean');

  const moolaAssay = moolaMint.getAssay();
  const simoleanAssay = simoleanMint.getAssay();

  const mints = new Map([
    ['moola', moolaMint],
    ['simolean', simoleanMint],
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
    getAssays: () =>
      harden({
        moolaAssay,
        simoleanAssay,
      }),
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
