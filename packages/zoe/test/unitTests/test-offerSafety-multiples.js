// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { isOfferSafe } from '../../src/contractFacet/offerSafety.js';
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
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(50n), B: simoleans(35n), C: bucks(40n) }),
    ),
  );
});

// more than want, less than give -> true
test('isOfferSafe - more than want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    give: { A: moola(8n) },
    want: { B: simoleans(6n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(1n), B: simoleans(35n), C: bucks(40n) }),
    ),
  );
});

// more than want, equal to give -> true
test('isOfferSafe - more than want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(45n), B: simoleans(30n), C: bucks(35n) }),
    ),
  );
});

// less than want, more than give -> true
test('isOfferSafe - less than want, more than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(7n), B: simoleans(45n), C: bucks(95n) }),
    ),
  );
});

// less than want, less than give -> false
test('isOfferSafe - less than want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { A: moola(8n) },
    give: { B: simoleans(6n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.falsy(
    isOfferSafe(
      proposal,
      harden({ A: moola(7n), B: simoleans(5n), C: bucks(6n) }),
    ),
  );
});

// less than want, equal to give -> true
test('isOfferSafe - less than want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(5n), B: simoleans(5n), C: bucks(35n) }),
    ),
  );
});

// equal to want, more than give -> true
test('isOfferSafe - equal to want, more than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(10n), B: simoleans(30n), C: bucks(40n) }),
    ),
  );
});

// equal to want, less than give -> true
test('isOfferSafe - equal to want, less than give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(0n), B: simoleans(30n), C: bucks(0n) }),
    ),
  );
});

// equal to want, equal to give -> true
test('isOfferSafe - equal to want, equal to give', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    want: { B: simoleans(6n) },
    give: { A: moola(1n), C: bucks(7n) },
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(5n), B: simoleans(30n), C: bucks(35n) }),
    ),
  );
});

test('isOfferSafe - empty proposal', t => {
  const { moola, simoleans, bucks } = setup();
  const proposal = harden({
    give: {},
    want: {},
    multiples: 5n,
    exit: { waived: null },
  });
  t.truthy(
    isOfferSafe(
      proposal,
      harden({ A: moola(1n), B: simoleans(6n), C: bucks(7n) }),
    ),
  );
});
