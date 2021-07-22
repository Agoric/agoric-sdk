import { AmountMath } from '@agoric/ertp';
import { hasExpired } from './expiringHelpers';

/**
 * Look at the amounts liened and their expiration and unlien anything
 * that is expired.
 *
 * @param {Store<Address,Array<ExpiringAttElem>>} store
 * @param {Amount} empty - an empty amount of the externalBrand
 * @param {Address} address
 * @param {Timestamp} currentTime
 * @returns {Amount} amountLiened
 */
const unlienIfExpired = (store, empty, address, currentTime) => {
  let totalStillLiened = empty;

  // It is possible that the address does not currently have any
  // lienedAmounts
  if (!store.has(address)) {
    return empty;
  }

  const lienedAtStart = store.get(address);
  const notExpired = lienedAtStart.filter(({ amountLiened, expiration }) => {
    if (hasExpired(expiration, currentTime)) {
      return false;
    }
    totalStillLiened = AmountMath.add(totalStillLiened, amountLiened);
    return true;
  });
  // commit point

  store.set(address, notExpired);
  return totalStillLiened;
};
harden(unlienIfExpired);
export { unlienIfExpired };
