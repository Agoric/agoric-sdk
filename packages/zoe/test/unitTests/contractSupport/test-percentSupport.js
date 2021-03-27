// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeIssuerKit, amountMath } from '@agoric/ertp';

import { multiplyBy, makeRatioFromAmounts } from '../../../src/contractSupport';
import {
  make100Percent,
  make0Percent,
  oneMinus,
} from '../../../src/contracts/callSpread/percent';

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
  const moe = value => amountMath.make(value, brand);

  amountsEqual(
    t,
    multiplyBy(moe(100000), make100Percent(brand)),
    moe(100000),
    brand,
  );
});

test('ratio - NONE', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => amountMath.make(value, brand);

  amountsEqual(
    t,
    amountMath.makeEmpty(brand),
    multiplyBy(moe(100000), make0Percent(brand)),
    brand,
  );
});

test('ratio - complement', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => amountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1), moe(3));
  const twoThirds = oneMinus(oneThird);

  amountsEqual(t, multiplyBy(moe(100000), oneThird), moe(33333), brand);
  amountsEqual(t, multiplyBy(moe(100000), twoThirds), moe(66666), brand);

  t.throws(() => oneMinus(moe(3)), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /Parameter must be a Ratio record, but .* has "brand"/,
      /Parameter must be a Ratio record, but .* has .*/,
  });
  t.throws(() => oneMinus(makeRatioFromAmounts(moe(30), moe(20))), {
    message: /Parameter must be less than or equal to 1: .*/,
  });
});
