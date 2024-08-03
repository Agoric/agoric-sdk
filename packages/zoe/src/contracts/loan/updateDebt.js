import { annotateError, X } from '@endo/errors';
import { Far } from '@endo/marshal';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { TimeMath } from '@agoric/time';

import { scheduleLiquidation } from './scheduleLiquidation.js';
import { ceilMultiplyBy } from '../../contractSupport/index.js';

// Update the debt by adding the new interest on every period, as
// indicated by the periodNotifier

/**
 * @type {CalcInterestFn} Calculate the interest using an interest
 * rate in basis points.
 * i.e. oldDebtValue is 40,000
 * interestRate (in basis points) is 5 = 5/10,000
 * interest charged this period is 20 loan brand
 */
export const calculateInterest = (oldDebt, interestRate) =>
  ceilMultiplyBy(oldDebt, interestRate);

/** @type {MakeDebtCalculator} */
export const makeDebtCalculator = debtCalculatorConfig => {
  const {
    calcInterestFn = calculateInterest,
    originalDebt,
    periodNotifier,
    interestRate,
    interestPeriod,
    basetime,
    zcf,
    configMinusGetDebt,
  } = debtCalculatorConfig;
  let debt = originalDebt;

  // the last period-end for which interest has been added
  let lastCalculationTimestamp = basetime;

  const { updater: debtNotifierUpdater, notifier: debtNotifier } =
    makeNotifierKit();

  const getDebt = () => debt;

  const config = { ...configMinusGetDebt, getDebt };

  const periodObserver = Far('periodObserver', {
    /** @type {(timestamp: import('@agoric/time').TimestampRecord) => void} */
    updateState: timestamp => {
      let updatedLoan = false;
      // we could calculate the number of required updates and multiply by a power
      // of the interest rate, but this seems easier to read.
      while (
        TimeMath.compareAbs(
          TimeMath.addAbsRel(lastCalculationTimestamp, interestPeriod),
          timestamp,
        ) <= 0
      ) {
        lastCalculationTimestamp = TimeMath.addAbsRel(
          lastCalculationTimestamp,
          interestPeriod,
        );
        const interest = calcInterestFn(debt, interestRate);
        debt = AmountMath.add(debt, interest);
        updatedLoan = true;
      }
      if (updatedLoan) {
        debtNotifierUpdater.updateState(debt);
        scheduleLiquidation(zcf, config);
      }
    },
    fail: reason => {
      annotateError(
        reason,
        X`Period problem: ${originalDebt}, started: ${basetime}, debt: ${debt}`,
      );
      console.error(reason);
    },
  });

  observeNotifier(periodNotifier, periodObserver).catch(reason => {
    annotateError(
      reason,
      X`Unable to updateDebt originally: ${originalDebt}, started: ${basetime}, debt: ${debt}`,
    );
    console.error(reason);
  });

  debtNotifierUpdater.updateState(debt);

  return Far('debtCalculator', {
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationTimestamp,
    getDebtNotifier: _ => debtNotifier,
  });
};
