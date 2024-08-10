import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { calculateInterest } from '../../../../src/contracts/loan/updateDebt.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';
import { setup } from '../../setupBasicMints.js';

test('test calculateInterest', async t => {
  const { brands } = setup();
  const brand = brands.get('moola');
  const testCalculateInterest = ([oldDebt, interestRate, expected]) => {
    const debt = harden({ brand, value: oldDebt });
    const interestRateRatio = makeRatio(interestRate, brand, 10000n);
    const interest = calculateInterest(debt, interestRateRatio);
    t.is(
      interest.value,
      expected,
      `(${oldDebt}, ${interestRate}) -> ${interest.value}, expected: ${expected}`,
    );
    t.is(interest.brand, brand);
  };

  /** @type {Array<[oldDebt: bigint, interestRate: bigint, expected: bigint]>} */
  const expectations = [
    [40000n, 5n, 20n],
    [0n, 5n, 0n], // debt of 0 is 0 interest
    [100n, 0n, 0n], // interest rate of 0 is 0 interest
    [10000000n, 3n, 3000n],
    [20392n, 1n, 3n],
  ];

  for (const expectation of expectations) {
    testCalculateInterest(expectation);
  }
});
