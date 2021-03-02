// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { bundleFunction } from '../../make-function-bundle';

import { escrowExchangeSrcs } from '../../../src/escrow';
import { coveredCallSrcs } from '../../../src/coveredCall';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;

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

  const fakeNeverTimer = Far('fakeNeverTimer', {
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
    let installationP;
    if (oldformat) {
      installationP = E(host).install(
        contractBundle.source,
        contractBundle.moduleFormat,
      );
    } else {
      installationP = E(host).install(contractBundle);
    }

    return E(host)
      .getInstallationSourceBundle(installationP)
      .then(bundle => {
        // the contents of a bundle are generally opaque to us: that's
        // between bundle-source and import-bundle . But we happen to know
        // that these contain a .source property, which is a string that
        // includes the contents of the function we bundled, which we can
        // compare.
        log('Does source match? ', bundle.source === contractBundle.source);

        const fooInviteP = E(installationP).spawn('foo terms');

        const inviteIssuerP = E(host).getInvitationIssuer();
        return Promise.resolve(
          showPaymentBalance('foo', inviteIssuerP, fooInviteP),
        ).then(_ => {
          const eightP = E(host).redeem(fooInviteP);

          eightP.then(res => {
            log('++ eightP resolved to ', res, ' (should be 8)');
            assert(res === 8, X`eightP resolved to ${res}, not 8`);
            log('++ DONE');
          });
          return eightP;
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

    const installationP = E(host).install(contractBundle);

    return E(host)
      .getInstallationSourceBundle(installationP)
      .then(bundle => {
        log('Does source match? ', bundle.source === contractBundle.source);

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
    ).makeIssuerKit('moola');
    const moolaAmountMath = await makeLocalAmountMath(moneyIssuer);
    const moola = moolaAmountMath.make;
    const aliceMoneyPaymentP = E(moneyMint).mintPayment(moola(1000));
    const bobMoneyPaymentP = E(moneyMint).mintPayment(moola(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).makeIssuerKit('Tyrell');
    const stockAmountMath = await makeLocalAmountMath(stockIssuer);
    const stocks = stockAmountMath.make;
    const aliceStockPaymentP = E(stockMint).mintPayment(stocks(2002));
    const bobStockPaymentP = E(stockMint).mintPayment(stocks(2003));

    const aliceP = E(aliceMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      aliceMoneyPaymentP,
      aliceStockPaymentP,
    );
    const bobP = E(bobMaker).make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      fakeNeverTimer,
      moneyIssuer,
      stockIssuer,
      bobMoneyPaymentP,
      bobStockPaymentP,
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

  async function betterContractTestBobFirst(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

    const { mint: moneyMint, issuer: moneyIssuer } = await E(
      mint,
    ).makeIssuerKit('clams');
    const moneyAmountMath = await makeLocalAmountMath(moneyIssuer);
    const money = moneyAmountMath.make;
    const aliceMoneyPayment = await E(moneyMint).mintPayment(money(1000));
    const bobMoneyPayment = await E(moneyMint).mintPayment(money(1001));

    const { mint: stockMint, issuer: stockIssuer } = await E(
      mint,
    ).makeIssuerKit('fudco');
    const stockAmountMath = await makeLocalAmountMath(stockIssuer);
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

  function coveredCallTest(host, mint, aliceMaker, bobMaker) {
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

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
    const escrowExchangeInstallationP = E(host).install(escrowExchangeSrcs);
    const coveredCallInstallationP = E(host).install(coveredCallSrcs);

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

  return Far('root', {
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
          assert.fail(X`unrecognized argument value ${vatParameters.argv[0]}`);
        }
      }
    },
  });
}
