// @ts-check

// TODO: make more efficient. This will slow as the number of
// ExpiringAttElem per address increases.

/**
 * A helper to actually update the lien record when a lien expiration
 * is extended.
 *
 * @param {Store<Address,Array<ExpiringAttElem>>} store
 * @param {ExpiringAttElem} newAttestationElem
 * @returns {void}
 */
const updateLien = (store, newAttestationElem) => {
  const { address, handle } = newAttestationElem;
  assert(
    store.has(address),
    `No previous lien was found for address '${address}'`,
  );
  const lienedSoFar = store.get(address);
  let foundOldRecord;
  // find and remove the old record
  const minusOldRecord = lienedSoFar.filter(({ handle: oldRecordHandle }) => {
    if (oldRecordHandle === handle) {
      foundOldRecord = true;
      return false;
    } else {
      return true;
    }
  });

  assert(
    foundOldRecord,
    `No previous lien was found for address '${address}' and attestation '${newAttestationElem}'`,
  );

  minusOldRecord.push(newAttestationElem);

  // commit point
  store.set(address, minusOldRecord);
};
harden(updateLien);
export { updateLien };
