// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeInterestCalculator, SECONDS_PER_YEAR } from '../src/interest.js';

const ONE_DAY = 60n * 60n * 24n;
const ONE_MONTH = ONE_DAY * 30n;
const ONE_YEAR = ONE_MONTH * 12n;
const BASIS_POINTS = 10000n;
const HUNDRED_THOUSAND = 100000n;
const TEN_MILLION = 10000000n;

test('too soon', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n * SECONDS_PER_YEAR, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: AmountMath.make(1000n, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };
  // no interest because the charging period hasn't elapsed
  t.deepEqual(calculator.calculate(debtStatus, 12n), {
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(1000n, brand),
  });
});

test('basic charge 1 period', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 0n,
    interest: AmountMath.makeEmpty(brand),
  };
  // 6n is daily interest of 2.5% APR on 100k. Compounding is in the noise.
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), {
    latestInterestUpdate: ONE_DAY,
    interest: AmountMath.make(6n, brand),
    newDebt: AmountMath.make(100006n, brand),
  });
});

test('basic 2 charge periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: ONE_DAY,
    interest: AmountMath.makeEmpty(brand),
  };
  // 12n is 2x daily (from day 1 to day 3) interest of 2.5% APR on 100k.
  // Compounding is in the noise.
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY * 3n), {
    latestInterestUpdate: ONE_DAY * 3n,
    interest: AmountMath.make(12n, brand),
    newDebt: AmountMath.make(100012n, brand),
  });
});

test('partial periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };
  // just less than three days gets two days of interest (6n/day)
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY * 3n - 1n), {
    latestInterestUpdate: 10n + ONE_DAY * 2n,
    interest: AmountMath.make(12n, brand),
    newDebt: AmountMath.make(100012n, brand),
  });
});

test('reportingPeriod: partial', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };

  // charge at reporting period intervals
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, ONE_MONTH), {
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
  });
  // charge daily, record monthly. After a month, charge 30 * 6n
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_DAY + ONE_MONTH),
    {
      latestInterestUpdate: 10n + ONE_MONTH,
      interest: AmountMath.make(180n, brand),
      newDebt: AmountMath.make(100180n, brand),
    },
  );
});

test('reportingPeriod: longer', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };
  // charge monthly, record daily. 2.5% APR compounded monthly rate is 203 BP.
  // charge at reporting period intervals
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_MONTH + ONE_DAY),
    {
      latestInterestUpdate: ONE_MONTH + 10n,
      interest: AmountMath.make(203n, brand),
      newDebt: AmountMath.make(100203n, brand),
    },
  );
});

test('start charging later', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 16n,
    interest: AmountMath.makeEmpty(brand),
  };
  // from a baseline of 16n, we don't charge interest until the timer gets to
  // ONE_DAY plus 16n.
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), {
    latestInterestUpdate: 16n,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY + 16n), {
    latestInterestUpdate: ONE_DAY + 16n,
    interest: AmountMath.make(6n, brand),
    newDebt: AmountMath.make(100006n, brand),
  });
});

test('simple compounding', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };
  // 30 days of 6n interest per day. Compounding is in the noise.
  // charge at reporting period intervals
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_MONTH + ONE_DAY),
    {
      latestInterestUpdate: ONE_MONTH + 10n,
      interest: AmountMath.make(180n, brand),
      newDebt: AmountMath.make(100180n, brand),
    },
  );
});

test('reportingPeriod shorter than charging', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  let debtStatus = {
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
  };
  const afterOneMonth = {
    latestInterestUpdate: 10n,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
  };
  // charging period is 30 days. interest isn't charged until then.
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 5n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 15n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 17n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 29n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, ONE_MONTH + 10n), {
    latestInterestUpdate: ONE_MONTH + 10n,
    interest: AmountMath.make(203n, brand),
    newDebt: AmountMath.make(100203n, brand),
  });

  debtStatus = {
    newDebt: AmountMath.make(100203n, brand),
    interest: AmountMath.make(203n, brand),
    latestInterestUpdate: ONE_MONTH,
  };
  const afterTwoMonths = {
    latestInterestUpdate: ONE_MONTH,
    interest: AmountMath.make(brand, 203n),
    newDebt: AmountMath.make(brand, 100203n),
  };
  // charging period is 30 days. 2nd interest isn't charged until 60 days.
  t.deepEqual(calculator.calculate(debtStatus, 32n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 40n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 50n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 59n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 60n * ONE_DAY), {
    latestInterestUpdate: 2n * ONE_MONTH,
    interest: AmountMath.make(406n, brand),
    newDebt: AmountMath.make(100406n, brand),
  });
});

