// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import '../../../exported';
import { setupAttestation as setupExpiringAttestation } from './expiring/expiringNFT';
import { setupAttestation as setupReturnableAttestation } from './returnable/returnableNFT';
import { makeStoredTime } from './storedTime';
import { max } from './helpers';
import { assertPrerequisites } from './prerequisites';
import { makeGetAttMaker } from './attMaker';

/**
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const {
    brands: { Underlying: underlyingBrand },
    authority, // The authority used to confirm that the underlying assets are escrowed appropriately
    expiringAttName,
    returnableAttName,
  } = zcf.getTerms();

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

  /** @type {GetLienAmount} */
  const getLienAmount = (address, currentTime) => {
    const expiringLienAmount = expiringAttManager.getLienAmount(
      address,
      currentTime,
    );
    const returnableLienAmount = returnableAttManager.getLienAmount(address);
    return max(expiringLienAmount, returnableLienAmount);
  };

  /** @type {GetLiened} */
  const getLiened = (addresses, currentTime) => {
    storedTime.updateTime(currentTime);
    return addresses.map(address => getLienAmount(address, currentTime));
  };

  /** @type {Slashed} */
  const slashed = (address, currentTime) => {
    storedTime.updateTime(currentTime);
    const lienAmount = getLienAmount(address, currentTime);
    if (AmountMath.isEmpty(lienAmount)) {
      return; // If there is no lien, do nothing
    }
    expiringAttManager.disallowExtensions(address);
  };

  /** @type {MakeExtendAttInvitation} */
  const makeExtendAttInvitation = newExpiration =>
    expiringAttManager.makeExtendAttInvitation(
      newExpiration,
      storedTime.getTime(),
    );

  /** @type {MakeAttestationsInternal} */
  const makeAttestationsInternal = async (
    address,
    amountToLien,
    expiration,
  ) => {
    amountToLien = AmountMath.coerce(underlyingBrand, amountToLien);
    assert.typeof(expiration, 'bigint');

    const currentTime = await assertPrerequisites(
      authority,
      getLienAmount,
      underlyingBrand,
      address,
      amountToLien,
      expiration,
    );
    // AWAIT ///
    storedTime.updateTime(currentTime);

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

  const publicFacet = Far('publicFacet', {
    makeReturnAttInvitation: returnableAttManager.makeReturnAttInvitation,
    makeExtendAttInvitation,
    getIssuers: () => {
      return harden({
        returnable: returnableAttManager.issuer,
        expiring: expiringAttManager.issuer,
      });
    },
    getBrands: () => {
      return harden({
        returnable: returnableAttManager.brand,
        expiring: expiringAttManager.brand,
      });
    },
  });

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

  const creatorFacet = Far('creatorFacet', {
    getLiened,
    getAttMaker,
    slashed,
  });

  return harden({ creatorFacet, publicFacet });
};

export { start };
