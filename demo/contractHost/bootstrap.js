// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { escrowExchangeSrc } from '../../core/escrow';
import { coveredCallSrc } from '../../core/coveredCall';

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
  function mintTestAssay(mint) {
    log('starting mintTestAssay');
    const mMintP = E(mint).makeMint('bucks');
    const mIssuerP = E(mMintP).getIssuer();
    E.resolve(mIssuerP).then(issuer => {
      // By using an unforgeable issuer presence and a pass-by-copy
      // description together as a unit label, we check that both
      // agree. The veracity of the description is, however, only as
      // good as the issuer doing the check.
      const label = harden({ issuer, description: 'bucks' });
      const bucks1000 = harden({ label, quantity: 1000 });
      const bucks50 = harden({ label, quantity: 50 });

      const alicePurseP = E(mMintP).mint(bucks1000, 'alice');
      const paymentP = E(alicePurseP).withdraw(bucks50);
      E.resolve(paymentP).then(_ => {
        showPurseBalances('alice', alicePurseP);
        showPaymentBalance('payment', paymentP);
      });
    });
  }

  // Uses raw numbers rather than amounts. Until we have support for
  // pass-by-presence, the full assay style shown in mintTestAssay is
  // too awkward.
  function mintTestNumber(mint) {
    log('starting mintTestNumber');
    const mMintP = E(mint).makeMint('quatloos');

    const alicePurseP = E(mMintP).mint(1000, 'alice');
    const paymentP = E(alicePurseP).withdraw(50);
    E.resolve(paymentP).then(_ => {
      showPurseBalances('alice', alicePurseP);
      showPaymentBalance('payment', paymentP);
    });
  }

  function trivialContractTest(host) {
    log('starting trivialContractTest');

    function trivContract(terms, inviteMaker) {
      return inviteMaker.make('foo', 8);
    }
    const contractSrc = `${trivContract}`;

    const installationP = E(host).install(contractSrc);

    return E(host)
      .getInstallationSourceCode(installationP)
      .then(src => {
        log('Does source ', src, ' match? ', src === contractSrc);

        const fooInviteP = E(installationP).spawn('foo terms');

        return E.resolve(showPaymentBalance('foo', fooInviteP)).then(_ => {
          const eightP = E(host).redeem(fooInviteP);

          eightP.then(res => {
            showPaymentBalance('foo', fooInviteP);
            log('++ eightP resolved to ', res, ' (should be 8)');
            if (res !== 8) {
              throw new Error(`eightP resolved to ${res}, not 8`);
            }
            log('++ DONE');
          });
          return eightP;
        });
      });
  }

  function betterContractTestAliceFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('moola');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000);
    const bobMoneyPurseP = E(moneyMintP).mint(1001);

    const stockMintP = E(mint).makeMint('Tyrell');
    const aliceStockPurseP = E(stockMintP).mint(2002);
    const bobStockPurseP = E(stockMintP).mint(2003);

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      aliceMoneyPurseP,
      aliceStockPurseP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      bobMoneyPurseP,
      bobStockPurseP,
    );
    return Promise.all([aliceP, bobP]).then(_ => {
      const ifItFitsP = E(aliceP).payBobWell(bobP);
      ifItFitsP.then(
        res => {
          log('++ ifItFitsP done:', res);
          log('++ DONE');
        },
        rej => log('++ ifItFitsP failed', rej),
      );
      return ifItFitsP;
    });
  }

  function betterContractTestBobFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('clams');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000, 'aliceMainMoney');
    const bobMoneyPurseP = E(moneyMintP).mint(1001, 'bobMainMoney');

    const stockMintP = E(mint).makeMint('fudco');
    const aliceStockPurseP = E(stockMintP).mint(2002, 'aliceMainStock');
    const bobStockPurseP = E(stockMintP).mint(2003, 'bobMainStock');

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      aliceMoneyPurseP,
      aliceStockPurseP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      bobMoneyPurseP,
      bobStockPurseP,
    );
    return Promise.all([aliceP, bobP]).then(_ => {
      E(bobP)
        .tradeWell(aliceP, false)
        .then(
          res => {
            showPurseBalances('alice money', aliceMoneyPurseP);
            showPurseBalances('alice stock', aliceStockPurseP);
            showPurseBalances('bob money', bobMoneyPurseP);
            showPurseBalances('bob stock', bobStockPurseP);
            log('++ bobP.tradeWell done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobP.tradeWell error:', rej);
          },
        );
    });
  }

  function coveredCallTest(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrc);
    const coveredCallInstallationP = E(host).install(coveredCallSrc);

    const moneyMintP = E(mint).makeMint('smackers');
    const aliceMoneyPurseP = E(moneyMintP).mint(1000, 'aliceMainMoney');
    const bobMoneyPurseP = E(moneyMintP).mint(1001, 'bobMainMoney');

    const stockMintP = E(mint).makeMint('yoyodyne');
    const aliceStockPurseP = E(stockMintP).mint(2002, 'aliceMainStock');
    const bobStockPurseP = E(stockMintP).mint(2003, 'bobMainStock');

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      aliceMoneyPurseP,
      aliceStockPurseP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      bobMoneyPurseP,
      bobStockPurseP,
    );
    return Promise.all([aliceP, bobP]).then(_ => {
      E(bobP)
        .offerAliceOption(aliceP, false)
        .then(
          res => {
            showPurseBalances('alice money', aliceMoneyPurseP);
            showPurseBalances('alice stock', aliceStockPurseP);
            showPurseBalances('bob money', bobMoneyPurseP);
            showPurseBalances('bob stock', bobStockPurseP);
            log('++ bobP.offerAliceOption done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobP.offerAliceOption error:', rej);
          },
        );
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
          mintTestAssay(vats.mint);
          return mintTestNumber(vats.mint);
        }
        case 'trivial': {
          const host = await E(vats.host).makeHost();
          return trivialContractTest(host);
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
