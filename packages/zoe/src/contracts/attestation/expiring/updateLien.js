// @ts-check

// TODO: make more efficient. This will slow as the number of
// ExpiringAttElem per address increases.

const { details: X } = assert;

/**
 * A helper to actually update the lien record when a lien expiration
 * is extended.
 *
 * @param {LegacyMap<Address,Array<ExpiringAttElem>>} store
 * @param {ExpiringAttElem} newAttestationElem
 * @returns {void}
 */
const updateLien = (store, newAttestationElem) => {
  const { address, handle } = newAttestationElem;
  assert(
    store.has(address),
    X`No previous lien was found for address ${address}`,
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
    X`No previous lien was found for address ${address} and attestation ${newAttestationElem}`,
  );

  minusOldRecord.push(newAttestationElem);

  // Ensure that the handles for this address remain unique. Note that
  // handles are unique in the entire store due to their construction
  // using `makeHandle`. This assertion guarantees that the invariant
  // remains even after updating a lien.
  const handles = new Set();
  minusOldRecord.forEach(({ handle: attHandle }) => {
    assert(!handles.has(attHandle), X`Attestation handles must be unique`);
    handles.add(attHandle);
  });

  // commit point
  store.set(address, minusOldRecord);
};
harden(updateLien);
export { updateLien };
