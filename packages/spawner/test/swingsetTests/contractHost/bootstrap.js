// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { bundleFunction } from '../../make-function-bundle';

import { escrowExchangeSrcs } from '../../../src/escrow';
import { coveredCallSrcs } from '../../../src/coveredCall';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, issuer, paymentE) {
    return paymentE.then(payment => {
      return E(issuer)
        .getAmountOf(payment)
        .then(amount => log(name, ' balance ', amount))
        .catch(err => console.log(err));
    });
  }
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPurseBalances(name, purseE) {
    return Promise.all([
      E(purseE)
        .getCurrentAmount()
        .then(amount => log(name, ' balance ', amount))
        .catch(err => console.log(err)),
    ]);
  }

  const getLocalAmountMath = issuer =>
    Promise.all([
      E(issuer).getBrand(),
      E(issuer).getMathHelpersName(),
    ]).then(([brand, mathHelpersName]) =>
      makeAmountMath(brand, mathHelpersName),
    );

  const fakeNeverTimer = harden({
    setWakeup(deadline, _resolution = undefined) {
      log(`Pretend ${deadline} never happens`);
      return deadline;
    },
  });

  function trivialContractTest(host, oldformat) {
    log('starting trivialContractTest');

    function trivContractStart(terms, inviteMaker) {
      return inviteMaker.make('foo', 8);
    }
    const contractBundle = bundleFunction(trivContractStart);
    let installationE;
    if (oldformat) {
      installationE = E(host).install(
        contractBundle.source,
        contractBundle.moduleFormat,
      );
    } else {
      installationE = E(host).install(contractBundle);
    }

    return E(host)
      .getInstallationSourceBundle(installationE)
      .then(bundle => {
        // the contents of a bundle are generally opaque to us: that's
        // between bundle-source and import-bundle . But we happen to know
        // that these contain a .source property, which is a string that
        // includes the contents of the function we bundled, which we can
        // compare.
        log('Does source match? ', bundle.source === contractBundle.source);

        const fooInviteE = E(installationE).spawn('foo terms');

        const inviteIssuerE = E(host).getInviteIssuer();
        return Promise.resolve(
          showPaymentBalance('foo', inviteIssuerE, fooInviteE),
        ).then(_ => {
          const eightE = E(host).redeem(fooInviteE);

          eightE.then(res => {
            log('++ eightE resolved to ', res, ' (should be 8)');
            if (res !== 8) {
              throw new Error(`eightE resolved to ${res}, not 8`);
            }
            log('++ DONE');
          });
          return eightE;
        });
      });
  }

  function exhaustedContractTest(host) {
    log('starting exhaustedContractTest');

    function exhContractStart(terms, _inviteMaker) {
      if (terms === 'loop forever') {
        for (;;) {
          // Do nothing.
        }
      } else {
        return 123;
      }
    }
    const contractBundle = bundleFunction(exhContractStart);

    const installationE = E(host).install(contractBundle);

    return E(host)
      .getInstallationSourceBundle(installationE)
      .then(bundle => {
        log('Does source match? ', bundle.source === contractBundle.source);

        return E(installationE)
          .spawn('loop forever')
          .catch(e => log('spawn rejected: ', e.message));
      })
      .then(_ => E(installationE).spawn('just return'))
      .then(
        ret => log('got return: ', ret),
        err => log('error! ', err.message),
      );
  }

  async function betterContractTestAliceFirst(
    host,
    mint,
    aliceMaker,
    bobMaker,
  ) {
    const escrowExchangeInstallationE = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationE = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).makeIssuerKit('moola');
    const moolaAmountMath = await getLocalAmountMath(moneyIssuer);
    const moola = moolaAmountMath.make;
    const aliceMoneyPaymentE = E(moneyMint).mintPayment(moola(1000));
    const bobMoneyPaymentE = E(moneyMint).mintPayment(moola(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).makeIssuerKit('Tyrell');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPaymentE = E(stockMint).mintPayment(stocks(2002));
    const bobStockPaymentE = E(stockMint).mintPayment(stocks(2003));

    const aliceE = E(aliceMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPaymentE,
      aliceStockPaymentE,
    );
    const bobE = E(bobMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      bobMoneyPaymentE,
      bobStockPaymentE,
    );
    return Promise.all([aliceE, bobE]).then(_ => {
      const ifItFitsE = E(aliceE).payBobWell(bobE);
      ifItFitsE.then(
        res => {
          log('++ ifItFitsE done:', res);
          log('++ DONE');
        },
        rej => log('++ ifItFitsE failed', rej),
      );
      return ifItFitsE;
    });
  }

  async function betterContractTestBobFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationE = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationE = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).makeIssuerKit('clams');
    const moneyAmountMath = await getLocalAmountMath(moneyIssuer);
    const money = moneyAmountMath.make;
    const aliceMoneyPayment = await E(moneyMint).mintPayment(money(1000));
    const bobMoneyPayment = await E(moneyMint).mintPayment(money(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).makeIssuerKit('fudco');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPayment = await E(stockMint).mintPayment(stocks(2002));
    const bobStockPayment = await E(stockMint).mintPayment(stocks(2003));

    const aliceMoneyPurseE = E(moneyIssuer).makeEmptyPurse();
    const bobMoneyPurseE = E(moneyIssuer).makeEmptyPurse();
    const aliceStockPurseE = E(stockIssuer).makeEmptyPurse();
    const bobStockPurseE = E(stockIssuer).makeEmptyPurse();

    await E(aliceMoneyPurseE).deposit(aliceMoneyPayment);
    await E(aliceStockPurseE).deposit(aliceStockPayment);
    await E(bobMoneyPurseE).deposit(bobMoneyPayment);
    await E(bobStockPurseE).deposit(bobStockPayment);

    const aliceE = E(aliceMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPurseE,
      aliceStockPurseE,
    );
    const bobE = E(bobMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      bobMoneyPurseE,
      bobStockPurseE,
    );
    return Promise.all([aliceE, bobE]).then(_ => {
      E(bobE)
        .tradeWell(aliceE, false)
        .then(
          res => {
            showPurseBalances('alice money', aliceMoneyPurseE);
            showPurseBalances('alice stock', aliceStockPurseE);
            showPurseBalances('bob money', bobMoneyPurseE);
            showPurseBalances('bob stock', bobStockPurseE);
            log('++ bobE.tradeWell done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobE.tradeWell error:', rej);
          },
        );
    });
  }

  function coveredCallTest(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationE = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationE = E(host).install(coveredCallSrcs);

    const moneyMintE = E(mint).makeMint('smackers');
    const aliceMoneyPurseE = E(moneyMintE).mint(1000, 'aliceMainMoney');
    const bobMoneyPurseE = E(moneyMintE).mint(1001, 'bobMainMoney');

    const stockMintE = E(mint).makeMint('yoyodyne');
    const aliceStockPurseE = E(stockMintE).mint(2002, 'aliceMainStock');
    const bobStockPurseE = E(stockMintE).mint(2003, 'bobMainStock');

    const aliceE = E(aliceMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      aliceMoneyPurseE,
      aliceStockPurseE,
    );
    const bobE = E(bobMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      bobMoneyPurseE,
      bobStockPurseE,
    );
    return Promise.all([aliceE, bobE]).then(_ => {
      E(bobE)
        .offerAliceOption(aliceE, false)
        .then(
          res => {
            showPurseBalances('alice money', aliceMoneyPurseE);
            showPurseBalances('alice stock', aliceStockPurseE);
            showPurseBalances('bob money', bobMoneyPurseE);
            showPurseBalances('bob stock', bobStockPurseE);
            log('++ bobE.offerAliceOption done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobE.offerAliceOption error:', rej);
          },
        );
    });
  }

  function coveredCallSaleTest(host, mint, aliceMaker, bobMaker, fredMaker) {
    const escrowExchangeInstallationE = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationE = E(host).install(coveredCallSrcs);

    const doughMintE = E(mint).makeMint('dough');
    const aliceDoughPurseE = E(doughMintE).mint(1000, 'aliceDough');
    const bobDoughPurseE = E(doughMintE).mint(1001, 'bobDough');
    const fredDoughPurseE = E(doughMintE).mint(1002, 'fredDough');

    const stockMintE = E(mint).makeMint('wonka');
    const aliceStockPurseE = E(stockMintE).mint(2002, 'aliceMainStock');
    const bobStockPurseE = E(stockMintE).mint(2003, 'bobMainStock');
    const fredStockPurseE = E(stockMintE).mint(2004, 'fredMainStock');

    const finMintE = E(mint).makeMint('fins');
    const aliceFinPurseE = E(finMintE).mint(3000, 'aliceFins');
    const fredFinPurseE = E(finMintE).mint(3001, 'fredFins');

    const bobE = E(bobMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      bobDoughPurseE,
      bobStockPurseE,
    );
    const fredE = E(fredMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      fredDoughPurseE,
      fredStockPurseE,
      fredFinPurseE,
    );
    const aliceE = E(aliceMaker).make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      fakeNeverTimer,
      aliceDoughPurseE,
      aliceStockPurseE,
      aliceFinPurseE,
      fredE,
    );
    return Promise.all([aliceE, bobE, fredE]).then(_ => {
      E(bobE)
        .offerAliceOption(aliceE)
        .then(
          res => {
            showPurseBalances('alice dough', aliceDoughPurseE);
            showPurseBalances('alice stock', aliceStockPurseE);
            showPurseBalances('alice fins', aliceFinPurseE);

            showPurseBalances('bob dough', bobDoughPurseE);
            showPurseBalances('bob stock', bobStockPurseE);

            showPurseBalances('fred dough', fredDoughPurseE);
            showPurseBalances('fred stock', fredStockPurseE);
            showPurseBalances('fred fins', fredFinPurseE);

            log('++ bobE.offerAliceOption done:', res);
            log('++ DONE');
          },
          rej => {
            log('++ bobE.offerAliceOption error:', rej);
          },
        );
    });
  }

  const obj0 = {
    async bootstrap(vats) {
      switch (vatParameters.argv[0]) {
        case 'trivial-oldformat': {
          const host = await E(vats.host).makeHost();
          return trivialContractTest(host, 'oldformat');
        }
        case 'trivial': {
          const host = await E(vats.host).makeHost();
          return trivialContractTest(host);
        }
        case 'exhaust': {
          const host = await E(vats.host).makeHost();
          return exhaustedContractTest(host);
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
          throw Error(`unrecognized argument value ${vatParameters.argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
