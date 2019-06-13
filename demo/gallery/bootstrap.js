// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeGallery } from '../../more/pixels/gallery';

function build(E, log) {
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
  async function testGalleryRevokes(aliceMaker, bobMaker, gallery) {
    log('starting testGalleryRevokes');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    const rawPixel = await E(aliceP).doTapFaucetAndStore();
    gallery.adminFacet.revokePixel(rawPixel);
    E(aliceP).checkAfterRevoked();
  }
  async function testAliceSellsBack(aliceMaker, bobMaker, gallery, host) {
    log('starting testAliceSellsBack');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    await E(aliceP).doTapFaucetAndSell(host);
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      const canvasSize = 10;
      function stateChangeHandler(_newState) {
        // does nothing in this test
      }

      switch (argv[0]) {
        case 'tapFaucet': {
          log('starting tapFaucet');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const host = E(vats.host).makeHost();
          const gallery = makeGallery(
            E,
            host,
            log,
            stateChangeHandler,
            canvasSize,
          );
          log('alice is made');
          return testTapFaucet(aliceMaker, gallery);
        }
        case 'aliceChangesColor': {
          log('starting aliceChangesColor');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const host = E(vats.host).makeHost();
          const gallery = makeGallery(
            E,
            host,
            log,
            stateChangeHandler,
            canvasSize,
          );
          log('alice is made');
          return testAliceChangesColor(aliceMaker, gallery);
        }
        case 'aliceSendsOnlyUseRight': {
          log('starting aliceSendsOnlyUseRight');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const host = E(vats.host).makeHost();
          const gallery = makeGallery(
            E,
            host,
            log,
            stateChangeHandler,
            canvasSize,
          );
          log('alice is made');
          return testAliceSendsOnlyUseRight(aliceMaker, bobMaker, gallery);
        }
        case 'galleryRevokes': {
          log('starting galleryRevokes');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const host = E(vats.host).makeHost();
          const gallery = makeGallery(
            E,
            host,
            log,
            stateChangeHandler,
            canvasSize,
          );
          return testGalleryRevokes(aliceMaker, bobMaker, gallery);
        }
        case 'aliceSellsBack': {
          log('starting aliceSellsBack');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const host = E(vats.host).makeHost();
          const gallery = makeGallery(
            E,
            host,
            log,
            stateChangeHandler,
            canvasSize,
          );
          return testAliceSellsBack(aliceMaker, bobMaker, gallery, host);
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
