// @ts-check

/**
 * Add a lien for a particular amount for an address, with an
 * expiration date after which it is unliened (whether the
 * expiration date has passed is only checked when `getLienAmount`
 * is called)
 *
 * @param {LegacyMap<Address,Array<ExpiringAttElem>>} store
 * @param {ExpiringAttElem} attestationElem
 */
const addToLiened = (store, attestationElem) => {
  const { address } = attestationElem;
  if (store.has(address)) {
    const lienedSoFar = store.get(address);
    lienedSoFar.push(attestationElem);
    store.set(address, lienedSoFar);
  } else {
    store.init(address, [attestationElem]);
  }
};

/**
 * We should be as reluctant as possible to lift a lien, therefore,
 * the expiration has only expired when the currentTime is past
 * (greater than and not equal to) the expiration.
 *
 * @param {Timestamp} expiration
 * @param {Timestamp} currentTime
 * @returns {boolean}
 */
const hasExpired = (expiration, currentTime) => expiration < currentTime;

/**
 * Create a single element that will be used in the SetValue of attestations
 *
 * @param {Address} address
 * @param {Amount} amountLiened - the amount of the underlying asset to put
 * a lien on
 * @param {Timestamp} expiration
 * @param {Handle<'Attestation'>} handle - the unique handle
 * @returns {ExpiringAttElem}
 */
const makeAttestationElem = (address, amountLiened, expiration, handle) => {
  return harden({
    address,
    amountLiened,
    expiration,
    handle,
  });
};

harden(addToLiened);
harden(hasExpired);
harden(makeAttestationElem);

export { addToLiened, hasExpired, makeAttestationElem };
