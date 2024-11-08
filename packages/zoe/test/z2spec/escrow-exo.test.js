// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import { AmountMath, makeDurableIssuerKit } from '@agoric/ertp';
import { makePromiseKit as withResolvers } from '@endo/promise-kit';
import { objectMap } from '@endo/patterns';
import { prepareEscrowExchange } from '../../src/z2spec/escrow-exo.js';

test('escrowExchange in heap zone', async t => {
  const z1 = makeHeapZone();
  const { makeEscrowExchange } = prepareEscrowExchange(z1);
  const kit = {
    Money: makeDurableIssuerKit(z1.mapStore('MB'), 'Money'),
    Stock: makeDurableIssuerKit(z1.mapStore('SB'), 'Stock'),
  };
  const { make } = AmountMath;
  const { Money, Stock } = harden({
    Money: kit.Money.brand,
    Stock: kit.Stock.brand,
  });
  const issuers = harden({ Money: kit.Money.issuer, Stock: kit.Stock.issuer });

  /**
   * @template {{ give: AmountKeywordRecord, want: AmountKeywordRecord}} P
   * @param {string} name
   * @param {P} proposal
   */
  const makeParty = (name, proposal) => {
    const { give, want } = proposal;
    const [[giveKW, giveAmt]] = Object.entries(give);
    const purses = {
      Money: issuers.Money.makeEmptyPurse(),
      Stock: issuers.Stock.makeEmptyPurse(),
    };
    const purse = purses[giveKW];
    purse.deposit(kit[giveKW].mint.mintPayment(giveAmt));
    const payment = purse.withdraw(giveAmt);
    t.log(name, 'to give', { ...give, payment });
    const [wantKW] = Object.keys(want);
    const sink = purses[wantKW].getDepositFacet();
    const sync = withResolvers();
    const { promise: cancel } = sync;
    return { detail: { ...proposal, sink, cancel, payment }, purses, sync };
  };
  const { a, b } = {
    a: makeParty('Alice', {
      give: { Money: make(Money, 100n) },
      want: { Stock: make(Stock, 10n) },
    }),
    b: makeParty('Bob', {
      give: { Stock: make(Stock, 10n) },
      want: { Money: make(Money, 100n) },
    }),
  };

  const ex1 = makeEscrowExchange({ a: a.detail, b: b.detail }, issuers);
  {
    const actual = ex1.run();
    await t.notThrowsAsync(
      Promise.all([actual.escrowed, actual.paid, actual.deposited]),
    );
  }

  {
    const actual = {
      a: objectMap(a.purses, p => p.getCurrentAmount()),
      b: objectMap(b.purses, p => p.getCurrentAmount()),
    };
    t.log('resulting balances', actual);
    t.deepEqual(actual, {
      a: { Money: make(Money, 0n), Stock: make(Stock, 10n) },
      b: { Money: make(Money, 100n), Stock: make(Stock, 0n) },
    });
  }
});
