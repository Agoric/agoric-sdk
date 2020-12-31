// @ts-check
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import './types';

/** @type {EventualWithdraw} */
export const eventualWithdraw = (
  purse,
  amountMath,
  searchAmount,
  iterations = 1,
) => {
  const notifier = E(purse).getCurrentAmountNotifier();
  const paymentPromiseKit = makePromiseKit();

  const tryToFind = async lastUpdateCount => {
    if (iterations <= 0) {
      paymentPromiseKit.reject(Error('searchAmount could not be withdrawn'));
      return;
    }
    const { value: currentAmount, updateCount } = await E(
      notifier,
    ).getUpdateSince(lastUpdateCount);
    const foundAmount = amountMath.find(currentAmount, searchAmount);

    if (amountMath.isEmpty(foundAmount)) {
      // searchAmount was not found, try again
      iterations -= 1;
      tryToFind(updateCount);
      return;
    }

    // searchAmount was found! Withdraw a payment
    paymentPromiseKit.resolve(E(purse).withdraw(foundAmount));
  };

  tryToFind();
  return paymentPromiseKit.promise;
};
