// @ts-check

import '../../../exported';
import {
  makeNotifierKit,
  // After #2511, replace with observeNotifier with swapped arguments
  updateFromNotifier,
} from '@agoric/notifier';
import { assert, details as X } from '@agoric/assert';

import { natSafeMath } from '../../contractSupport';
import { scheduleLiquidation } from './scheduleLiquidation';

// Update the debt by adding the new interest on every period, as
// indicated by the periodNotifier

const BASIS_POINT_DENOMINATOR = 10000;

/**
 * @type {CalcInterestFn} Calculate the interest using an interest
 * rate in basis points.
 * i.e. oldDebtValue is 40,000
 * interestRate (in basis points) is 5 = 5/10,000
 * interest charged this period is 20 loan brand
 */
export const calculateInterest = (oldDebtValue, interestRate) =>
  natSafeMath.floorDivide(
    natSafeMath.multiply(oldDebtValue, interestRate),
    BASIS_POINT_DENOMINATOR,
  );

/** @type {MakeDebtCalculator} */
export const makeDebtCalculator = async debtCalculatorConfig => {
  const {
    calcInterestFn = calculateInterest,
    originalDebt,
    loanMath,
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

  const {
    updater: debtNotifierUpdater,
    notifier: debtNotifier,
  } = makeNotifierKit();

  const getDebt = () => debt;

  const config = { ...configMinusGetDebt, getDebt };

  const periodObserver = harden({
    updateState: timestamp => {
      let updatedLoan = false;
      // we could calculate the number of required updates and multiply by a power
      // of the interest rate, but this seems easier to read.
      while (lastCalculationTimestamp + interestPeriod <= timestamp) {
        lastCalculationTimestamp += interestPeriod;
        const interest = loanMath.make(
          calcInterestFn(debt.value, interestRate),
        );
        debt = loanMath.add(debt, interest);
        updatedLoan = true;
      }
      if (updatedLoan) {
        debtNotifierUpdater.updateState(debt);
        scheduleLiquidation(zcf, config);
      }
    },
    fail: reason => {
      assert.note(
        reason,
        X`Period problem: ${originalDebt}, started: ${basetime}, debt: ${debt}`,
      );
      console.error(reason);
    },
  });

  updateFromNotifier(periodObserver, periodNotifier).catch(reason => {
    assert.note(
      reason,
      X`Unable to updateDebt originally: ${originalDebt}, started: ${basetime}, debt: ${debt}`,
    );
    console.error(reason);
  });

  debtNotifierUpdater.updateState(debt);

  return harden({
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationTimestamp,
    getDebtNotifier: _ => debtNotifier,
  });
};
