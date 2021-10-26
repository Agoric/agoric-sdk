// @ts-check

import { AmountMath } from '@agoric/ertp';
import { checkOfferShape } from '../helpers.js';

import { makeAttestationElem } from './expiringHelpers.js';

const { details: X } = assert;

/**
 * A user makes a proposal with a `give` of { Attestation:
 * attestationPayment }, and receives a payout of { Attestation:
 * newAttestationPayment } where the new attestation has an expiration
 * of `newExpiration`.
 *
 * @param {ZCFSeat} seat
 * @param {ZCFMint} zcfMint
 * @param {(address: Address) => boolean} canExtend
 * @param {(newAttestationElem: ExpiringAttElem) => void} updateLienedAmount
 * @param {Brand} attestationBrand
 * @param {Timestamp} newExpiration
 * @returns {void}
 */
const extendExpiration = (
  seat,
  zcfMint,
  canExtend,
  updateLienedAmount,
  attestationBrand,
  newExpiration,
) => {
  const oldAttestationAmount = checkOfferShape(seat, attestationBrand);

  const attestationValue = /** @type {SetValue} */ (oldAttestationAmount.value);

  const makeNewAttestationElem = oldAttestationElem => {
    const {
      expiration,
      handle,
      address,
      amountLiened,
    } = /** @type {ExpiringAttElem} */ oldAttestationElem;

    assert(
      canExtend(address),
      X`The address ${address} cannot extend the expiration for attestations`,
    );

    assert(
      newExpiration > expiration,
      X`The new expiration ${newExpiration} must be later than the old expiration ${expiration}`,
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

    return newAttestationElem;
  };

  const valueToMint = attestationValue.map(makeNewAttestationElem);

  const amountToMint = AmountMath.make(attestationBrand, harden(valueToMint));

  // commit point within updateLienedAmount
  valueToMint.forEach(updateLienedAmount);
  zcfMint.burnLosses(seat.getCurrentAllocation(), seat);
  zcfMint.mintGains({ Attestation: amountToMint }, seat);
  seat.exit();
};
harden(extendExpiration);
export { extendExpiration };
