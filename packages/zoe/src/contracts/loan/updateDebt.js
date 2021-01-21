// @ts-check

import '../../../exported';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';

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
export const makeDebtCalculator = debtCalculatorConfig => {
  const {
    calcInterestFn = calculateInterest,
    originalDebt,
    loanMath,
    periodNotifier,
    interestRate,
    interestPeriod,
    zcf,
    configMinusGetDebt,
  } = debtCalculatorConfig;
  let debt = originalDebt;

  let lastCalculationTimestamp;

  const {
    updater: debtNotifierUpdater,
    notifier: debtNotifier,
  } = makeNotifierKit();

  const getDebt = () => debt;

  const config = { ...configMinusGetDebt, getDebt };

  const updateDebt = timestamp => {
    let prevUpdateTimestamp = lastCalculationTimestamp;
    while (prevUpdateTimestamp + interestPeriod <= timestamp) {
      prevUpdateTimestamp += interestPeriod;
      const interest = loanMath.make(calcInterestFn(debt.value, interestRate));
      debt = loanMath.add(debt, interest);
      debtNotifierUpdater.updateState(debt);
    }
    scheduleLiquidation(zcf, config);
    lastCalculationTimestamp = timestamp;
  };

  const addToDebtWhenNotified = lastCount => {
    const isFinalValue = updateCount => updateCount === undefined;
    const processUpdate = newState => {
      const { updateCount, value } = newState;
      if (isFinalValue(updateCount)) {
        const reason = 'PeriodNotifier should not publish a final value';
        debtNotifierUpdater.fail(reason);
        throw Error(reason);
      }

      updateDebt(value);
      addToDebtWhenNotified(updateCount);
    };
    const reject = reason => {
      debtNotifierUpdater.fail(reason);
      throw Error(reason);
    };

    E(periodNotifier)
      .getUpdateSince(lastCount)
      .then(processUpdate, reject);
  };

  // Initialize
  E(periodNotifier)
    .getUpdateSince()
    .then(({ value, updateCount }) => {
      lastCalculationTimestamp = value;
      addToDebtWhenNotified(updateCount);
    });
  debtNotifierUpdater.updateState(debt);

  return harden({
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationTimestamp,
    getDebtNotifier: _ => debtNotifier,
  });
};
