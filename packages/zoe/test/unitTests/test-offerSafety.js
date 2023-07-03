import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import {
  isOfferSafe,
  satisfiesWant,
} from '../../src/contractFacet/offerSafety.js';
import { setup } from './setupBasicMints.js';

// Potential outcomes:
// 1. Users can get what they wanted, get back what they gave, both, or
// neither
// 2. Users can either get more than, less than, or equal to what they
//    wanted or gave

// possible combinations to test:
// more than want, more than give -> isOfferSafe() = true
// more than want, less than give -> true
// more than want, equal to give -> true
// less than want, more than give -> true
// less than want, less than give -> false
// less than want, equal to give -> true
// equal to want, more than give -> true
// equal to want, less than give -> true
// equal to want, equal to give -> true

// more than want, more than give -> isOfferSafe() = true
test('isOfferSafe - more than want, more than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    give: { A: moola(8n) },
    want: { B: simoleans(6n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(10n), B: simoleans(7n), C: bucks(8n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

// more than want, less than give -> true
test('isOfferSafe - more than want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    give: { A: moola(8n) },
    want: { B: simoleans(6n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(1n), B: simoleans(7n), C: bucks(8n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

// more than want, equal to give -> true
test('isOfferSafe - more than want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(9n), B: simoleans(6n), C: bucks(7n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

// less than want, more than give -> true
test('isOfferSafe - less than want, more than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(7n), B: simoleans(9n), C: bucks(19n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 0);
});

// less than want, less than give -> false
test('isOfferSafe - less than want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(7n), B: simoleans(5n), C: bucks(6n) });

  t.falsy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 0);
});

// less than want, equal to give -> true
test('isOfferSafe - less than want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(1n), B: simoleans(5n), C: bucks(7n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 0);
});

// equal to want, more than give -> true
test('isOfferSafe - equal to want, more than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(2n), B: simoleans(6n), C: bucks(8n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

// equal to want, less than give -> true
test('isOfferSafe - equal to want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(0n), B: simoleans(6n), C: bucks(0n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

// equal to want, equal to give -> true
test('isOfferSafe - equal to want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    exit: { waived: null },
  });
  const amounts = harden({ A: moola(1n), B: simoleans(6n), C: bucks(7n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});

test('isOfferSafe - empty proposal', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({ give: {}, want: {}, exit: { waived: null } });
  const amounts = harden({ A: moola(1n), B: simoleans(6n), C: bucks(7n) });

  t.truthy(isOfferSafe(proposal, amounts));
  t.is(satisfiesWant(proposal, amounts), 1);
});
