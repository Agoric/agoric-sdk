// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import { AmountMath, makeDurableIssuerKit } from '@agoric/ertp';
import { objectMap } from '@endo/patterns';
import { E } from '@endo/far';
import { prepareEscrowExchange } from '../../src/z2spec/escrow-exo.js';

const { keys, values } = Object;

/**
 * @import {EscrowSeatKit} from '../../src/z2spec/escrow-exo.js'
 */

/** @param {EscrowSeatKit['resolver']} resolver  */
const simpleExchange = async resolver => {
  const { give, want } = resolver.readOnly().getProposal();
  resolver.updateAllocation(want, give);
  await resolver.exit('fun!');
};

test('escrowExchange: Alice and Bob do simpleExchange ', async t => {
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

  const ex1 = makeEscrowExchange();

  /**
   * @param {string} name
   * @param {ProposalRecord} proposal
   * @param {Payment} payment
   */
  const makeParty = (name, proposal, payment) => {
    const purses = {
      Money: issuers.Money.makeEmptyPurse(),
      Stock: issuers.Stock.makeEmptyPurse(),
    };
    const { give, want } = proposal;
    const [giveKW] = keys(give);
    const payments = { [giveKW]: payment };
    t.log(name, 'to give', { ...give, payment });

    const [wantKW] = keys(want);
    /** @type {import('@agoric/ertp').DepositFacet} */
    const df = purses[wantKW].getDepositFacet();

    const go = async () => {
      const { seat, resolver } = await ex1.makeEscrowSeatKit(
        proposal,
        payments,
      );
      t.log(name, 'got seat, resolver', seat);
      const participate = simpleExchange(resolver);
      const deposit = E.when(seat.getPayouts(), pmts =>
        objectMap(pmts, (pmtP, k) =>
          E.when(pmtP, pmt => {
            t.log(name, 'depositing', k);
            return df.receive(pmt);
          }),
        ),
      );

      return Promise.all([participate, deposit]);
    };

    const getBalances = () => objectMap(purses, p => p.getCurrentAmount());
    return { go, getBalances };
  };

  const added = objectMap(issuers, (kw, i) => ex1.addIssuer(i, kw));
  await Promise.all(values(added));
  t.log('added issuers', ...keys(ex1.getIssuers()));

  const exit = { onDemand: null };
  const { a, b } = {
    a: makeParty(
      'Alice',
      {
        give: { Money: make(Money, 100n) },
        want: { Stock: make(Stock, 10n) },
        exit,
      },
      kit.Money.mint.mintPayment(make(Money, 100n)),
    ),
    b: makeParty(
      'Bob',
      {
        give: { Stock: make(Stock, 10n) },
        want: { Money: make(Money, 100n) },
        exit,
      },
      kit.Stock.mint.mintPayment(make(Stock, 10n)),
    ),
  };

  await Promise.all([a.go(), b.go()]);

  {
    const actual = { a: a.getBalances(), b: b.getBalances() };
    t.log('resulting balances', actual);
    t.deepEqual(actual, {
      a: { Money: make(Money, 0n), Stock: make(Stock, 10n) },
      b: { Money: make(Money, 100n), Stock: make(Stock, 0n) },
    });
  }
});

test.todo('test in durable zone');
