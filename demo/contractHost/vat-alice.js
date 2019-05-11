// Copyright (C) 2013 Google Inc.
// Copyright (C) 2018 Agoric
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable-next-line global-require, import/no-extraneous-dependencies */
import harden from '@agoric/harden';
import escrowExchange from './escrow';

function makeAlice(E, host, log) {
  const escrowSrc = `(${escrowExchange})`;

  let initialized = false;
  let myMoneyPurseP;
  let myMoneyIssuerP;
  /* eslint-disable-next-line no-unused-vars */
  let myStockPurseP;
  let myStockIssuerP;

  function init(myMoneyPurse, myStockPurse) {
    initialized = true;
    myMoneyPurseP = Promise.resolve(myMoneyPurse);
    myMoneyIssuerP = E(myMoneyPurse).getIssuer();
    myStockPurseP = Promise.resolve(myStockPurse);
    myStockIssuerP = E(myStockPurse).getIssuer();
    // eslint-disable-next-line no-use-before-define
    return alice; // alice and init use each other
  }

  const check = (_allegedSrc, _allegedSide) => {
    // for testing purposes, alice and bob are willing to play
    // any side of any contract, so that the failure we're testing
    // is in the contractHost's checking
  };

  const alice = harden({
    init,
    payBobWell(bob) {
      if (!initialized) {
        log('++ ERR: payBobWell called before init()');
      }
      const paymentP = E(myMoneyIssuerP).makeEmptyPurse();
      const ackP = E(paymentP).deposit(10, myMoneyPurseP);
      return ackP.then(_ => E(bob).buy('shoe', paymentP));
    },
    payBobBadly1(bob) {
      if (!initialized) {
        log('++ ERR: payBobBadly1 called before init()');
      }
      const payment = harden({ deposit(_amount, _src) {} });
      return E(bob).buy('shoe', payment);
    },
    payBobBadly2(bob) {
      if (!initialized) {
        log('++ ERR: payBobBadly2 called before init()');
      }
      const paymentP = E(myMoneyIssuerP).makeEmptyPurse();
      const ackP = E(paymentP).deposit(5, myMoneyPurseP);
      return ackP.then(_ => E(bob).buy('shoe', paymentP));
    },

    tradeWell(bob) {
      if (!initialized) {
        log('++ ERR: tradeWell called before init()');
      }
      const tokensP = E(host).setup(escrowSrc);
      const aliceTokenP = tokensP.then(tokens => tokens[0]);
      const bobTokenP = tokensP.then(tokens => tokens[1]);
      E(bob).invite(bobTokenP, escrowSrc, 1);
      return E(alice).invite(aliceTokenP, escrowSrc, 0);
    },

    invite(tokenP, allegedSrc, allegedSide) {
      if (!initialized) {
        log('++ ERR: invite called before init()');
      }

      check(allegedSrc, allegedSide);

      // eslint-disable-next-line no-unused-vars
      let cancel;
      const a = harden({
        moneySrcP: E(myMoneyIssuerP).makeEmptyPurse('aliceMoneySrc'),
        stockDstP: E(myStockIssuerP).makeEmptyPurse('aliceStockDst'),
        stockNeeded: 7,
        cancellationP: new Promise(r => (cancel = r)),
      });
      const ackP = E(a.moneySrcP).deposit(10, myMoneyPurseP);

      const doneP = ackP.then(_ =>
        E(host).play(tokenP, allegedSrc, allegedSide, a),
      );
      return doneP.then(_ => E(a.stockDstP).getBalance());
    },
  });
  return alice;
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAlice(host) {
        return harden(makeAlice(E, host, log));
      },
    }),
  );
}
