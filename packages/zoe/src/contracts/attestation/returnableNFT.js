// @ts-check

import { makeStore } from '@agoric/store';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { validateInputs } from './helpers';

/**
 * @param {string} attestationTokenName - the name for the attestation
 * token
 * @param {Amount} empty
 * @param {ContractFacet} zcf
 * @returns {Promise<{returnAttestation: ReturnAttestation, addReturnableLien: AddReturnableLien,
 * getLienAmount: GetReturnableLienAmount, issuer: Issuer, brand: Brand}>}
 */
const setupAttestation = async (attestationTokenName, empty, zcf) => {
  const zcfMint = await zcf.makeZCFMint(attestationTokenName, AssetKind.SET);
  const {
    brand: attestationBrand,
    issuer: attestationIssuer,
  } = zcfMint.getIssuerRecord();

  const { brand: externalBrand } = empty;

  // Amount in `lienedAmounts` is of the brand `externalBrand` and has
  // AssetKind `externalAssetKind`

  /** @type {Store<Address,Amount>} */
  const lienedAmounts = makeStore('address');

  /**
   * Add a lien to an amount for an address.
   *
   * @param {Address} address
   * @param {Amount} amountToLien
   */
  const addToLiened = (address, amountToLien) => {
    if (lienedAmounts.has(address)) {
      const updated = AmountMath.add(lienedAmounts.get(address), amountToLien);
      lienedAmounts.set(address, updated);
    } else {
      lienedAmounts.set(address, amountToLien);
    }
  };

  /** @type {AddReturnableLien} */
  const addReturnableLien = (address, amount) => {
    const amountToLien = validateInputs(externalBrand, address, amount);

    addToLiened(address, amountToLien);
    const amountToMint = AmountMath.make(attestationBrand, [
      /** @type {ReturnableAttElem} */ ({
        address,
        amountLiened: amountToLien,
      }),
    ]);
    const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
    zcfMint.mintGains({ Attestation: amountToMint }, zcfSeat);
    zcfSeat.exit();
    return E(userSeat).getPayout('Attestation');
  };

  const burnOld = seat => {
    zcfMint.burnLosses(seat.getCurrentAllocation(), seat);
  };

  /** @type {ReturnAttestation} */
  const returnAttestation = seat => {
    const attestationAmount = seat.getAmountAllocated('Attestation');

    burnOld(seat);
    seat.exit();

    const attestationValue =
      /** @type {Array<ReturnableAttElem>} */ (attestationAmount.value);

    attestationValue.forEach(({ address, amountLiened }) => {
      assert(
        lienedAmounts.has(address),
        X`We have no record of anything liened for address ${address}`,
      );
      // No need to validate the address and amountLiened because Zoe does so
      // for us.
      const liened = lienedAmounts.get(address);
      // TODO: this should never handle. Escalate appropriately.
      assert(
        AmountMath.isGTE(liened, amountLiened),
        X`The returned amount ${amountLiened} was not liened ${liened}. Something very wrong occurred.`,
      );
      const updated = AmountMath.subtract(
        lienedAmounts.get(address),
        amountLiened,
      );
      lienedAmounts.set(address, updated);
    });
  };

  /** @type {GetReturnableLienAmount} */
  const getLienAmount = async address => {
    assert.typeof(address, 'string');
    if (lienedAmounts.has(address)) {
      return lienedAmounts.get(address);
    } else {
      return empty;
    }
  };

  return harden({
    returnAttestation,
    addReturnableLien,
    getLienAmount,
    issuer: attestationIssuer,
    brand: attestationBrand,
  });
};

harden(setupAttestation);
export { setupAttestation };
