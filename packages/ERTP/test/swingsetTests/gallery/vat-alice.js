// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../../util/insist';
import { makeCollect } from '../../../core/contractHost';
import { escrowExchangeSrcs } from '../../../core/escrow';

// only used by doCreateFakeChild test below
import { makeMint } from '../../../core/mint';
import { makePixelConfigMaker } from '../../../more/pixels/pixelConfig';

let storedUseObj;
let storedERTPAsset;

function makeAliceMaker(E, log, contractHost) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getBalance()
      .then(units => log(name, ' balance ', units))
      .catch(err => console.log(err));
  }

  return harden({
    make(gallery) {
      function createSaleOffer(pixelPaymentP, dustPurseP) {
        return Promise.resolve(pixelPaymentP).then(async pixelPayment => {
          const { pixelAssay, dustAssay } = await E(gallery).getAssays();
          const pixelUnits = await E(pixelPayment).getBalance();
          const dustUnits = await E(E(dustAssay).getUnitOps()).make(37);
          const terms = harden({ left: dustUnits, right: pixelUnits });
          const escrowExchangeInstallationP = E(contractHost).install(
            escrowExchangeSrcs,
          );
          const { left: buyerInviteP, right: sellerInviteP } = await E(
            escrowExchangeInstallationP,
          ).spawn(terms);
          const seatP = E(contractHost).redeem(sellerInviteP);
          E(seatP).offer(pixelPayment);
          E(E(seatP).getWinnings())
            .getBalance()
            .then(b =>
              log(`Alice collected ${b.extent} ${b.label.allegedName}`),
            );
          const pixelPurseP = E(pixelAssay).makeEmptyPurse();
          collect(seatP, dustPurseP, pixelPurseP, 'alice escrow');
          return harden({ buyerInviteP, contractHost });
        });
      }

      const alice = harden({
        doTapFaucet() {
          log('++ alice.doTapFaucet starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          showPaymentBalance('pixel from faucet', pixelPaymentP);
        },
        async doChangeColor() {
          log('++ alice.doChangeColor starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          const pixels = E(pixelPaymentP).getUse();
          const changedUnits = await E(pixels).changeColorAll('#000000');
          log('tapped Faucet');
          return changedUnits;
        },
        async doSendOnlyUseRight(bob) {
          log('++ alice.doOnlySendUseRight starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          log('tapped Faucet');
          const pixels = E(pixelPaymentP).getUse();
          const rawPixels = await E(pixels).getRawPixels();
          const rawPixel = rawPixels[0];
          const origColors = await E(pixels).getColors();

          log(
            `pixel x:${rawPixel.x}, y:${rawPixel.y} has original color ${origColors[0].color}`,
          );

          // create child use object and send to bob
          // keep the original ERTP object and use right obj

          const childPayment = await E(pixelPaymentP).claimChild();
          const childPayment2 = await E(pixelPaymentP).claimChild();

          const result = await E(bob).receiveChildPayment(childPayment2);

          // Check that Alice's childPayment2 subsumed childPayment.
          // Note that claimChild() does not "kill" previously created
          // childPayments. This is because the revocation occurs on
          // the pixels in the units, and not on a per payment basis,
          // so payment linearity rules cannot apply. For instance, we
          // may be destroying one pixel from a childPayment and
          // leaving the rest.
          showPaymentBalance('childPayment', childPayment);
          // childPayment2 was killed outright because it was claimed
          // exclusively by Bob.
          showPaymentBalance('childPayment2', childPayment2);

          const bobsRawPixel = result.extent[0];
          insist(
            bobsRawPixel.x === rawPixel.x && bobsRawPixel.y === rawPixel.y,
          );
          const bobsColor = await E(gallery).getPixelColor(
            rawPixel.x,
            rawPixel.y,
          );
          log(
            `pixel x:${rawPixel.x}, y:${rawPixel.y} changed to bob's color ${bobsColor}`,
          );

          // alice takes the right back
          await E(pixelPaymentP).claimChild();
          await E(pixels).changeColorAll(
            '#9FBF95', // a light green
          );

          const alicesColor = await E(gallery).getPixelColor(
            rawPixel.x,
            rawPixel.y,
          );
          log(
            `pixel x:${rawPixel.x}, y:${rawPixel.y} changed to alice's color ${alicesColor}`,
          );

          // tell bob to try to color, he can't

          try {
            await E(bob)
              .tryToColorPixels()
              .then(
                _res => log('uh oh, bob was able to color'),
                rej => log(`bob was unable to color: ${rej}`),
              );
          } catch (err) {
            log(err);
          }

          try {
            await E(bob)
              .tryToColorERTP()
              .then(
                _res => log('uh oh, bob was able to color'),
                rej => log(`bob was unable to color: ${rej}`),
              );
          } catch (err) {
            log(err);
          }
        },
        async doTapFaucetAndStore() {
          log('++ alice.doTapFaucetAndStore starting');
          const pixelPayment = await E(gallery).tapFaucet();

          storedUseObj = E(pixelPayment).getUse();
          storedERTPAsset = pixelPayment;

          const rawPixels = await E(storedUseObj).getRawPixels();
          return rawPixels[0];
        },
        async checkAfterRevoked() {
          log('++ alice.checkAfterRevoked starting');
          // changeColor throws an Error with an empty payment
          // check transferRight is empty
          E(storedUseObj)
            .changeColorAll(
              '#9FBF95', // a light green
            )
            .then(
              _res => log(`successfully changed color, but shouldn't`),
              rej => log(`successfully threw ${rej}`),
            );

          const units = await E(storedERTPAsset).getBalance();
          log(
            `units extent should be an array of length 0: ${units.extent.length}`,
          );
        },
        async doSellAndBuy() {
          log('++ alice.doSellAndBuy starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          const { pixelAssay, dustAssay } = await E(gallery).getAssays();

          const units = await E(pixelPaymentP).getBalance();

          // sellToGallery creates a escrow smart contract with the
          // terms of the units parameter plus what the gallery is
          // willing to offer for it
          // sellToGallery returns an invite to the smart contract
          const { inviteP, host } = await E(gallery).sellToGallery(units);
          const seatP = E(host).redeem(inviteP);
          await E(seatP).offer(pixelPaymentP);
          const dustPurseP = E(dustAssay).makeEmptyPurse();
          const pixelPurseP = E(pixelAssay).makeEmptyPurse();
          await E(gallery).collectFromGallery(
            seatP,
            dustPurseP,
            pixelPurseP,
            'alice escrow',
          );
          // now buy it back
          const {
            inviteP: buyBackInviteP,
            host: buyBackHost,
            dustNeeded,
          } = await E(gallery).buyFromGallery(units);
          const buyBackSeatP = await E(buyBackHost).redeem(buyBackInviteP);
          const dustPaymentP = await E(dustPurseP).withdraw(dustNeeded);

          E(buyBackSeatP).offer(dustPaymentP);
          // alice is buying a pixel, so her win purse is a pixel
          // purse and her refund purse is a dust purse
          await E(gallery).collectFromGallery(
            buyBackSeatP,
            pixelPurseP,
            dustPurseP,
            'alice escrow 2',
          );
          showPaymentBalance('alice pixel purse', pixelPurseP);
          showPaymentBalance('alice dust purse', dustPurseP);
        },
        async doTapFaucetAndOfferViaSharedMap(sharingSvc, dustPurseP) {
          log('++ alice.doTapFaucetAndOfferViaSharedMap starting');
          const { pixelAssay } = await E(gallery).getAssays();
          const pixelPaymentP = E(gallery).tapFaucet();

          const { buyerInviteP } = await createSaleOffer(
            pixelPaymentP,
            dustPurseP,
          );

          // store buyerInviteP and contractHost in sharedMap
          const cbP = E(sharingSvc).createSharedMap('MeetPoint');
          const buyerSeatReceipt = E(cbP).addEntry('buyerSeat', buyerInviteP);
          const contractHostReceipt = E(cbP).addEntry(
            'contractHost',
            contractHost,
          );

          const pixelRefundP = E(pixelAssay).makeEmptyPurse('refund');
          return harden({
            aliceRefundP: pixelRefundP,
            alicePaymentP: dustPurseP,
            buyerSeatReceipt,
            contractHostReceipt,
          });
        },
        async doCreateFakeChild(bob) {
          log('++ alice.doCreateFakeChild starting');
          const { pixelAssay } = await E(gallery).getAssays();

          // create a fake childMint controlled entirely by Alice
          function makeUseObj(assay, asset) {
            const useObj = harden({
              changeColor(units, _newColor) {
                return units;
              },
              changeColorAll(newColor) {
                return useObj.changeColor(asset.getBalance(), newColor);
              },
              getRawPixels() {
                const unitOps = assay.getUnitOps();
                const pixelList = unitOps.extent(asset.getBalance());
                return pixelList;
              },
              getColors() {
                const pixelList = useObj.getRawPixels();
                const colors = [];
                for (const pixel of pixelList) {
                  colors.push(gallery.getPixelColor(pixel.x, pixel.y));
                }
                return colors;
              },
            });
            return useObj;
          }

          const makePixelConfig = makePixelConfigMaker(
            harden(makeUseObj),
            10,
            harden(pixelAssay),
          );

          const fakeChildMint = makeMint('pixels', makePixelConfig);

          // use the fakeChildMint to create a payment to trick Bob
          const fakeChildAssay = E(fakeChildMint).getAssay();
          const fakeChildDescOps = await E(fakeChildAssay).getUnitOps();
          const fakeChildPurse = E(fakeChildMint).mint(
            fakeChildDescOps.make(harden([{ x: 0, y: 1 }])),
          );
          const fakeChildPayment = E(fakeChildPurse).withdrawAll();

          await E(bob).receiveSuspiciousPayment(fakeChildPayment);

          // Note that the gallery cannot revoke anything that Alice
          // makes with her fakeChildMint, but this makes sense since
          // it is not a real child.
        },
        async doSpendAndRevoke() {
          // this tests how spending is related to revoking delegated
          // rights
          const pixelPaymentP = await E(gallery).tapFaucet();
          const childPaymentP = E(pixelPaymentP).claimChild();
          const grandchildPaymentP = E(childPaymentP).claimChild();

          const { pixelAssay } = await E(gallery).getAssays();
          const purseP = E(pixelAssay).makeEmptyPurse();
          const childAssayP = E(pixelAssay).getChildAssay();
          const childPurseP = E(childAssayP).makeEmptyPurse();
          const grandchildAssayP = E(childAssayP).getChildAssay();
          const grandchildPurseP = E(grandchildAssayP).makeEmptyPurse();

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);

          await E(childPurseP).depositAll(childPaymentP);

          log('childPayment deposited in childPurse');

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);

          await E(purseP).depositAll(pixelPaymentP);

          log('originalPixelPayment deposited in purse');

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);

          await E(grandchildPurseP).depositAll(grandchildPaymentP);

          log('grandchildPayment deposited in grandchildPurse');

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);

          try {
            // throws error because childPaymentP was consumed
            await E(childPaymentP).claimChild();
          } catch (err) {
            console.log(err);
          }

          log('childPayment.claimChild() does nothing');

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);

          await E(purseP).claimChild(); // revokes childPurse and grandchildPurse

          log('purse.claimChild() revokes childPurse and grandchildPurse');

          showPaymentBalance('originalPixelPayment', pixelPaymentP);
          showPaymentBalance('childPayment', childPaymentP);
          showPaymentBalance('grandchildPayment', grandchildPaymentP);
          showPaymentBalance('purse', purseP);
          showPaymentBalance('childPurseP', childPurseP);
          showPaymentBalance('grandchildPurseP', grandchildPurseP);
        },
        async doGetAllPixels() {
          log('++ alice.doGetAllPixels starting');

          const { pixelAssay } = await E(gallery).getAssays();
          const purse = await E(pixelAssay).makeEmptyPurse();
          for (let i = 0; i < 100; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const pixelPayment = await E(gallery).tapFaucet();
            // eslint-disable-next-line no-await-in-loop
            await E(purse).depositAll(pixelPayment);
          }
          showPaymentBalance('purse', purse);
          const units = await E(purse).getBalance();
          log(units.extent.length);

          // we have successfully obtained all the pixels from the gallery

          for (let i = 0; i < 10; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const pixelPayment = await E(gallery).tapFaucet();
            showPaymentBalance('payment', pixelPayment);
          }

          // These payments aren't zero
        },
      });
      return alice;
    },
  });
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(E, log, host));
      },
    }),
  );
}
export default harden(setup);
