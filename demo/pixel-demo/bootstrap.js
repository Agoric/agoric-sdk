// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { escrowExchangeSrc } from '../../core/escrow';
import { coveredCallSrc } from '../../core/coveredCall';
import { makeWholePixelList } from '../../more/pixels/types/pixelList';

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

  /*
  const fakeNowTimer = harden({
    delayUntil(deadline, resolution = undefined) {
      log(`Pretend ${deadline} passed`);
      return E.resolve(resolution);
    },
  });
  */
  const fakeNeverTimer = harden({
    delayUntil(deadline, _resolution = undefined) {
      log(`Pretend ${deadline} never happens`);
      return new Promise(_r => {});
    },
  });

  // This is written in the full assay style, where bare number
  // objects are never used in lieu of full amount objects. This has
  // the virtue of unit typing, where 3 dollars cannot be confused
  // with 3 seconds.
  function mintTestPixelListAssay(mint) {
    log('starting mintTestPixelListAssay');

    // assume canvasSize is 2, a 2x2 grid
    // 0, 0
    // 0, 1
    // 1, 0
    // 1, 1
    const canvasSize = 2;

    const mMintP = E(mint).makePixelListMint(canvasSize);
    const mIssuerP = E(mMintP).getIssuer();
    E.resolve(mIssuerP).then(issuer => {
      // By using an unforgeable issuer presence and a pass-by-copy
      // description together as a unit label, we check that both
      // agree. The veracity of the description is, however, only as
      // good as the issuer doing the check.
      const label = harden({ issuer, description: 'pixelList' });

      const allPixels = harden({
        label,
        quantity: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      });
      const startingPixel = harden({ label, quantity: [{ x: 0, y: 0 }] });

      const alicePurseP = E(mMintP).mint(allPixels, 'alice');
      const paymentP = E(alicePurseP).withdraw(startingPixel);
      E.resolve(paymentP).then(_ => {
        showPurseBalances('alice', alicePurseP);
        showPaymentBalance('payment', paymentP);
      });
    });
  }

  async function betterContractTestAliceFirst(
    host,
    mint,
    aliceMaker,
    bobMaker,
  ) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('moola');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000);
    const bobMoneyPurseP = E(moneyMintP).mint(1001);

    // assume canvasSize is 2, a 2x2 grid
    // 0, 0
    // 0, 1
    // 1, 0
    // 1, 1
    const canvasSize = 2;

    const pixelMintP = E(mint).makePixelListMint(canvasSize);
    const pixelIssuerP = E(pixelMintP).getIssuer();

    E.resolve(pixelIssuerP).then(issuer => {
      const label = harden({ issuer, description: 'pixelList' });
      const allPixelsList = makeWholePixelList(canvasSize);

      const alicePixels = allPixelsList.slice(0, allPixelsList.length / 2);
      const bobPixels = allPixelsList.slice(
        allPixelsList.length / 2,
        allPixelsList.length,
      );

      const alicePixelsAmount = {
        label,
        quantity: alicePixels,
      };

      const bobPixelsAmount = {
        label,
        quantity: bobPixels,
      };

      const alicePixelPurseP = E(pixelMintP).mint(alicePixelsAmount);
      const bobPixelPurseP = E(pixelMintP).mint(bobPixelsAmount);

      const aliceP = E(aliceMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        aliceMoneyPurseP,
        alicePixelPurseP,
      );
      const bobP = E(bobMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        bobMoneyPurseP,
        bobPixelPurseP,
      );
      return Promise.all([aliceP, bobP]).then(_ => {
        const resultP = E(aliceP).buyBobsPixelList(bobP);

        resultP.then(
          res => {
            log('++ exchange done:', res);
            log('++ DONE');
          },
          rej => log('++ exchange failed', rej),
        );
        return resultP;
      });
    });
  }

  function betterContractTestBobFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('clams');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000, 'aliceMainMoney');
    const bobMoneyPurseP = E(moneyMintP).mint(1001, 'bobMainMoney');

    const canvasSize = 2;

    const pixelMintP = E(mint).makePixelListMint(canvasSize);
    const pixelIssuerP = E(pixelMintP).getIssuer();

    E.resolve(pixelIssuerP).then(issuer => {
      const label = harden({ issuer, description: 'pixelList' });
      const allPixelsList = makeWholePixelList(canvasSize);

      const alicePixels = allPixelsList.slice(0, allPixelsList.length / 2);
      const bobPixels = allPixelsList.slice(
        allPixelsList.length / 2,
        allPixelsList.length,
      );

      const alicePixelsAmount = {
        label,
        quantity: alicePixels,
      };

      const bobPixelsAmount = {
        label,
        quantity: bobPixels,
      };

      // Alice has 0, 0; 0, 1
      // bob has 1, 0; 1, 1

      const alicePixelPurseP = E(pixelMintP).mint(alicePixelsAmount);
      const bobPixelPurseP = E(pixelMintP).mint(bobPixelsAmount);

      const aliceP = E(aliceMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        aliceMoneyPurseP,
        alicePixelPurseP,
      );
      const bobP = E(bobMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        bobMoneyPurseP,
        bobPixelPurseP,
      );
      return Promise.all([aliceP, bobP]).then(_ => {
        E(bobP)
          .tradeWell(aliceP, false)
          .then(
            res => {
              showPurseBalances('alice money', aliceMoneyPurseP);
              showPurseBalances('alice pixels', alicePixelPurseP);
              showPurseBalances('bob money', bobMoneyPurseP);
              showPurseBalances('bob pixels', bobPixelPurseP);
              log('++ bobP.tradeWell done:', res);
              log('++ DONE');
            },
            rej => {
              log('++ bobP.tradeWell error:', rej);
            },
          );
      });
    });
  }

  function coveredCallTest(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('smackers');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000, 'aliceMainMoney');
    const bobMoneyPurseP = E(moneyMintP).mint(1001, 'bobMainMoney');

    const canvasSize = 2;

    const pixelMintP = E(mint).makePixelListMint(canvasSize);
    const pixelIssuerP = E(pixelMintP).getIssuer();

    E.resolve(pixelIssuerP).then(issuer => {
      const label = harden({ issuer, description: 'pixelList' });
      const allPixelsList = makeWholePixelList(canvasSize);

      const alicePixels = allPixelsList.slice(0, allPixelsList.length / 2);
      const bobPixels = allPixelsList.slice(
        allPixelsList.length / 2,
        allPixelsList.length,
      );

      const alicePixelsAmount = {
        label,
        quantity: alicePixels,
      };

      const bobPixelsAmount = {
        label,
        quantity: bobPixels,
      };

      // Alice has 0, 0; 0, 1
      // bob has 1, 0; 1, 1

      const alicePixelPurseP = E(pixelMintP).mint(alicePixelsAmount);
      const bobPixelPurseP = E(pixelMintP).mint(bobPixelsAmount);

      const aliceP = E(aliceMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        aliceMoneyPurseP,
        alicePixelPurseP,
      );
      const bobP = E(bobMaker).make(
        escrowExchangeInstallationP,
        coveredCallInstallationP,
        fakeNeverTimer,
        bobMoneyPurseP,
        bobPixelPurseP,
      );
      return Promise.all([aliceP, bobP]).then(_ => {
        E(bobP)
          .offerAliceOption(aliceP, false)
          .then(
            res => {
              showPurseBalances('alice money', aliceMoneyPurseP);
              showPurseBalances('alice pixel', alicePixelPurseP);
              showPurseBalances('bob money', bobMoneyPurseP);
              showPurseBalances('bob pixel', bobPixelPurseP);
              log('++ bobP.offerAliceOption done:', res);
              log('++ DONE');
            },
            rej => {
              log('++ bobP.offerAliceOption error:', rej);
            },
          );
      });
    });
  }

  function coveredCallSaleTest(host, mint, aliceMaker, bobMaker, fredMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const doughMintP = E(mint).makeMint('dough');
    const aliceDoughPurseP = E(doughMintP).mint(1000, 'aliceDough');
    const bobDoughPurseP = E(doughMintP).mint(1001, 'bobDough');
    const fredDoughPurseP = E(doughMintP).mint(1002, 'fredDough');

    const stockMintP = E(mint).makeMint('wonka');
    const aliceStockPurseP = E(stockMintP).mint(2002, 'aliceMainStock');
    const bobStockPurseP = E(stockMintP).mint(2003, 'bobMainStock');
    const fredStockPurseP = E(stockMintP).mint(2004, 'fredMainStock');

    const finMintP = E(mint).makeMint('fins');
    const aliceFinPurseP = E(finMintP).mint(3000, 'aliceFins');
    const fredFinPurseP = E(finMintP).mint(3001, 'fredFins');

    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      bobDoughPurseP,
      bobStockPurseP,
    );
    const fredP = E(fredMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      fredDoughPurseP,
      fredStockPurseP,
      fredFinPurseP,
    );
    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      aliceDoughPurseP,
      aliceStockPurseP,
      aliceFinPurseP,
      fredP,
    );
    return Promise.all([aliceP, bobP, fredP]).then(_ => {
      E(bobP)
        .offerAliceOption(aliceP)
        .then(
          res => {
            showPurseBalances('alice dough', aliceDoughPurseP);
            showPurseBalances('alice stock', aliceStockPurseP);
            showPurseBalances('alice fins', aliceFinPurseP);

            showPurseBalances('bob dough', bobDoughPurseP);
            showPurseBalances('bob stock', bobStockPurseP);

            showPurseBalances('fred dough', fredDoughPurseP);
            showPurseBalances('fred stock', fredStockPurseP);
            showPurseBalances('fred fins', fredFinPurseP);

            log('++ bobP.offerAliceOption done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobP.offerAliceOption error:', rej);
          },
        );
    });
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      switch (argv[0]) {
        case 'mint': {
          return mintTestPixelListAssay(vats.mint);
        }
        case 'alice-first': {
          const host = await E(vats.host).makeHost();
          const aliceMaker = await E(vats.alice).makeAliceMaker(host);
          const bobMaker = await E(vats.bob).makeBobMaker(host);
          return betterContractTestAliceFirst(
            host,
            vats.mint,
            aliceMaker,
            bobMaker,
          );
        }
        case 'bob-first': {
          const host = await E(vats.host).makeHost();
          const aliceMaker = await E(vats.alice).makeAliceMaker(host);
          const bobMaker = await E(vats.bob).makeBobMaker(host);
          return betterContractTestBobFirst(
            host,
            vats.mint,
            aliceMaker,
            bobMaker,
          );
        }
        case 'covered-call': {
          const host = await E(vats.host).makeHost();
          const aliceMaker = await E(vats.alice).makeAliceMaker(host);
          const bobMaker = await E(vats.bob).makeBobMaker(host);
          return coveredCallTest(host, vats.mint, aliceMaker, bobMaker);
        }
        case 'covered-call-sale': {
          const host = await E(vats.host).makeHost();
          const aliceMaker = await E(vats.alice).makeAliceMaker(host);
          const bobMaker = await E(vats.bob).makeBobMaker(host);
          const fredMaker = await E(vats.fred).makeFredMaker(host);
          return coveredCallSaleTest(
            host,
            vats.mint,
            aliceMaker,
            bobMaker,
            fredMaker,
          );
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
