// @ts-check

import { makeStore } from '@agoric/store';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { validateInputs } from './helpers';

// Adds an expiring lien to an amount in response to an incoming call.
// Can be queried for the current liened amount for an address.

/**
 * Create a single element that will be used in the SetValue of attestations
 *
 * @param {Address} address
 * @param {Amount} amountLiened - the amount of the underlying asset to put
 * a lien on
 * @param {Timestamp} expiration
 * @param {Handle<'attestation'>} handle - the unique handle
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
 * @param {string} attestationTokenName - the name for the attestation
 * token
 * @param {Amount} empty - an empty amount in the external brand (i.e.
 * BLD) that the attestation is about
 * @param {ContractFacet} zcf
 * @returns {Promise<{disallowExtensions: DisallowExtensions, addExpiringLien: AddExpiringLien, getLienAmount:
 * getLienAmount, extendExpiration: ExtendExpiration, issuer: Issuer, brand: Brand}>}
 */
const setupAttestation = async (attestationTokenName, empty, zcf) => {
  const zcfMint = await zcf.makeZCFMint(attestationTokenName, AssetKind.SET);
  const {
    brand: attestationBrand,
    issuer: attestationIssuer,
  } = zcfMint.getIssuerRecord();

  const externalBrand = empty.brand;

  // Note: `amountLiened` is of the brand `externalBrand`

  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const lienedAmounts = makeStore('address');

  const cannotGetExtension = new Set();

  /**
   * Add a lien for a particular amount for an address, with an
   * expiration date after which it is unliened (whether the
   * expiration date has passed is only checked when `getLienAmount`
   * is called)
   *
   * @param {ExpiringAttElem} attestationElem
   */
  const addToLiened = attestationElem => {
    const { address } = attestationElem;
    if (lienedAmounts.has(address)) {
      const lienedSoFar = lienedAmounts.get(address);
      lienedSoFar.push(attestationElem);
      lienedAmounts.set(address, lienedSoFar);
    } else {
      lienedAmounts.init(address, [attestationElem]);
    }
  };

  // This request *must* come from the owner of the address. Merely
  // verifying that the address *could* add a lien is not sufficient.
  // The owner must consent to adding a lien, and non-owners must not
  // be able to initiate a lien for another account.

  /** @type {AddExpiringLien} */
  const addExpiringLien = (address, amount, expiration) => {
    const amountToLien = validateInputs(externalBrand, address, amount);
    assert.typeof(expiration, 'bigint');

    const handle = makeHandle('attestation');

    const attestationElem = makeAttestationElem(
      address,
      amountToLien,
      expiration,
      handle,
    );

    const amountToMint = AmountMath.make(attestationBrand, [attestationElem]);
    addToLiened(attestationElem);

    const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
    zcfMint.mintGains({ Attestation: amountToMint }, zcfSeat);
    zcfSeat.exit();
    return E(userSeat).getPayout('Attestation');
  };

  // TODO: make more efficient. This will slow as the number of
  // lienRecords per address increases.
  /**
   * @param {ExpiringAttElem} newAttestationElem
   */

  const updateLien = newAttestationElem => {
    const { address, amountLiened, handle } = newAttestationElem;
    assert(
      lienedAmounts.has(address),
      `No previous lien was found for address ${address}`,
    );
    const lienedSoFar = lienedAmounts.get(address);
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
      `No previous lien was found for address ${address} and amount ${amountLiened}`,
    );

    // commit point
    lienedAmounts.set(address, minusOldRecord);
  };

  /**
   * Look at the amounts liened and their expiration and unlien anything
   * that is expired.
   *
   * @param {Address} address
   * @param {Timestamp} currentTime
   * @returns {Amount} amountLiened
   */
  const unlienIfExpired = (address, currentTime) => {
    let totalStillLiened = empty;

    // It is possible that the address does not currently have any
    // lienedAmounts.
    if (!lienedAmounts.has(address)) {
      return empty;
    }

    const lienedAtStart = lienedAmounts.get(address);
    const notExpired = lienedAtStart.filter(({ amountLiened, expiration }) => {
      if (hasExpired(expiration, currentTime)) {
        return false;
      }
      totalStillLiened = AmountMath.add(totalStillLiened, amountLiened);
      return true;
    });
    // commit point

    // Remove from cannotGetExtension since there is no lien left
    if (AmountMath.isEmpty(totalStillLiened)) {
      cannotGetExtension.delete(address);
    }

    lienedAmounts.set(address, notExpired);
    return totalStillLiened;
  };

  /** @type {getLienAmount} */
  const getLienAmount = async (address, currentTime) => {
    assert.typeof(address, 'string');

    // We should first unlien any amounts for which the lien has
    // expired, then return the total lien still remaining for the address
    return unlienIfExpired(address, currentTime);
  };

  /** @type {ExtendExpiration} */
  const extendExpiration = (seat, newExpiration) => {
    const oldAttestationAmount = seat.getAmountAllocated('Attestation');

    const attestationValue =
      /** @type {SetValue} */ (oldAttestationAmount.value);

    // TODO: allow for multiple elements in the amount value to each
    // be extended. Currently, we restrict the value to a single element.
    assert(
      attestationValue.length === 1,
      X`We can currently only extend a single attestation element at a time`,
    );
    const {
      expiration,
      handle,
      address,
      amountLiened,
    } = /** @type {ExpiringAttElem} */ (attestationValue[0]);

    assert(
      !cannotGetExtension.has(address),
      `The address ${address} cannot extend the expiration for attestations`,
    );

    assert(
      newExpiration > expiration,
      `The newExpiration ${newExpiration} must be later than the old expiration ${expiration}`,
    );
    // Importantly, we cannot drop the uniqueHandle and make a new
    // one, because that would allow someone to escrow the newly
    // minted attestation in a contract and the contract would have no
    // way of knowing it was representing the same value as before,
    // allowing the user to misrepresent the liened amount as larger
    // then it actually is.
    const newAttestationElem = makeAttestationElem(
      address,
      amountLiened,
      newExpiration,
      handle,
    );
    const amountToMint = AmountMath.make(attestationBrand, [
      newAttestationElem,
    ]);

    // commit point within updateLien
    updateLien(newAttestationElem);
    zcfMint.burnLosses(seat.getCurrentAllocation(), seat);
    zcfMint.mintGains({ Attestation: amountToMint }, seat);
    seat.exit();
  };

  // This is only released when the lien is empty
  /** @type {DisallowExtensions} */
  const disallowExtensions = address => {
    assert.typeof(address, 'string');
    cannotGetExtension.add(address);
  };

  return harden({
    disallowExtensions,
    addExpiringLien,
    getLienAmount,
    extendExpiration, // choice by user to extend expiration
    issuer: attestationIssuer,
    brand: attestationBrand,
  });
};

export { setupAttestation };
