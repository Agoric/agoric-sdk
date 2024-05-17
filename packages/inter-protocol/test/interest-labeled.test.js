import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
import { TimeMath } from '@agoric/time';

import { makeInterestCalculator, SECONDS_PER_YEAR } from '../src/interest.js';

const timerBrand = Far('fake timer brand', {
  isMyTimerService: () => true,
  isMyClock: () => true,
});
// const otherTimerBrand = Far('other fake timer brand', {});

const ONE_DAY = TimeMath.coerceRelativeTimeRecord(60n * 60n * 24n, timerBrand);
const ONE_MONTH = TimeMath.multiplyRelNat(ONE_DAY, 30n);
// const ONE_YEAR = TimeMath.multiplyRelNat(ONE_MONTH, 12n);
const BASIS_POINTS = 10000n;
const HUNDRED_THOUSAND = 100000n;
// const TEN_MILLION = 10000000n;

/**
 * This file is originally an adaptation of test-interest.js to labeled time.
 * The original often used values like ONE_DAY both as RelativeTime and as
 * Timestamps, which this file can no longer get away with. We left the original
 * duration constants as RelativeTime and use this adapter for those cases where
 * it was used as a Timestamp.
 *
 * @param {RelativeTime} rel
 * @returns {Timestamp}
 */
const fromZero = rel => TimeMath.addAbsRel(0n, rel);

/**
 * Absolute day starting from absolute zero
 *
 * @param {bigint} count
 * @returns {Timestamp}
 */
const dayN = count => fromZero(TimeMath.multiplyRelNat(ONE_DAY, count));

test('too soon', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    makeRatio(1n * SECONDS_PER_YEAR, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: 1000n,
    latestInterestUpdate: 10n,
    interest: 0n,
  };
  // no interest because the charging period hasn't elapsed
  t.deepEqual(calculator.calculate(debtStatus, 12n), {
    latestInterestUpdate: 10n,
    interest: 0n,
    newDebt: 1000n,
  });
});

test('basic charge 1 period', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250n, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(annualRate, ONE_DAY, ONE_MONTH);
  const debtStatus = {
    newDebt: HUNDRED_THOUSAND,
    latestInterestUpdate: 0n,
    interest: 0n,
  };
  // 7n is daily interest of 2.5% APR on 100k. Compounding is in the noise.
  t.deepEqual(calculator.calculate(debtStatus, dayN(1n)), {
    latestInterestUpdate: dayN(1n),
    interest: 7n,
    newDebt: 100007n,
  });
});

test('basic 2 charge periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250n, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(annualRate, ONE_DAY, ONE_MONTH);
  const debtStatus = {
    newDebt: HUNDRED_THOUSAND,
    latestInterestUpdate: dayN(1n),
    interest: 0n,
  };
  // 14n is 2x daily (from day 1 to day 3) interest of 2.5% APR on 100k.
  // Compounding is in the noise.
  t.deepEqual(calculator.calculate(debtStatus, dayN(3n)), {
    latestInterestUpdate: dayN(3n),
    interest: 14n,
    newDebt: 100014n,
  });
});

test('partial periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250n, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(annualRate, ONE_DAY, ONE_MONTH);
  const debtStatus = {
    newDebt: HUNDRED_THOUSAND,
    latestInterestUpdate: 10n,
    interest: 0n,
  };
  // just less than three days gets two days of interest (7n/day)
  t.deepEqual(
    calculator.calculate(debtStatus, TimeMath.subtractAbsRel(dayN(3n), 1n)),
    {
      latestInterestUpdate: TimeMath.addAbsRel(dayN(2n), 10n),
      interest: 14n,
      newDebt: 100014n,
    },
  );
});

test('reportingPeriod: partial', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250n, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(annualRate, ONE_DAY, ONE_MONTH);
  const debtStatus = {
    newDebt: HUNDRED_THOUSAND,
    latestInterestUpdate: 10n,
    interest: 0n,
  };

  // charge at reporting period intervals
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, fromZero(ONE_MONTH)),
    {
      latestInterestUpdate: 10n,
      interest: 0n,
      newDebt: HUNDRED_THOUSAND,
    },
  );
  // charge daily, record monthly. After a month, charge 30 * 7n
  t.deepEqual(
    calculator.calculateReportingPeriod(
      debtStatus,
      fromZero(TimeMath.addRelRel(ONE_DAY, ONE_MONTH)),
    ),
    {
      latestInterestUpdate: TimeMath.addAbsRel(10n, ONE_MONTH),
      interest: 210n,
      newDebt: 100210n,
    },
  );
});

test('reportingPeriod: longer', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250n, brand, BASIS_POINTS);
  const calculator = makeInterestCalculator(annualRate, ONE_MONTH, ONE_DAY);
  const debtStatus = {
    newDebt: HUNDRED_THOUSAND,
    latestInterestUpdate: 10n,
    interest: 0n,
  };
  // charge monthly, record daily. 2.5% APR compounded monthly rate is 204 BP.
  // charge at reporting period intervals
  t.deepEqual(
    calculator.calculateReportingPeriod(
      debtStatus,
      fromZero(TimeMath.addRelRel(ONE_DAY, ONE_MONTH)),
    ),
    {
      latestInterestUpdate: TimeMath.addAbsRel(10n, ONE_MONTH),
      interest: 204n,
      newDebt: 100204n,
    },
  );
});
