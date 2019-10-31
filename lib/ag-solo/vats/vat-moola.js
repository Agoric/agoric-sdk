import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';

// This vat contains the registrar for the demo.

function build(E, log) {
  const sharedMoolaMint = makeMint('moola');

  function getSomeMoola(nickname, jackpot) {
    return sharedMoolaMint.mint(1000, `${nickname}'s moola purse`);
  }

  function getMint() {
    return sharedMoolaMint;
  }

  return harden({ getSomeMoola, getMint });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
