/* global Vow */
// Copyright (C) 2011 Google Inc.
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

/**
 * @fileoverview Test simple contract code
 * @requires define
 */

import harden from '@agoric/harden';

export default function setup(syscall, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  const { E, dispatch, registerRoot } = helpers.makeLiveSlots(syscall, helpers.vatID);

  function mintTest(mint) {
    console.log('starting mintTest');
    const mP = E(mint).makeMint();
    const alicePurseP = E(mP).mint(1000, 'alice');
    const mIssuerP = E(alicePurseP).getIssuer();
    const depositPurseP = E(mIssuerP).makeEmptyPurse('deposit');
    const v = E(depositPurseP).deposit(50, alicePurseP); // TODO: was .fork() hack
    // TODO: no longer true "this ordering should be guaranteed by the fact
    // that this is all in the same Flow"
    const aBal = v.then(_ => E(alicePurseP).getBalance());
    const dBal = v.then(_ => E(depositPurseP).getBalance());
    Promise.all([aBal, dBal]).then(bals => {
      console.log('++ balances:', bals);
      console.log('++ DONE');
    });
  }

  function trivialContractTest(host) {
    console.log('starting trivialContractTest');
    const contractHostP = E(host);

    function trivContract(_whiteP, _blackP) {
      return 8;
    }
    const contractSrc = `${trivContract}`;

    const tokensP = contractHostP.setup(contractSrc);

    const whiteTokenP = tokensP.then(tokens => tokens[0]);
    contractHostP.play(whiteTokenP, contractSrc, 0, {});

    const blackTokenP = tokensP.then(tokens => tokens[1]);
    const eightP = contractHostP.play(blackTokenP, contractSrc, 1, {});
    eightP.then(res => {
      console.log('++ eightP resolved to', res, '(should be 8)');
      if (res !== 8) {
        throw new Error(`eightP resolved to ${res}, not 8`);
      }
      console.log('++ DONE');
    });
    return eightP;
  }

  function betterContractTestAliceFirst(mint, host, alice, bob) {
    /* eslint-disable-next-line no-unused-vars */
    const contractHostP = E(host);
    const moneyMintP = E(mint).makeMint();
    const aliceMoneyPurseP = moneyMintP.mint(1000);
    const bobMoneyPurseP = moneyMintP.mint(1001);

    const stockMintP = E(mint).makeMint();
    const aliceStockPurseP = stockMintP.mint(2002);
    const bobStockPurseP = stockMintP.mint(2003);

    const aliceP = E(alice).init(aliceMoneyPurseP, aliceStockPurseP);
    /* eslint-disable-next-line no-unused-vars */
    const bobP = E(bob).init(bobMoneyPurseP, bobStockPurseP);

    const ifItFitsP = aliceP.payBobWell();
    ifItFitsP.then(
      res => {
        console.log('++ ifItFitsP done:', res);
        console.log('++ DONE');
      },
      rej => console.log('++ ifItFitsP failed', rej),
    );
    return ifItFitsP;
  }

  function betterContractTestBobFirst(
    mint,
    host,
    alice,
    bob,
    bobLies = false,
  ) {
    /* eslint-disable-next-line no-unused-vars */
    const contractHostP = E(host);
    const moneyMintP = E(mint).makeMint();
    const aliceMoneyPurseP = moneyMintP.mint(1000, 'aliceMainMoney');
    const bobMoneyPurseP = moneyMintP.mint(1001, 'bobMainMoney');

    const stockMintP = E(mint).makeMint();
    const aliceStockPurseP = stockMintP.mint(2002, 'aliceMainStock');
    const bobStockPurseP = stockMintP.mint(2003, 'bobMainStock');

    /* eslint-disable-next-line no-unused-vars */
    const aliceP = E(alice).init(aliceMoneyPurseP, aliceStockPurseP);
    const bobP = E(bob).init(bobMoneyPurseP, bobStockPurseP);

    bobP.tradeWell(bobLies).then(
      res => {
        console.log('++ bobP.tradeWell done:', res);
        console.log('++ DONE');
      },
      rej => {
        console.log('++ bobP.tradeWell error:', rej);
      },
    );
    //  return aliceP.tradeWell(bobP);
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      if (argv[0] === 'mint') {
        return mintTest(vats.mint);
      }
      const host = await E(vats.host).makeHost();
      if (argv[0] === 'trivial') {
        return trivialContractTest(host);
      }
      const alice = await E(vats.alice).makeAlice(host, bob);
      const bob = await E(vats.bob).makeBob(host, alice);
      if (argv[0] === 'alice-first') {
        betterContractTestAliceFirst(vats.mint, host, alice, bob);
      } else if (argv[0] === 'bob-first') {
        betterContractTestBobFirst(vats.mint, host, alice, bob);
      } else if (argv[0] === 'bob-first-lies') {
        betterContractTestBobFirst(
          vats.mint,
          host,
          alice,
          bob,
          true,
        );
      }
      return undefined;
    },
  };
  registerRoot(harden(obj0));
  return dispatch;
}
