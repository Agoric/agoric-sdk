/* eslint-disable import/no-extraneous-dependencies,no-unused-vars,no-empty-function */
import { Far } from '@endo/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

export function buildRootObject(vatPowers) {
  function makeCounter() {
    let count = 0;
    return Far('counter', {
      add(delta) {
        count += delta;
      },
      read() {
        return count;
      },
    });
  }
  const counter = makeCounter();
  const ik = makeIssuerKit('tokens');
  const purse = ik.issuer.makeEmptyPurse();
  const notifier = purse.getCurrentAmountNotifier();
  const brand = ik.issuer.getBrand();
  const payment = ik.mint.mintPayment(AmountMath.make(brand, 100n));

  let zoe;
  return Far('root', {
    setZoe(z) {
      zoe = z;
    },
    empty() {},
    async asyncEmpty() {},
    init() {
      const i = 1;
    },
    add() {
      let i = 1;
      i += 2;
    },
    loop100() {
      let sum;
      for (let i = 0; i < 100; i += 1) {
        sum += 1;
      }
    },
    loop1000() {
      let sum;
      for (let i = 0; i < 1000; i += 1) {
        sum += 1;
      }
    },
    makeCounter,
    counterAdd: counter.add,
    log() {
      console.log('');
    },
    makeIssuer() {
      makeIssuerKit('tokens');
    },
    getBrand() {
      ik.issuer.getBrand();
    },
    getCurrentAmount() {
      purse.getCurrentAmount();
    },
    deposit() {
      purse.deposit(payment);
    },
    getUpdateSince() {
      notifier.getUpdateSince();
    },
  });
}
