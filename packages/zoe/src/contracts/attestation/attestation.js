// @ts-check

import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';

import '../../../exported';
import { setupAttestation as setupExpiringAttestation } from './expiringNFT';
import { setupAttestation as setupReturnableAttestation } from './returnableNFT';

const { details: X } = assert;

/**
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const {
    brands: { BLD: bldBrand },
    cosmos, // an object representing the cosmos connection
  } = zcf.getTerms();

  let lastTime = 0n;

  /** @type {WeakStore<Address, AttMaker>} */
  const addressToAttMaker = makeStore('address');

  const empty = AmountMath.makeEmpty(bldBrand, AssetKind.NAT);

  const govAttManager = await setupExpiringAttestation(
    'BLD-ATT-GOV',
    empty,
    zcf,
  );
  const locAttManager = await setupReturnableAttestation(
    'BLD-ATT-LOC',
    empty,
    zcf,
  );

  /** @type {Max} */
  const max = (x, y) => {
    return AmountMath.isGTE(x, y) ? x : y;
  };

  /** @type {GetLienAmount} */
  const getLienAmount = (address, currentTime) => {
    const govLienAmount = govAttManager.getLienAmount(address, currentTime);
    const locLienAmount = locAttManager.getLienAmount(address);
    return max(govLienAmount, locLienAmount);
  };

  /**
   * Get the amount currently liened per address. Must pass the
   * current time.
   *
   * @param {Array<Address>} addresses
   * @param {Timestamp} currentTime
   * @returns {Array<Amount>}
   */
  const getLiened = (addresses, currentTime) => {
    lastTime = currentTime;
    return addresses.map(address => getLienAmount(address, currentTime));
  };

  const slash = (addresses, currentTime) => {
    lastTime = currentTime;
    return addresses.map(govAttManager.disallowExtensions);
  };

  const makeReturnAttInvitation = () =>
    zcf.makeInvitation(locAttManager.returnAttestation, 'ReturnAtt', {
      brand: locAttManager.brand,
    });

  const makeExtendAttInvitation = newExpiration => {
    // Fail-fast if the newExpiration is already out of date compared
    // to the last time we received from Cosmos
    assert(
      newExpiration > lastTime,
      `The attestation could not be extended, as the new expiration ${newExpiration} is in the past`,
    );
    const offerHandler = seat =>
      govAttManager.extendExpiration(seat, newExpiration);
    return zcf.makeInvitation(offerHandler, 'ExtendAtt', {
      brand: govAttManager.brand,
    });
  };

  /** @type {MakeAttestationsInternal} */
  const makeAttestationsInternal = async (
    address,
    amountToLien,
    expiration,
  ) => {
    amountToLien = AmountMath.coerce(bldBrand, amountToLien);
    assert.typeof(expiration, 'bigint');

    /** @type {{total: Amount, bonded: Amount, locked: Amount,
     * currentTime: Timestamp}} */
    const accountState = await E(cosmos).getAccountState(address);
    let { total, bonded, locked } = accountState;
    const { currentTime } = accountState;
    total = AmountMath.coerce(bldBrand, total);
    bonded = AmountMath.coerce(bldBrand, bonded);
    locked = AmountMath.coerce(bldBrand, locked);
    assert.typeof(currentTime, 'bigint');
    assert(
      expiration > currentTime,
      `Expiration ${expiration} must be after the current time ${currentTime}`,
    );

    const unlocked = AmountMath.subtract(total, locked);

    // The amount for the address that currently has attestations that
    // create a lien
    const liened = getLienAmount(address, currentTime);
    const unliened = AmountMath.subtract(total, liened);
    const bondedAndUnliened = AmountMath.subtract(bonded, liened);
    const unlockedAndUnliened = AmountMath.subtract(unlocked, liened);

    // Prerequisite: x <= Unliened
    assert(
      AmountMath.isGTE(unliened, amountToLien),
      X`Only ${unliened} was unliened, but an attestation was attempted for ${amountToLien}`,
    );

    // Prerequisite: x <= Bonded - Liened
    assert(
      AmountMath.isGTE(bondedAndUnliened, amountToLien),
      X`Only ${bondedAndUnliened} was bonded and unliened, but an attestation was attempted for ${amountToLien}`,
    );

    // Prerequisite: x <= Unlocked - Liened
    assert(
      AmountMath.isGTE(unlockedAndUnliened, amountToLien),
      X`Only ${unlockedAndUnliened} was unlocked and unliened, but an attestation was attempted for ${amountToLien}`,
    );

    const govAttPayment = govAttManager.addExpiringLien(
      address,
      amountToLien,
      expiration,
    );
    const locAttPayment = locAttManager.addReturnableLien(
      address,
      amountToLien,
    );

    return harden({
      GOV: govAttPayment,
      LOC: locAttPayment,
    });
  };

  /** @type {MakeAttMaker} */
  const makeAttMaker = address => {
    /** @type {AttMaker} */
    return harden({
      makeAttestations: (amountToLien, expiration) =>
        makeAttestationsInternal(address, amountToLien, expiration),
      makeReturnAttInvitation,
      makeExtendAttInvitation,
    });
  };

  /** @type {GetAttMaker} */
  const getAttMaker = address => {
    assert.typeof(address, 'string');
    if (addressToAttMaker.has(address)) {
      return addressToAttMaker.get(address);
    }
    const attMaker = makeAttMaker(address);
    addressToAttMaker.init(address, attMaker);
    return attMaker;
  };

  const publicFacet = {
    makeReturnAttInvitation, // called by user/dapp/wallet, can also be called from the AttMaker
    makeExtendAttInvitation, // called by user/dapp/wallet, can also be called from the AttMaker
  };

  const creatorFacet = {
    getLiened, // called by cosmos
    getAttMaker, // called by createUserBundle in bootstrap.js
    slashed, // called by cosmos
  };

  return harden({ creatorFacet, publicFacet });
};

export { start };
