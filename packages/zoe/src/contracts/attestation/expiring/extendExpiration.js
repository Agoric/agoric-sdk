// @ts-check

import { AmountMath } from '@agoric/ertp';
import { checkOfferShape } from '../helpers';

import { makeAttestationElem } from './expiringHelpers';

const { details: X, quote: q } = assert;

/**
 * A user makes a proposal with a `give` of { Attestation:
 * attestationPayment }, and receives a payout of { Attestation:
 * newAttestationPayment } where the new attestation has an expiration
 * of `newExpiration`.
 *
 * @param {ZCFSeat} seat
 * @param {ZCFMint} zcfMint
 * @param {(address: Address) => boolean} canExtend
 * @param {(newAttestationElem: ExpiringAttElem) => void} updateLienedAmounts
 * @param {Brand} attestationBrand
 * @param {Timestamp} newExpiration
 * @returns {void}
 */
const extendExpiration = (
  seat,
  zcfMint,
  canExtend,
  updateLienedAmounts,
  attestationBrand,
  newExpiration,
) => {
  const oldAttestationAmount = checkOfferShape(seat, attestationBrand);

  const attestationValue = /** @type {SetValue} */ (oldAttestationAmount.value);

  // TODO: allow for multiple elements in the amount value to each
  // be extended. Currently, we restrict the value to a single element.
  assert(
    attestationValue.length === 1,
    X`We can currently only extend a single attestation element at a time, not ${attestationValue}`,
  );
  const {
    expiration,
    handle,
    address,
    amountLiened,
  } = /** @type {ExpiringAttElem} */ (attestationValue[0]);

  assert(
    canExtend(address),
    `The address ${q(address)} cannot extend the expiration for attestations`,
  );

  assert(
    newExpiration > expiration,
    `The new expiration ${q(
      newExpiration,
    )} must be later than the old expiration ${q(expiration)}`,
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
  const amountToMint = AmountMath.make(attestationBrand, [newAttestationElem]);

  // commit point within updateLien
  updateLienedAmounts(newAttestationElem);
  zcfMint.burnLosses(seat.getCurrentAllocation(), seat);
  zcfMint.mintGains({ Attestation: amountToMint }, seat);
  seat.exit();
};
harden(extendExpiration);
export { extendExpiration };
