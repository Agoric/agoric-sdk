// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import '../../../exported.js';
import { setupAttestation as setupExpiringAttestation } from './expiring/expiringNFT.js';
import { setupAttestation as setupReturnableAttestation } from './returnable/returnableNFT.js';
import { makeStoredTime } from './storedTime.js';
import { max } from './helpers.js';
import { assertPrerequisites } from './prerequisites.js';
import { makeGetAttMaker } from './attMaker.js';

const { details: X } = assert;

/**
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const {
    brands: { Underlying: underlyingBrand },
    expiringAttName,
    returnableAttName,
  } = zcf.getTerms();

  const authorityPromiseKit = makePromiseKit();

  const { assetKind: underlyingAssetKind } = await E(
    underlyingBrand,
  ).getDisplayInfo();
  // AWAIT ///

  const storedTime = makeStoredTime();
  const empty = AmountMath.makeEmpty(underlyingBrand, underlyingAssetKind);

  const expiringAttManagerP = setupExpiringAttestation(
    expiringAttName, // e.g. 'BldAttGov'
    empty,
    zcf,
  );
  const returnableAttManagerP = setupReturnableAttestation(
    returnableAttName, // e.g. 'BldAttLoc'
    empty,
    zcf,
  );
  const [expiringAttManager, returnableAttManager] = await Promise.all([
    expiringAttManagerP,
    returnableAttManagerP,
  ]);
  // AWAIT ///

  /** @type {GetLiened} */
  const getLiened = (address, currentTime, brand) => {
    assert(
      brand === underlyingBrand,
      X`This contract can only make attestations for ${brand}`,
    );
    storedTime.updateTime(currentTime);
    const expiringLienAmount = expiringAttManager.getLienAmount(
      address,
      currentTime,
    );
    const returnableLienAmount = returnableAttManager.getLienAmount(address);
    return max(expiringLienAmount, returnableLienAmount);
  };

  /** @type {Slashed} */
  const slashed = (addresses, currentTime) => {
    storedTime.updateTime(currentTime);
    addresses.forEach(address => {
      const lienAmount = getLiened(address, currentTime, underlyingBrand);
      if (AmountMath.isEmpty(lienAmount)) {
        return; // If there is no lien, do nothing
      }
      expiringAttManager.disallowExtensions(address);
    });
  };

  /** @type {MakeExtendAttInvitation} */
  const makeExtendAttInvitation = newExpiration =>
    expiringAttManager.makeExtendAttInvitation(
      newExpiration,
      storedTime.getTime(),
    );

  // IMPORTANT: only expose this function to the owner of the address.
  // This request *must* come from the owner of the address. Merely
  // verifying that the address *could* add a lien is not sufficient.
  // The owner must consent to adding a lien, and non-owners must not
  // be able to initiate a lien for another account.

  /** @type {MakeAttestationsInternal} */
  const makeAttestationsInternal = async (
    address,
    amountToLien,
    expiration,
  ) => {
    amountToLien = AmountMath.coerce(underlyingBrand, amountToLien);
    assert.typeof(expiration, 'bigint');

    await assertPrerequisites(
      authorityPromiseKit.promise,
      storedTime,
      getLiened,
      underlyingBrand,
      address,
      amountToLien,
      expiration,
    );
    // AWAIT ///

    const expiringAttPayment = expiringAttManager.addExpiringLien(
      address,
      amountToLien,
      expiration,
    );
    const returnableAttPayment = returnableAttManager.addReturnableLien(
      address,
      amountToLien,
    );

    return harden({
      expiring: expiringAttPayment,
      returnable: returnableAttPayment,
    });
  };

  const publicFacet = Far('attestation publicFacet', {
    makeReturnAttInvitation: returnableAttManager.makeReturnAttInvitation,
    makeExtendAttInvitation,
    getIssuers: () => {
      return harden({
        returnable: returnableAttManager.getIssuer(),
        expiring: expiringAttManager.getIssuer(),
      });
    },
    getBrands: () => {
      return harden({
        returnable: returnableAttManager.getBrand(),
        expiring: expiringAttManager.getBrand(),
      });
    },
  });

  // IMPORTANT: The AttMaker should only be given to the owner of the
  // address. Only the owner should be able to create attestations and
  // the resulting liens on their underlying tokens.

  /** @type {MakeAttMaker} */
  const makeAttMaker = address => {
    /** @type {AttMaker} */
    return Far('attMaker', {
      makeAttestations: (amountToLien, expiration) =>
        makeAttestationsInternal(address, amountToLien, expiration),
      makeReturnAttInvitation: returnableAttManager.makeReturnAttInvitation,
      makeExtendAttInvitation,
    });
  };

  const getAttMaker = makeGetAttMaker(makeAttMaker);

  // The authority is used to confirm that the underlying assets are escrowed appropriately.
  const addAuthority = authority => authorityPromiseKit.resolve(authority);

  const creatorFacet = Far('attestation creatorFacet', {
    getLiened,
    getAttMaker,
    slashed,
    addAuthority,
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
