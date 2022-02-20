// @ts-check

import { AmountMath } from '@agoric/ertp';

/**
 * Add a lien to an amount for an address.
 *
 * @param {Store<Address,Amount>} store
 * @param {Address} address
 * @param {Amount} amountToLien
 */
const addToLiened = (store, address, amountToLien) => {
  let updated;
  if (store.has(address)) {
    updated = AmountMath.add(store.get(address), amountToLien);
    store.set(address, updated);
  } else {
    updated = amountToLien;
    store.init(address, amountToLien);
  }
  return updated;
};
harden(addToLiened);
export { addToLiened };
