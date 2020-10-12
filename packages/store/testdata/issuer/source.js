// Copyright (C) 2019 Agoric, under Apache License 2.0

// A braindead issuer to exercise the rewrite

// We need this line to trigger the rewrite.
import { makeExternalStore } from '@agoric/store';
import { Remotable } from '@agoric/marshal';
import { makeInterface, ERTPKind } from './interfaces';

function makeIssuerKit(allegedName) {
  const brand = Remotable(makeInterface(allegedName, ERTPKind.BRAND));

  const {
    makeInstance: makePayment,
    makeWeakStore: makePaymentWeakStore,
  } = makeExternalStore('payment', initialBalance => {
    const payment = Remotable(
      makeInterface(allegedName, ERTPKind.PAYMENT),
      undefined,
      {
        getAllegedBrand: () => brand,
      },
    );
    // eslint-disable-next-line no-use-before-define
    paymentLedger.init(payment, initialBalance);
    return payment;
  });

  /** @type {WeakStore<Payment, Amount>} */
  const paymentLedger = makePaymentWeakStore();

  /** @type {WeakStore<Purse, Amount>} */
  let purseLedger;

  // [...]
  const { makeInstance: makeDepositFacet } = makeExternalStore(
    'depositFacet',
    purse =>
      Remotable(makeInterface(allegedName, ERTPKind.DEPOSIT_FACET), undefined, {
        receive: purse.deposit,
      }),
  );

  const {
    makeInstance: makePurse,
    makeWeakStore: makePurseWeakStore,
  } = makeExternalStore('purse', (initialBalance = 0) => {
    const purse = Remotable(
      makeInterface(allegedName, ERTPKind.PURSE),
      undefined,
      {
        deposit: srcPayment => {
          const purseBalance = purse.getCurrentAmount();
          const srcPaymentBalance = paymentLedger.get(srcPayment);
          const newPurseBalance = purseBalance + srcPaymentBalance;
          paymentLedger.delete(srcPayment);
          purseLedger.set(purse, newPurseBalance);
          return srcPaymentBalance;
        },
        withdraw: amount => {
          const purseBalance = purse.getCurrentAmount();
          const newPurseBalance = purseBalance - amount;
          const payment = makePayment();
          purseLedger.set(purse, newPurseBalance);
          paymentLedger.init(payment, amount);
          return payment;
        },
        getCurrentAmount: () => purseLedger.get(purse),
        getAllegedBrand: () => brand,
        // eslint-disable-next-line no-use-before-define
        getDepositFacet: () => depositFacet,
      },
    );

    purseLedger.init(purse, initialBalance);
    const depositFacet = makeDepositFacet(purse);
    return purse;
  });

  purseLedger = makePurseWeakStore();

  return harden({ makePurse });
}

harden(makeIssuerKit);

export { makeIssuerKit };
