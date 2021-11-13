// @ts-check

import { passStyleOf } from '@agoric/marshal';

const { details: X } = assert;

/**
 * This function uses passStyleOf to assert that the argument is a
 * copyArray, remotable or promise. It returns a standardized form: a
 * copyArray of remotables or promises for remotables.
 *
 * @param {Array<ERef<Payment>> | ERef<Payment>} payments
 * @returns {Array<ERef<Payment>>}
 */
const assertPayments = payments => {
  const paymentsPassStyle = passStyleOf(payments);
  assert(
    paymentsPassStyle === 'copyArray' ||
      paymentsPassStyle === 'remotable' ||
      paymentsPassStyle === 'promise',
    X`Payments ${payments} must be an array of payments, a payment, or a promise for a payment, not ${paymentsPassStyle}`,
  );
  /** @type {Array<ERef<Payment>>} */
  let paymentsArray;
  if (paymentsPassStyle === 'remotable' || paymentsPassStyle === 'promise') {
    paymentsArray = [/** @type {ERef<Payment>} */ (payments)];
  } else {
    paymentsArray = /** @type {Array<ERef<Payment>>} */ (payments);
  }
  return paymentsArray;
};
harden(assertPayments);

export { assertPayments };
