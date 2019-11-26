import harden from '@agoric/harden';

import { makeMint } from '../../../core/mint';

function build(E, log) {
  function testSplitPayments(aliceMaker) {
    log('start test splitPayments');
    const moolaMint = makeMint('moola');
    const moolaPurse = moolaMint.mint(1000, 'alice money');

    const aliceP = E(aliceMaker).make(moolaPurse);
    return E(aliceP).testSplitPayments();
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      switch (argv[0]) {
        case 'splitPayments': {
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          return testSplitPayments(aliceMaker);
        }
        default: {
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  };
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