test('reportingPeriod shorter than charging; start day boundary', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  const startOneDay = {
    latestInterestUpdate: ONE_DAY,
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
    interest: AmountMath.makeEmpty(brand),
  };
  const afterOneDay = {
    latestInterestUpdate: ONE_DAY,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(HUNDRED_THOUSAND, brand),
  };
  // no interest charged before a month elapses
  t.deepEqual(calculator.calculate(startOneDay, 4n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(startOneDay, 13n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(startOneDay, 15n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(startOneDay, 25n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(startOneDay, 29n * ONE_DAY), afterOneDay);

  const afterAMonth = {
    latestInterestUpdate: ONE_MONTH + ONE_DAY,
    interest: AmountMath.make(203n, brand),
    newDebt: AmountMath.make(100203n, brand),
  };
  // 203n is 2.5% APR charged monthly
  t.deepEqual(
    calculator.calculate(startOneDay, ONE_DAY + ONE_MONTH),
    afterAMonth,
  );
});

test('reportingPeriod shorter than charging; start not even days', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  const startPartialDay = {
    latestInterestUpdate: 20n,
    newDebt: AmountMath.make(101000n, brand),
    interest: AmountMath.makeEmpty(brand),
  };
  const afterOneMonth = {
    latestInterestUpdate: 20n,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(101000n, brand),
  };
  t.deepEqual(calculator.calculate(startPartialDay, ONE_MONTH), afterOneMonth);
  t.deepEqual(
    calculator.calculate(startPartialDay, ONE_MONTH + 10n),
    afterOneMonth,
  );
  // interest not charged until ONE_MONTH + 20n
  t.deepEqual(calculator.calculate(startPartialDay, ONE_MONTH + 20n), {
    latestInterestUpdate: 20n + ONE_MONTH,
    interest: AmountMath.make(205n, brand),
    newDebt: AmountMath.make(101205n, brand),
  });
});

// 2.5 % APR charged daily, large enough loan to display compounding
test.only('basic charge large numbers, compounding', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  // Unix epoch time:  Tuesday April 6th 2021 at 11:45am PT
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  // TEN_MILLION is enough to observe compounding
  const debtStatus = {
    newDebt: AmountMath.make(TEN_MILLION, brand),
    interest: AmountMath.makeEmpty(brand),
    latestInterestUpdate: START_TIME,
  };
  t.deepEqual(calculator.calculate(debtStatus, START_TIME), {
    latestInterestUpdate: START_TIME,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(TEN_MILLION, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + 1n), {
    latestInterestUpdate: START_TIME,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(TEN_MILLION, brand),
  });
  // 676n is one day's interest on TEN_MILLION at 2.5% APR.
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + ONE_DAY), {
    latestInterestUpdate: START_TIME + ONE_DAY,
    interest: AmountMath.make(676n, brand),
    newDebt: AmountMath.make(10000676n, brand),
  });
  // two days interest. compounding not visible
  t.deepEqual(
    calculator.calculate(debtStatus, START_TIME + ONE_DAY + ONE_DAY),
    {
      latestInterestUpdate: START_TIME + ONE_DAY + ONE_DAY,
      interest: AmountMath.make(1352n, brand),
      newDebt: AmountMath.make(10001352n, brand),
    },
  );
  // Notice that interest compounds 30 * 676 = 20280
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + ONE_MONTH), {
    latestInterestUpdate: START_TIME + ONE_MONTH,
    interest: AmountMath.make(20299n, brand),
    newDebt: AmountMath.make(10020299n, brand),
  });
});

// 2.5 % APR charged daily, large loan value.
// charge at reporting period intervals
test('basic charge reasonable numbers monthly', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, BASIS_POINTS);
  // Unix epoch time:  Tuesday April 6th 2021 at 11:45am PT
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  // TEN_MILLION is enough to observe compounding
  const debtStatus = {
    newDebt: AmountMath.make(TEN_MILLION, brand),
    interest: AmountMath.makeEmpty(brand),
    latestInterestUpdate: START_TIME,
  };
  // don't charge, since a month hasn't elapsed
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, START_TIME), {
    latestInterestUpdate: START_TIME,
    interest: AmountMath.makeEmpty(brand),
    newDebt: AmountMath.make(TEN_MILLION, brand),
  });
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + 1n),
    {
      latestInterestUpdate: START_TIME,
      interest: AmountMath.makeEmpty(brand),
      newDebt: AmountMath.make(TEN_MILLION, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_DAY),
    {
      latestInterestUpdate: START_TIME,
      interest: AmountMath.makeEmpty(brand),
      newDebt: AmountMath.make(TEN_MILLION, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(
      debtStatus,
      START_TIME + ONE_DAY + ONE_DAY,
    ),
    {
      latestInterestUpdate: START_TIME,
      interest: AmountMath.makeEmpty(brand),
      newDebt: AmountMath.make(TEN_MILLION, brand),
    },
  );

  // a month has elapsed. interest compounds: 30 * 676 = 20280
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_MONTH),
    {
      latestInterestUpdate: START_TIME + ONE_MONTH,
      interest: AmountMath.make(20299n, brand),
      newDebt: AmountMath.make(10020299n, brand),
    },
  );
  const HALF_YEAR = 6n * ONE_MONTH;

  // compounding: 180 days * 676 = 121680
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + HALF_YEAR),
    {
      latestInterestUpdate: START_TIME + HALF_YEAR,
      interest: AmountMath.make(122419n, brand),
      newDebt: AmountMath.make(10122419n, brand),
    },
  );
  // compounding: 360 days * 676 = 243360
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_YEAR),
    {
      latestInterestUpdate: START_TIME + ONE_YEAR,
      interest: AmountMath.make(246338n, brand),
      newDebt: AmountMath.make(10246338n, brand),
    },
  );
});
