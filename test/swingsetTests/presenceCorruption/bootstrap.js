// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function build(E) {
  function corruptedPresence(host, mint, bobMaker) {
    const doughMintP = E(mint).makeMint('dough');
    const bobDoughPurseP = E(doughMintP).mint(1001, 'bobDough');

    E(bobMaker).make(bobDoughPurseP);
  }

  const obj0 = harden({
    async bootstrap(argv, vats) {
      switch (argv[0]) {
        case 'corrupted-presence': {
          const host = await E(vats.host).makeHost();
          const bobMaker = await E(vats.bob).makeBobMaker(host);
          return corruptedPresence(host, vats.mint, bobMaker);
        }
        default: {
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  });
  return harden(obj0);
}

harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }

  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}

export default harden(setup);
