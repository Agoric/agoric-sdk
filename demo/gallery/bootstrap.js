// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeGallery } from '../../more/pixels/gallery';

function build(E, log) {
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getBalance()
      .then(amount => log(name, ' balance ', amount));
  }
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPurseBalances(name, purseP) {
    return Promise.all([
      E(purseP)
        .getBalance()
        .then(amount => log(name, ' balance ', amount)),
    ]);
  }

  function testTapFaucet(aliceMaker, gallery) {
    log('starting testTapFaucet');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    return E(aliceP).doTapFaucet();
  }
  async function testAliceChangesColor(aliceMaker, gallery) {
    log('starting testAliceChangesColor');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    const alicePixelAmount = await E(aliceP).doChangeColor();
    const rawPixel = alicePixelAmount.quantity[0];
    log(`current color ${gallery.userFacet.getColor(rawPixel.x, rawPixel.y)}`);
  }
  async function testAliceSendsOnlyUseRight(aliceMaker, bobMaker, gallery) {
    log('starting testAliceSendsOnlyUseRight');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    const bobP = E(bobMaker).make(gallery.userFacet);
    await E(aliceP).doSendOnlyUseRight(bobP);
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      const canvasSize = 10;

      switch (argv[0]) {
        case 'tapFaucet': {
          log('starting tapFaucet');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const gallery = makeGallery(E, canvasSize);
          log('alice is made');
          return testTapFaucet(aliceMaker, gallery);
        }
        case 'aliceChangesColor': {
          log('starting aliceChangesColor');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const gallery = makeGallery(E, canvasSize);
          log('alice is made');
          return testAliceChangesColor(aliceMaker, gallery);
        }
        case 'aliceSendsOnlyUseRight': {
          log('aliceSendsOnlyUseRight');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const gallery = makeGallery(E, canvasSize);
          log('alice is made');
          return testAliceSendsOnlyUseRight(aliceMaker, bobMaker, gallery);
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
