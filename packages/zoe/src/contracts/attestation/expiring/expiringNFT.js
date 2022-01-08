// @ts-check

import { makeLegacyMap } from '@agoric/store';
import { AmountMath, AssetKind } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { validateInputs, mintZCFMintPayment } from '../helpers.js';
import {
  makeAttestationElem,
  addToLiened,
  hasExpired,
} from './expiringHelpers.js';
import { updateLien } from './updateLien.js';
import { unlienExpiredAmounts } from './unlienExpiredAmounts.js';
import { extendExpiration as extendExpirationInternal } from './extendExpiration.js';

const { details: X } = assert;

// Adds an expiring lien to an amount in response to an incoming call.
// Can be queried for the current liened amount for an address.

/**
 * @param {string} attestationTokenName - the name for the attestation
 * token
 * @param {Amount} empty - an empty amount in the external brand (i.e.
 * BLD) that the attestation is about
 * @param {ContractFacet} zcf
 * @returns {Promise<{disallowExtensions: DisallowExtensions, addExpiringLien: AddExpiringLien, getLienAmount:
 * GetLienAmount, makeExtendAttInvitation:
 * MakeExtendAttInvitationInternal, getIssuer: () => Issuer, getBrand:
 * () => Brand}>}
 */
const setupAttestation = async (attestationTokenName, empty, zcf) => {
  assert(AmountMath.isEmpty(empty), X`empty ${empty} was not empty`);
  const zcfMint = await zcf.makeZCFMint(attestationTokenName, AssetKind.SET);
  const {
    brand: attestationBrand,
    issuer: attestationIssuer,
  } = zcfMint.getIssuerRecord();

  const externalBrand = empty.brand;

  // Note: `amountLiened` in ExpiringAttElem is of the brand `externalBrand`

  /** @type {LegacyMap<Address,Array<ExpiringAttElem>>} */
  // Legacy because stored array is pushed onto
  const lienedAmounts = makeLegacyMap('address');

  const cannotGetExtension = new Set();

  // IMPORTANT: only expose this function to the owner of the address.
  // This request *must* come from the owner of the address. Merely
  // verifying that the address *could* add a lien is not sufficient.
  // The owner must consent to adding a lien, and non-owners must not
  // be able to initiate a lien for another account.

  /** @type {AddExpiringLien} */
  const addExpiringLien = (address, amount, expiration) => {
    const amountToLien = validateInputs(externalBrand, address, amount);
    assert.typeof(expiration, 'bigint');

    const handle = makeHandle('Attestation');

    const attestationElem = makeAttestationElem(
      address,
      amountToLien,
      expiration,
      handle,
    );

    const amountToMint = AmountMath.make(
      attestationBrand,
      harden([attestationElem]),
    );
    addToLiened(lienedAmounts, attestationElem);

    return mintZCFMintPayment(zcf, zcfMint, amountToMint);
  };

  /** @type {GetLienAmount} */
  const getLienAmount = (address, currentTime) => {
    assert.typeof(address, 'string');
    assert.typeof(currentTime, 'bigint');

    // We first unlien any amounts for which the lien has
    // expired, then return the total lien still remaining for the address
    const totalStillLiened = unlienExpiredAmounts(
      lienedAmounts,
      empty,
      address,
      currentTime,
    );

    // Remove from cannotGetExtension since there is no lien left
    if (AmountMath.isEmpty(totalStillLiened)) {
      cannotGetExtension.delete(address);
    }
    return totalStillLiened;
  };

  const canExtend = address => !cannotGetExtension.has(address);
  const updateLienedAmount = newAttestationElem =>
    updateLien(lienedAmounts, newAttestationElem);

  /** @type {ExtendExpiration} */
  const extendExpiration = (seat, newExpiration) =>
    extendExpirationInternal(
      seat,
      zcfMint,
      canExtend,
      updateLienedAmount,
      attestationBrand,
      newExpiration,
    );

  // This is only released when the lien is empty
  /** @type {DisallowExtensions} */
  const disallowExtensions = address => {
    assert.typeof(address, 'string');
    cannotGetExtension.add(address);
  };

  /** @type {MakeExtendAttInvitationInternal} */
  const makeExtendAttInvitation = (newExpiration, currentTime) => {
    // Fail-fast if the newExpiration is already out of date
    assert(
      !hasExpired(newExpiration, currentTime),
      X`The attestation could not be extended, as the new expiration ${newExpiration} is in the past`,
    );
    const offerHandler = seat => extendExpiration(seat, newExpiration);
    return zcf.makeInvitation(offerHandler, 'ExtendAtt', {
      brand: attestationBrand,
    });
  };

  return harden({
    disallowExtensions,
    addExpiringLien,
    getLienAmount,
    makeExtendAttInvitation, // choice by user to extend expiration
    getIssuer: () => attestationIssuer,
    getBrand: () => attestationBrand,
  });
};

harden(setupAttestation);
export { setupAttestation };
