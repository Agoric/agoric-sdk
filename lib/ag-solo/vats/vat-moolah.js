import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';

// This vat contains the registrar for the demo.

function build(E, log) {
  const sharedMoolahMint = makeMint('moolah');

  function getSomeMoolah(nickname) {
    return sharedMoolahMint.mint(1000, `${nickname}'s moolah purse`);
  }

  return harden({ getSomeMoolah });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
