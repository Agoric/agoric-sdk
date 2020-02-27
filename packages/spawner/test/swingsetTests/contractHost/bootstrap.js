// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import { escrowExchangeSrcs } from '../../../src/escrow';
import { coveredCallSrcs } from '../../../src/coveredCall';

function build(E, log) {
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, issuer, paymentP) {
    return paymentP.then(payment => {
      return E(issuer)
        .getAmountOf(payment)
        .then(amount => log(name, ' balance ', amount))
        .catch(err => console.log(err));
    });
  }
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPurseBalances(name, purseP) {
    return Promise.all([
      E(purseP)
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

  function trivialContractTest(host) {
    log('starting trivialContractTest');

    const trivContract = harden({
      start: (terms, inviteMaker) => {
        return inviteMaker.make('foo', 8);
      },
    });
    const contractSrcs = harden({ start: `${trivContract.start} ` });

    const installationP = E(host).install(contractSrcs);

    return E(host)
      .getInstallationSourceCode(installationP)
      .then(src => {
        log('Does source match? ', src.start === contractSrcs.start);

        const fooInviteP = E(installationP).spawn('foo terms');

        const inviteIssuerP = E(host).getInviteIssuer();

        return Promise.resolve(
          showPaymentBalance('foo', inviteIssuerP, fooInviteP),
        ).then(_ => {
          const eightP = E(host).redeem(fooInviteP);

          eightP.then(res => {
            showPaymentBalance('foo', inviteIssuerP, fooInviteP);
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

  function exhaustedContractTest(host) {
    log('starting exhaustedContractTest');

    const exhContract = harden({
      start: (terms, _inviteMaker) => {
        if (terms === 'loop forever') {
          for (;;) {
            // Do nothing.
          }
        } else {
          return 123;
        }
      },
    });
    const contractSrcs = harden({ start: `${exhContract.start} ` });

    const installationP = E(host).install(contractSrcs);

    return E(host)
      .getInstallationSourceCode(installationP)
      .then(src => {
        log('Does source match? ', src.start === contractSrcs.start);

        return E(installationP)
          .spawn('loop forever')
          .catch(e => log('spawn rejected: ', e.message));
      })
      .then(_ => E(installationP).spawn('just return'))
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
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).produceIssuer('moola');
    const moolaAmountMath = await getLocalAmountMath(moneyIssuer);
    const moola = moolaAmountMath.make;
    const aliceMoneyPurseP = E(moneyIssuer).makeEmptyPurse()
    await E(moneyMint).mintPayment(moola(1000)).then(payment => {
      return E(aliceMoneyPurseP).deposit( payment )
    })

    const bobMoneyPurseP = E(moneyIssuer).makeEmptyPurse()
    await E(moneyMint).mintPayment(moola(1001)).then(payment => {
      return E(bobMoneyPurseP).deposit( payment )
    })

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).produceIssuer('Tyrell');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPaymentP = E(stockMint).mintPayment(stocks(2002));
    const bobStockPaymentP = E(stockMint).mintPayment(stocks(2003));

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPurseP,
      aliceStockPaymentP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      bobMoneyPurseP,
      bobStockPaymentP,
    );

    aliceP.catch(err => console.error('alice err', err))

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

  async function betterContractTestBobFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).produceIssuer('clams');
    const moneyAmountMath = await getLocalAmountMath(moneyIssuer);
    const money = moneyAmountMath.make;
    const aliceMoneyPayment = await E(moneyMint).mintPayment(money(1000));
    const bobMoneyPayment = await E(moneyMint).mintPayment(money(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).produceIssuer('fudco');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPayment = await E(stockMint).mintPayment(stocks(2002));
    const bobStockPayment = await E(stockMint).mintPayment(stocks(2003));

    const aliceMoneyPurseP = E(moneyIssuer).makeEmptyPurse();
    const bobMoneyPurseP = E(moneyIssuer).makeEmptyPurse();
    const aliceStockPurseP = E(stockIssuer).makeEmptyPurse();
    const bobStockPurseP = E(stockIssuer).makeEmptyPurse();

    await E(aliceMoneyPurseP).deposit(aliceMoneyPayment);
    await E(aliceStockPurseP).deposit(aliceStockPayment);
    await E(bobMoneyPurseP).deposit(bobMoneyPayment);
    await E(bobStockPurseP).deposit(bobStockPayment);

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPurseP,
      aliceStockPurseP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
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

  async function coveredCallTest(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).produceIssuer('smackers');
    const moneyAmountMath = await getLocalAmountMath(moneyIssuer);
    const money = moneyAmountMath.make;
    const aliceMoneyPayment = E(moneyMint).mintPayment(money(1000));
    const bobMoneyPayment = E(moneyMint).mintPayment(money(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).produceIssuer('yoyodyne');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPayment = E(stockMint).mintPayment(stocks(2002));
    const bobStockPayment = E(stockMint).mintPayment(stocks(2003));
    
    const aliceMoneyPurseP = E(moneyIssuer).makeEmptyPurse();
    const bobMoneyPurseP = E(moneyIssuer).makeEmptyPurse();
    const aliceStockPurseP = E(stockIssuer).makeEmptyPurse();
    const bobStockPurseP = E(stockIssuer).makeEmptyPurse();

    await aliceMoneyPayment.then(payment => E(aliceMoneyPurseP).deposit(payment));
    await aliceStockPayment.then(payment => E(aliceStockPurseP).deposit(payment));
    await bobMoneyPayment.then(payment => E(bobMoneyPurseP).deposit(payment));
    await bobStockPayment.then(payment => E(bobStockPurseP).deposit(payment));

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPurseP,
      aliceStockPurseP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
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

  async function coveredCallSaleTest(host, mint, aliceMaker, bobMaker, fredMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

    const { mint: doughMint, issuer: doughIssuer } = await E(
      mint,
    ).produceIssuer('dough');
    const doughAmountMath = await getLocalAmountMath(doughIssuer);
    const dough = doughAmountMath.make;
    const aliceDoughPaymentP = E(doughMint).mintPayment(dough(1000));
    const bobDoughPaymentP = E(doughMint).mintPayment(dough(1001));
    const fredDoughPaymentP = E(doughMint).mintPayment(dough(1002));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).produceIssuer('wonka');
    const stockAmountMath = await getLocalAmountMath(stockIssuer);
    const stock = stockAmountMath.make;
    const aliceStockPaymentP = E(stockMint).mintPayment(stock(2002));
    const bobStockPaymentP = E(stockMint).mintPayment(stock(2003));
    const fredStockPaymentP = E(stockMint).mintPayment(stock(2004));

    const { mint: finMint, issuer: finIssuer } = await E(
      mint,
    ).produceIssuer('fins');
    const finAmountMath = await getLocalAmountMath(finIssuer);
    const fin = finAmountMath.make;
    const aliceFinPaymentP = E(finMint).mintPayment(fin(3000));
    const fredFinPaymentP = E(finMint).mintPayment(fin(3001));
    
    const aliceDoughPurseP = E(doughIssuer).makeEmptyPurse();
    const bobDoughPurseP = E(doughIssuer).makeEmptyPurse();
    const aliceStockPurseP = E(stockIssuer).makeEmptyPurse();
    const bobStockPurseP = E(stockIssuer).makeEmptyPurse();
    const aliceFinPurseP = E(finIssuer).makeEmptyPurse();

    await aliceDoughPaymentP.then(payment => E(aliceDoughPurseP).deposit(payment));
    await bobDoughPaymentP.then(payment => E(bobDoughPurseP).deposit(payment));
    await aliceStockPaymentP.then(payment => E(aliceStockPurseP).deposit(payment));
    await bobStockPaymentP.then(payment => E(bobStockPurseP).deposit(payment));
    await aliceFinPaymentP.then(payment => E(aliceFinPurseP).deposit(payment));

    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      doughIssuer,
      stockIssuer,
      bobDoughPurseP,
      bobStockPurseP,
    );
    const fredP = E(fredMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      doughIssuer,
      stockIssuer,
      finIssuer,
      fredDoughPaymentP,
      fredStockPaymentP,
      fredFinPaymentP,
    );
    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      doughIssuer,
      stockIssuer,
      aliceDoughPurseP,
      aliceStockPurseP,
      aliceFinPurseP,
      finIssuer,
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
