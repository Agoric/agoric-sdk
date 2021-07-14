import { AmountMath } from '@agoric/ertp';

/**
 * @param {Issuer} issuer
 * @returns {TryToBurn}
 */
const makeTryToBurn = issuer => {
  /** @type {TryToBurn} */
  const tryToBurn = payment => {
    return issuer.burn(payment).catch(_e => {
      // DO NOTHING
      // This is not an error in our logic. if the user has claimed the
      // payment, we expect the burn attempt to fail.
    });
  };
  return tryToBurn;
};

/**
 * Attempt to burn all of the payments produced for this address. If
 * any can be burned, this means it has not been claimed by the
 * user, and we can count the amount in the burned payment as unlocked.
 *
 * @param {Issuer} issuer
 * @param {Store<Address,Array<Payment>>} payments
 * @param {AddToFree} addToFree
 * @param {Amount} empty
 * @param {Address} address
 * @returns {Promise<void>}
 */
const freeIfUnclaimed = async (issuer, payments, addToFree, empty, address) => {
  // If the payments have been freed previously, an entry may not exist.
  if (!payments.has(address)) {
    return;
  }

  const storedPayments = payments.get(address);
  const isDefined = amount => amount !== undefined;
  const tryToBurn = makeTryToBurn(issuer);
  const amountsPBurned = /** @type {Array<Promise<Amount>>} */ (storedPayments
    .map(tryToBurn)
    .filter(isDefined));
  const amountsBurned = await Promise.all(amountsPBurned);

  const add = (left, right) => AmountMath.add(left, right);
  const amountBurned = amountsBurned.reduce(add, empty);

  // At this point, the payments have already been burned or
  // claimed, so we can delete the entry itself.

  // commit point
  payments.delete(address);
  addToFree(address, amountBurned);
};

harden(makeTryToBurn);
harden(freeIfUnclaimed);
export { makeTryToBurn, freeIfUnclaimed };
