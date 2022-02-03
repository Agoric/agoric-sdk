// @ts-check

import { AmountMath } from '@agoric/ertp';
import { hasExpired } from './expiringHelpers.js';

/**
 * Look at the amounts liened and their expiration and unlien anything
 * that is expired.
 *
 * @param {LegacyMap<Address,Array<ExpiringAttElem>>} store
 * @param {Amount} empty - an empty amount of the externalBrand
 * @param {Address} address
 * @param {Timestamp} currentTime
 * @returns {Amount} amountLiened
 */
const unlienExpiredAmounts = (store, empty, address, currentTime) => {
  // It is possible that the address does not currently have any
  // lienedAmounts
  if (!store.has(address)) {
    return empty;
  }

  const lienedAtStart = store.get(address);
  const notExpired = lienedAtStart.filter(
    ({ expiration }) => !hasExpired(expiration, currentTime),
  );
  const totalStillLiened = notExpired.reduce(
    (soFar, { amountLiened }) => AmountMath.add(soFar, amountLiened),
    empty,
  );
  // commit point

  store.set(address, notExpired);
  return totalStillLiened;
};
harden(unlienExpiredAmounts);
export { unlienExpiredAmounts };
