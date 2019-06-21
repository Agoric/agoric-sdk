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
    log(`pixel index is ${gallery.adminFacet.reportPosition(rawPixel)}`);
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
  async function testAliceSellsAndBuys(aliceMaker, bobMaker, gallery) {
    log('starting testAliceSellsAndBuys');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    await E(aliceP).doSellAndBuy();
  }
  async function testAliceSellsToBob(aliceMaker, bobMaker, gallery, handoff) {
    log('starting testAliceSellsToBob');
    const { userFacet, adminFacet } = gallery;
    const aliceP = E(aliceMaker).make(userFacet);
    const bobP = E(bobMaker).make(userFacet);
    const { dustIssuer } = userFacet.getIssuers();
    const aliceDust = dustIssuer.makeEmptyPurse('Alice dust purse');
    const bobDust = adminFacet.dustMint.mint(37, 'bob purse');
    const {
      aliceRefundP,
      alicePaymentP,
      buyerSeatReceipt,
      contractHostReceipt,
    } = await E(aliceP).doTapFaucetAndOfferViaCorkboard(
      handoff,
      aliceDust,
    );
    // Don't start Bob until Alice has created and stored the buyerSeat
    const { bobRefundP, bobPixelP } = await Promise.all([
      contractHostReceipt,
      buyerSeatReceipt,
    ]).then(_ => E(bobP).buyFromCorkBoard(handoff, bobDust));
    Promise.all([aliceRefundP, alicePaymentP, bobRefundP, bobPixelP]).then(
      _res => log('++ aliceSellsToBob done'),
      rej => log('++ aliceSellsToBob reject: ', rej),
    );
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
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          log('alice is made');
          return testTapFaucet(aliceMaker, gallery);
        }
        case 'aliceChangesColor': {
          log('starting aliceChangesColor');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          log('alice is made');
          return testAliceChangesColor(aliceMaker, gallery);
        }
        case 'aliceSendsOnlyUseRight': {
          log('starting aliceSendsOnlyUseRight');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          log('alice is made');
          return testAliceSendsOnlyUseRight(aliceMaker, bobMaker, gallery);
        }
        case 'galleryRevokes': {
          log('starting galleryRevokes');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          return testGalleryRevokes(aliceMaker, bobMaker, gallery);
        }
        case 'aliceSellsAndBuys': {
          log('starting aliceSellsAndBuys');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          return testAliceSellsAndBuys(aliceMaker, bobMaker, gallery);
        }
        case 'aliceSellsToBob': {
          log('starting aliceSellsToBob');
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          const bobMaker = await E(vats.bob).makeBobMaker();
          const handoffSvc = await E(vats.handoff).makeHandoffService();
          const gallery = makeGallery(E, log, stateChangeHandler, canvasSize);
          return testAliceSellsToBob(aliceMaker, bobMaker, gallery, handoffSvc);
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
