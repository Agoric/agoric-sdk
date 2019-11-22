// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeGallery } from '../../../more/pixels/gallery';

function build(E, log) {
  function testTapFaucet(aliceMaker, gallery) {
    log('starting testTapFaucet');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    return E(aliceP).doTapFaucet();
  }
  async function testAliceChangesColor(aliceMaker, gallery) {
    log('starting testAliceChangesColor');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    const alicePixelUnits = await E(aliceP).doChangeColor();
    const rawPixel = alicePixelUnits.extent[0];
    log(
      `current color ${gallery.userFacet.getPixelColor(
        rawPixel.x,
        rawPixel.y,
      )}`,
    );
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
    const galleryPayment = gallery.adminFacet.getPayment(rawPixel);
    E(galleryPayment).claimChild();
    E(aliceP).checkAfterRevoked();
  }
  async function testAliceSellsAndBuys(aliceMaker, bobMaker, gallery) {
    log('starting testAliceSellsAndBuys');
    const aliceP = E(aliceMaker).make(gallery.userFacet);
    await E(aliceP).doSellAndBuy();
  }
  async function testAliceSellsToBob(aliceMaker, bobMaker, gallery, sharing) {
    log('starting testAliceSellsToBob');
    const { userFacet, adminFacet } = gallery;
    const aliceP = E(aliceMaker).make(userFacet);
    const bobP = E(bobMaker).make(userFacet);
    const { dustAssay } = userFacet.getAssays();
    const aliceDust = dustAssay.makeEmptyPurse('Alice dust purse');
    const bobDust = adminFacet.dustMint.mint(37, 'bob purse');
    const {
      aliceRefundP,
      alicePaymentP,
      buyerSeatReceipt,
      contractHostReceipt,
    } = await E(aliceP).doTapFaucetAndOfferViaSharedMap(sharing, aliceDust);
    // Don't start Bob until Alice has created and stored the buyerSeat
    const { bobRefundP, bobPixelP } = await Promise.all([
      contractHostReceipt,
      buyerSeatReceipt,
    ]).then(_ => E(bobP).buyFromSharedMap(sharing, bobDust));
    Promise.all([aliceRefundP, alicePaymentP, bobRefundP, bobPixelP]).then(
      _res => log('++ aliceSellsToBob done'),
      rej => log('++ aliceSellsToBob reject: ', rej),
    );
  }

  async function testAliceCreatesFakeChild(aliceMaker, bobMaker, gallery) {
    log('starting testAliceCreatesFakeChild');
    const { userFacet } = gallery;
    const aliceP = E(aliceMaker).make(userFacet);
    const bobP = E(bobMaker).make(userFacet);
    await E(aliceP).doCreateFakeChild(bobP);
  }

  async function testSpendAndRevoke(aliceMaker, gallery) {
    log('starting testSpendAndRevoke');
    const { userFacet } = gallery;
    const aliceP = E(aliceMaker).make(userFacet);
    await E(aliceP).doSpendAndRevoke();
  }

  async function testGetAllPixels(aliceMaker, gallery) {
    log('starting testGetAllPixels');
    const { userFacet } = gallery;
    const aliceP = E(aliceMaker).make(userFacet);
    await E(aliceP).doGetAllPixels();
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      const canvasSize = 10;
      function stateChangeHandler(_newState) {
        // does nothing in this test
      }

      async function makeStartingObjs() {
        const host = await E(vats.host).makeHost();
        const aliceMaker = await E(vats.alice).makeAliceMaker(host);
        const bobMaker = await E(vats.bob).makeBobMaker(host);
        const gallery = await makeGallery(
          E,
          log,
          host,
          stateChangeHandler,
          canvasSize,
        );
        return harden({
          host,
          aliceMaker,
          bobMaker,
          gallery,
        });
      }

      switch (argv[0]) {
        case 'tapFaucet': {
          log('starting tapFaucet');
          log('alice is made');
          const { aliceMaker, gallery } = await makeStartingObjs();
          return testTapFaucet(aliceMaker, gallery);
        }
        case 'aliceChangesColor': {
          log('starting aliceChangesColor');
          log('alice is made');
          const { aliceMaker, gallery } = await makeStartingObjs();
          return testAliceChangesColor(aliceMaker, gallery);
        }
        case 'aliceSendsOnlyUseRight': {
          log('starting aliceSendsOnlyUseRight');
          log('alice is made');
          const { aliceMaker, bobMaker, gallery } = await makeStartingObjs();
          return testAliceSendsOnlyUseRight(aliceMaker, bobMaker, gallery);
        }
        case 'galleryRevokes': {
          log('starting galleryRevokes');
          const { aliceMaker, bobMaker, gallery } = await makeStartingObjs();
          return testGalleryRevokes(aliceMaker, bobMaker, gallery);
        }
        case 'aliceSellsAndBuys': {
          log('starting aliceSellsAndBuys');
          const { aliceMaker, bobMaker, gallery } = await makeStartingObjs();
          return testAliceSellsAndBuys(aliceMaker, bobMaker, gallery);
        }
        case 'aliceSellsToBob': {
          log('starting aliceSellsToBob');
          const { aliceMaker, bobMaker, gallery } = await makeStartingObjs();
          const sharingSvc = await E(vats.sharing).makeSharingService();
          return testAliceSellsToBob(aliceMaker, bobMaker, gallery, sharingSvc);
        }
        case 'aliceCreatesFakeChild': {
          log('starting aliceCreatesFakeChild');
          const { aliceMaker, bobMaker, gallery } = await makeStartingObjs();
          return testAliceCreatesFakeChild(aliceMaker, bobMaker, gallery);
        }
        case 'spendAndRevoke': {
          log('starting spendAndRevoke');
          const { aliceMaker, gallery } = await makeStartingObjs();
          return testSpendAndRevoke(aliceMaker, gallery);
        }
        case 'getAllPixels': {
          log('starting getAllPixels');
          const { aliceMaker, gallery } = await makeStartingObjs();
          return testGetAllPixels(aliceMaker, gallery);
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
