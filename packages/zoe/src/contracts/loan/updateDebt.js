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

  let lastCalculationUpdate;

  const {
    updater: debtNotifierUpdater,
    notifier: debtNotifier,
  } = makeNotifierKit();

  const getDebt = () => debt;

  const config = { ...configMinusGetDebt, getDebt, interestPeriod };

  const updateDebt = state => {
    let prevUpdateTimestamp = lastCalculationUpdate.value;
    const { value: newTimestamp } = state;
    while (prevUpdateTimestamp + interestPeriod <= newTimestamp) {
      prevUpdateTimestamp += interestPeriod;
      const interest = loanMath.make(calcInterestFn(debt.value, interestRate));
      debt = loanMath.add(debt, interest);
      debtNotifierUpdater.updateState(debt);
    }
  };

  function addToDebtWhenNotified(lastCount) {
    E(periodNotifier)
      .getUpdateSince(lastCount)
      .then(
        newState => {
          const { updateCount } = newState;
          if (updateCount) {
            updateDebt(newState);
            scheduleLiquidation(zcf, config);
            lastCalculationUpdate = newState;
            addToDebtWhenNotified(updateCount);
          } else {
            updateDebt(newState);
            scheduleLiquidation(zcf, config);
            lastCalculationUpdate = newState;
          }
        },
        reason => {
          debtNotifierUpdater.fail(reason);
          throw Error(reason);
        },
      );
  }

  // Initialize
  E(periodNotifier)
    .getUpdateSince()
    .then(update => {
      lastCalculationUpdate = update;
      addToDebtWhenNotified(update.updateCount);
    });
  debtNotifierUpdater.updateState(debt);

  return harden({
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationUpdate.value,
    getDebtNotifier: () => debtNotifier,
  });
};
