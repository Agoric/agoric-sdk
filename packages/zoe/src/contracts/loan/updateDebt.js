// @ts-check

import '../../../exported';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';

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
  const interestRatio = makeRatio(
    interestRate,
    debt.brand,
    BASIS_POINT_DENOMINATOR,
  );

  // the last period-end for which interest has been added
  let lastCalculationTimestamp;

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

  const addToDebtWhenNotified = lastCount => {
    const processUpdate = newState => {
      const { updateCount, value } = newState;
      if (updateCount === undefined) {
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

  // TODO(hibbert) https://github.com/Agoric/agoric-sdk/issues/2258
  // convert addToDebtWhenNotified to a for-await-of loop
  // for await (const value of iterateNotifier(periodNotifier)) {
  //   updateDebt(value);
  // }

  debtNotifierUpdater.updateState(debt);

  return harden({
    getDebt,
    getLastCalculationTimestamp: _ => lastCalculationTimestamp,
    getDebtNotifier: _ => debtNotifier,
  });
};
