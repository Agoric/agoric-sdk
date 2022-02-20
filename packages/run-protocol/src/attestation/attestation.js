// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

import { makeStore } from '@agoric/store';
import { setupAttestation as setupReturnableAttestation } from './returnable/returnableNFT.js';
import { makeStoredTime } from './storedTime.js';
import { assertPrerequisites } from './prerequisites.js';

const { details: X } = assert;

/**
 * @param {ContractFacet} zcf
 * @param {Brand} underlyingBrand
 * @param {string} returnableAttName
 */
export const makeAttestationFacets = async (
  zcf,
  underlyingBrand,
  returnableAttName,
) => {
  /** @type { PromiseRecord<StakingAuthority>} */
  const authorityPromiseKit = makePromiseKit();

  const { assetKind: underlyingAssetKind } = await E(
    underlyingBrand,
  ).getDisplayInfo();
  // AWAIT ///

  const storedTime = makeStoredTime();
  const empty = AmountMath.makeEmpty(underlyingBrand, underlyingAssetKind);

  const returnableAttManager = await setupReturnableAttestation(
    returnableAttName, // e.g. 'BldAttLoc'
    empty,
    zcf,
    authorityPromiseKit.promise,
  );
  // AWAIT ///

  /**
   * Get the amount currently liened for the address and brand.
   *
   * @param {Address} address
   * @param {Timestamp} currentTime
   * @param {Brand} brand
   */
  const getLiened = (address, currentTime, brand) => {
    assert(
      brand === underlyingBrand,
      X`This contract can only make attestations for ${brand}`,
    );
    storedTime.updateTime(currentTime);
    return returnableAttManager.getLienAmount(address);
  };

  // IMPORTANT: only expose this function to the owner of the address.
  // This request *must* come from the owner of the address. Merely
  // verifying that the address *could* add a lien is not sufficient.
  // The owner must consent to adding a lien, and non-owners must not
  // be able to initiate a lien for another account.

  /**
   * @param {string} address
   * @param {Amount} amountToLien
   */
  const makeAttestationsInternal = async (address, amountToLien) => {
    amountToLien = AmountMath.coerce(underlyingBrand, amountToLien);
    await assertPrerequisites(
      authorityPromiseKit.promise,
      storedTime,
      getLiened,
      underlyingBrand,
      address,
      amountToLien,
    );
    return returnableAttManager.addReturnableLien(address, amountToLien);
  };

  const publicFacet = Far('attestation publicFacet', {
    makeReturnAttInvitation: returnableAttManager.makeReturnAttInvitation,
    getIssuer: () => returnableAttManager.getIssuer(),
    getBrand: () => returnableAttManager.getBrand(),
  });

  // IMPORTANT: The AttMaker should only be given to the owner of the
  // address. Only the owner should be able to create attestations and
  // the resulting liens on their underlying tokens.

  /**
   * @param {Address} address
   * @returns {AttMaker}
   */
  const makeAttMaker = address =>
    Far('attMaker', {
      makeAttestation: amountToLien =>
        makeAttestationsInternal(address, amountToLien),
      // TODO: should this getLiened take currentTime as a parameter?
      // TODO: should we provide a notifier?
      getLiened: () =>
        getLiened(address, storedTime.getTime(), underlyingBrand),
      getAccountState: () =>
        E(authorityPromiseKit.promise).getAccountState(
          address,
          underlyingBrand,
        ),
      makeReturnAttInvitation: returnableAttManager.makeReturnAttInvitation,
    });

  /** @type {Store<Address, AttMaker>} */
  const addressToAttMaker = makeStore('address');
  /**
   * @param {Address} address
   * @returns {AttMaker}
   */
  const getAttMaker = address => {
    assert.typeof(address, 'string');
    if (addressToAttMaker.has(address)) {
      return addressToAttMaker.get(address);
    }
    const attMaker = makeAttMaker(address);
    addressToAttMaker.init(address, attMaker);
    return attMaker;
  };

  // The authority is used to confirm that the underlying assets are escrowed appropriately.
  const addAuthority = authority => authorityPromiseKit.resolve(authority);

  const creatorFacet = Far('attestation creatorFacet', {
    getLiened,
    getAttMaker, // @@provide...
    addAuthority,
  });

  return harden({ creatorFacet, publicFacet });
};

/**
 * @param {ContractFacet} zcf
 */
const start = async zcf => {
  const {
    brands: { Underlying: underlyingBrand },
    returnableAttName,
  } = zcf.getTerms();
  return makeAttestationFacets(zcf, underlyingBrand, returnableAttName);
};
harden(start);

export { start };
