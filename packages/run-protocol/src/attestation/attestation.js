// @ts-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

import { getCopyBagEntries, makeCopyBag, makeStore } from '@agoric/store';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { assertPrerequisites } from './prerequisites.js';

const { details: X } = assert;

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

/**
 * Validate that the address is a string and that the amount is a
 * valid Amount of the right brand. Coerce the amount and return it.
 *
 * @param {Brand} externalBrand
 * @param {Address} address
 * @param {Amount} amount
 * @returns {Amount}
 */
const validateInputs = (externalBrand, address, amount) => {
  assert.typeof(address, 'string');
  // Will throw if amount is invalid
  return AmountMath.coerce(externalBrand, amount);
};
harden(validateInputs);

/**
 * @param {ContractFacet} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amountToMint
 * @returns {Promise<Payment>}
 */
const mintZCFMintPayment = (zcf, zcfMint, amountToMint) => {
  const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains(harden({ Attestation: amountToMint }), zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout('Attestation');
};
harden(mintZCFMintPayment);

/**
 * @param {ZCFSeat} seat
 * @param {Brand} attestationBrand
 * @returns {Amount}
 */
const checkOfferShape = (seat, attestationBrand) => {
  assertProposalShape(seat, { give: { Attestation: null }, want: {} });
  const attestationAmount = seat.getAmountAllocated('Attestation');
  assert(
    attestationAmount.brand === attestationBrand,
    X`The escrowed attestation ${attestationAmount} was not of the attestation brand${attestationBrand}`,
  );
  return attestationAmount;
};
harden(checkOfferShape);

/**
 * @param {string} attestationTokenName - the name for the attestation
 * token
 * @param {Amount} empty
 * @param {ContractFacet} zcf
 * @param {ERef<StakingAuthority>} lienBridge
 */
const setupAttestation = async (
  attestationTokenName,
  empty,
  zcf,
  lienBridge,
) => {
  assert(AmountMath.isEmpty(empty), X`empty ${empty} was not empty`);
  const zcfMint = await zcf.makeZCFMint(
    attestationTokenName,
    AssetKind.COPY_BAG,
  );
  const { brand: attestationBrand, issuer: attestationIssuer } =
    zcfMint.getIssuerRecord();

  const { brand: externalBrand } = empty;

  // Amount in `lienedAmounts` is of the brand `externalBrand`

  /** @type {Store<Address,Amount>} */
  const lienedAmounts = makeStore('address');

  // IMPORTANT: only expose this function to the owner of the address.
  // This request *must* come from the owner of the address. Merely
  // verifying that the address *could* add a lien is not sufficient.
  // The owner must consent to adding a lien, and non-owners must not
  // be able to initiate a lien for another account.

  /**
   * Given an address string and an Amount to put a lien on, record that
   * the Amount is "liened", and mint an attestation payment for the
   * amount liened. Return the payment.
   *
   * @param {Address} address
   * @param {Amount} amount
   * @returns {Promise<Payment>}
   */
  const addReturnableLien = async (address, amount) => {
    const amountToLien = validateInputs(externalBrand, address, amount);

    const newAmount = addToLiened(lienedAmounts, address, amountToLien);
    await E(lienBridge).setLiened(address, newAmount);
    // TODO: tell the golang side: LIEN_SET_LIENED
    const amountToMint = AmountMath.make(
      attestationBrand,
      makeCopyBag([[address, amountToLien.value]]),
    );

    return mintZCFMintPayment(zcf, zcfMint, amountToMint);
  };

  /** @param {ZCFSeat} seat */
  const returnAttestation = async seat => {
    const attestationAmount = checkOfferShape(seat, attestationBrand);

    // Burn the escrowed attestation payment and exit the seat
    zcfMint.burnLosses(harden({ Attestation: attestationAmount }), seat);
    seat.exit();

    const attestationValue = /** @type {ReturnableAttValue} */ (
      attestationAmount.value
    );

    // TODO: review error cases / commit point.

    await Promise.all(
      getCopyBagEntries(attestationValue).map(
        async ([address, valueReturned], _ix) => {
          const amountReturned = AmountMath.make(externalBrand, valueReturned);
          assert(
            lienedAmounts.has(address),
            X`We have no record of anything liened for address ${address}`,
          );
          // No need to validate the address and amountLiened because we
          // get the address and the amountLiened from the escrowed
          // amount, which Zoe verifies is from a real attestation payment
          const liened = lienedAmounts.get(address);
          // This assertion should always be true.
          // TODO: Escalate appropriately, such as shutting down the vat
          // if false.
          assert(
            AmountMath.isGTE(liened, amountReturned),
            X`The returned amount ${amountReturned} was greater than the amount liened ${liened}. Something very wrong occurred.`,
          );
          const updated = AmountMath.subtract(liened, amountReturned);
          lienedAmounts.set(address, updated);
          return E(lienBridge).setLiened(address, updated);
        },
      ),
    );
  };

  /**
   * @param {Address} address
   */
  const getLienAmount = address => {
    assert.typeof(address, 'string');
    if (lienedAmounts.has(address)) {
      return lienedAmounts.get(address);
    } else {
      return empty;
    }
  };

  const makeReturnAttInvitation = () =>
    zcf.makeInvitation(returnAttestation, 'ReturnAtt', {
      brand: attestationBrand,
    });

  return harden({
    makeReturnAttInvitation,
    addReturnableLien,
    getLienAmount,
    getIssuer: () => attestationIssuer,
    getBrand: () => attestationBrand,
  });
};
harden(setupAttestation);
export { setupAttestation };

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

  const empty = AmountMath.makeEmpty(underlyingBrand, underlyingAssetKind);

  const returnableAttManager = await setupAttestation(
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
   * @param {Brand} brand
   */
  const getLiened = (address, brand) => {
    assert(
      brand === underlyingBrand,
      X`This contract can only make attestations for ${brand}`,
    );
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
      // TODO: should we provide a notifier?
      getLiened: () => getLiened(address, underlyingBrand),
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
