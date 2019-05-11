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

function makeBob(E, host, log) {
  const escrowSrc = `(${escrowExchange})`;

  let initialized = false;
  let myMoneyPurseP;
  let myMoneyIssuerP;
  let myStockPurseP;
  let myStockIssuerP;

  function init(myMoneyPurse, myStockPurse) {
    initialized = true;
    myMoneyPurseP = Promise.resolve(myMoneyPurse);
    myMoneyIssuerP = E(myMoneyPurse).getIssuer();
    myStockPurseP = Promise.resolve(myStockPurse);
    myStockIssuerP = E(myStockPurse).getIssuer();
    /* eslint-disable-next-line no-use-before-define */
    return bob; // bob and init use each other
  }

  const check = (_allegedSrc, _allegedSide) => {
    // for testing purposes, alice and bob are willing to play
    // any side of any contract, so that the failure we're testing
    // is in the contractHost's checking
  };

  const bob = harden({
    init,
    /**
     * This is not an imperative to Bob to buy something but rather
     * the opposite. It is a request by a client to buy something from
     * Bob, and therefore a request that Bob sell something. OO naming
     * is a bit confusing here.
     */
    buy(desc, paymentP) {
      if (!initialized) {
        log('++ ERR: buy called before init()');
      }
      /* eslint-disable-next-line no-unused-vars */
      let amount;
      let good;
      desc = `${desc}`;
      switch (desc) {
        case 'shoe': {
          amount = 10;
          good = 'If it fits, ware it.';
          break;
        }
        default: {
          throw new Error(`unknown desc: ${desc}`);
        }
      }

      return E(myMoneyPurseP)
        .deposit(10, paymentP)
        .then(_ => good);
    },

    tradeWell(alice, bobLies = false) {
      log('++ bob.tradeWell starting');
      if (!initialized) {
        log('++ ERR: tradeWell called before init()');
      }
      const tokensP = E(host).setup(escrowSrc);
      const aliceTokenP = tokensP.then(tokens => tokens[0]);
      const bobTokenP = tokensP.then(tokens => tokens[1]);
      let escrowSrcWeTellAlice = escrowSrc;
      if (bobLies) {
        escrowSrcWeTellAlice += 'NOT';
      }
      const doneP = Promise.all([
        E(alice).invite(aliceTokenP, escrowSrcWeTellAlice, 0),
        E(bob).invite(bobTokenP, escrowSrc, 1),
      ]);
      doneP.then(
        _res => log('++ bob.tradeWell done'),
        rej => log('++ bob.tradeWell reject', rej),
      );
      return doneP;
    },

    /**
     * As with 'buy', the naming is awkward. A client is inviting
     * this object, asking it to join in a contract instance. It is not
     * requesting that this object invite anything.
     */
    invite(tokenP, allegedSrc, allegedSide) {
      if (!initialized) {
        log('++ ERR: invite called before init()');
      }
      log('++ bob.invite start');
      check(allegedSrc, allegedSide);
      log('++ bob.invite passed check');
      /* eslint-disable-next-line no-unused-vars */
      let cancel;
      const b = harden({
        stockSrcP: E(myStockIssuerP).makeEmptyPurse('bobStockSrc'),
        moneyDstP: E(myMoneyIssuerP).makeEmptyPurse('bobMoneyDst'),
        moneyNeeded: 10,
        cancellationP: new Promise(r => (cancel = r)),
      });
      const ackP = E(b.stockSrcP).deposit(7, myStockPurseP);

      const doneP = ackP.then(_ => {
        log('++ bob.invite ackP');
        return E(host).play(tokenP, allegedSrc, allegedSide, b);
      });
      return doneP.then(
        _ => {
          log('++ bob.invite doneP');
          return E(b.moneyDstP).getBalance();
        },
        rej => {
          log('++ bob.invite doneP reject', rej);
        },
      );
    },
  });
  return bob;
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBob(host) {
        return harden(makeBob(E, host, log));
      },
    }),
  );
}
