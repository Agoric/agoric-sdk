// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '../../../../exported';

import { calculateInterest } from '../../../../src/contracts/loan/updateDebt';
import { makeRatio } from '../../../../src/contractSupport';
import { setup } from '../../setupBasicMints';

test('test calculateInterest', async t => {
  const { brands } = setup();
  const brand = brands.get('moola');
  const testCalculateInterest = ([oldDebt, interestRate, expected]) => {
    const debt = { brand, value: oldDebt };
    const interestRateRatio = makeRatio(interestRate, brand, 10000n);
    const interest = calculateInterest(debt, interestRateRatio);
    t.is(interest.value, expected);
    t.is(interest.brand, brand);
  };

  const expectations = [
    [40000n, 5n, 20n],
    [0n, 5n, 0n], // debt of 0 is 0 interest
    [100n, 0n, 0n], // interest rate of 0 is 0 interest
    [10000000n, 3n, 3000n],
    [20392n, 1n, 2n],
  ];

  expectations.forEach(testCalculateInterest);
});
