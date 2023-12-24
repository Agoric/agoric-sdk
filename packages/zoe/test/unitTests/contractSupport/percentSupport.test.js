import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { floorMultiplyBy } from '../../../src/contractSupport/index.js';
import {
  make100Percent,
  make0Percent,
} from '../../../src/contracts/callSpread/percent.js';

// duplicated from test-ratio, but should go away with the amount refactoring
function amountsEqual(t, a1, a2, brand) {
  const brandEqual = a1.brand === a2.brand;
  const valueEqual = a1.value === a2.value;
  const correctBrand = a1.brand === brand;
  if (brandEqual && valueEqual && correctBrand) {
    t.truthy(brandEqual);
  } else if (brandEqual && correctBrand) {
    t.fail(`expected equal values: ${a1.value} !== ${a2.value}`);
  } else if (valueEqual) {
    t.fail(`Expected brand ${brand}, but got ${a1.brand} and ${a2.brand}`);
  } else if (!brandEqual && !valueEqual && !correctBrand) {
    t.fail(`nothing matches ${a1}, ${a2}, ${brand}`);
  } else {
    t.fail(
      `neither values: (${a1.value}, ${a2.value}) nor brands matched (${brand} expected) ${a1.brand}, ${a2.brand})`,
    );
  }
}

test('ratio - ALL', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => AmountMath.make(brand, value);

  amountsEqual(
    t,
    floorMultiplyBy(moe(100000n), make100Percent(brand)),
    moe(100000n),
    brand,
  );
});

test('ratio - NONE', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => AmountMath.make(brand, value);

  amountsEqual(
    t,
    AmountMath.makeEmpty(brand),
    floorMultiplyBy(moe(100000n), make0Percent(brand)),
    brand,
  );
});
