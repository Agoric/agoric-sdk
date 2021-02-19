// @ts-check

import '../../../exported';
import { Far } from '@agoric/marshal';
import {
  makeNotifierKit,
  makeAsyncIterableFromNotifier,
} from '@agoric/notifier';

import { scheduleLiquidation } from './scheduleLiquidation';
import { makeRatio, multiplyBy } from '../../contractSupport';

// Update the debt by adding the new interest on every period, as
// indicated by the periodNotifier

const BASIS_POINT_DENOMINATOR = 10000n;

/**
 * @type {CalcInterestFn} Calculate the interest using an interest
 * rate in basis points.
 * i.e. oldDebtValue is 40,000
 * interestRate (in basis points) is 5 = 5/10,000
 * interest charged this period is 20 loan brand
 */
export const calculateInterest = (oldDebt, interestRate) =>
  multiplyBy(oldDebt, interestRate);

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
  const interestRatio = makeRatio(
    interestRate,
    debt.brand,
    BASIS_POINT_DENOMINATOR,
  );

  // the last period-end for which interest has been added
  let lastCalculationTimestamp = basetime;

  const {
    updater: debtNotifierUpdater,
    notifier: debtNotifier,
  } = makeNotifierKit();

  const getDebt = () => debt;

  const config = { ...configMinusGetDebt, getDebt };

  const updateDebt = timestamp => {
    let updatedLoan = false;
    // we could calculate the number of required updates and multiply by a power
    // of the interest rate, but this seems easier to read.
    while (lastCalculationTimestamp + interestPeriod <= timestamp) {
      lastCalculationTimestamp += interestPeriod;
      const interest = calcInterestFn(debt, interestRatio);
      debt = loanMath.add(debt, interest);
      updatedLoan = true;
    }
    if (updatedLoan) {
      debtNotifierUpdater.updateState(debt);
      scheduleLiquidation(zcf, config);
    }
  };

  const handleDebt = async () => {
    for await (const value of makeAsyncIterableFromNotifier(periodNotifier)) {
      updateDebt(value);
    }
  };
  handleDebt().catch(() =>
    console.error(
      `Unable to updateDebt originally:${originalDebt}, started: ${basetime}, debt: ${debt}`,
    ),
  );

  debtNotifierUpdater.updateState(debt);

  return Far('debtCalculator', {
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationTimestamp,
    getDebtNotifier: _ => debtNotifier,
  });
};
