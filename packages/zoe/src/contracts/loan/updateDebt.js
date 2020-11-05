// @ts-check

import '../../../exported';
import { makeNotifierKit, observeIteration } from '@agoric/notifier';

import { natSafeMath } from '../../contractSupport';

// Update the debt by adding the new interest on every period, as
// indicated by the periodAsyncIterable

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
    periodAsyncIterable,
    interestRate,
  } = debtCalculatorConfig;
  let debt = originalDebt;

  const {
    updater: debtNotifierUpdater,
    notifier: debtNotifier,
  } = makeNotifierKit();

  const updateDebt = _state => {
    const interest = loanMath.make(calcInterestFn(debt.value, interestRate));
    debt = loanMath.add(debt, interest);
    debtNotifierUpdater.updateState(debt);
  };

  /** @type {IterationObserver<undefined>} */
  const debtObserver = {
    // Debt is updated with interest every time the
    // periodAsyncIterable pushes another value
    updateState: updateDebt,
    finish: updateDebt,
    fail: reason => {
      debtNotifierUpdater.fail(reason);
      throw Error(reason);
    },
  };
  harden(debtObserver);

  // Initialize
  observeIteration(periodAsyncIterable, debtObserver);
  debtNotifierUpdater.updateState(debt);

  return harden({
    getDebt: () => debt,
    getDebtNotifier: () => debtNotifier,
  });
};
