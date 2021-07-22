// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { subtractOrMakeEmpty } from './helpers';

const { details: X, quote: q } = assert;

// TODO: Make the attestation contract more generic by allowing this
// to be parameterized

/**
 * Assert the cosmos-specific prerequisites
 *
 * @param {{getAccountState: (address: Address) => {total: Amount, bonded: Amount, locked: Amount,
 * currentTime: Timestamp}}} cosmos
 * @param {GetLienAmount} getLienAmount
 * @param {Brand} underlyingBrand
 * @param {Address} address
 * @param {Amount} amountToLien
 * @param {Timestamp} expiration
 */
const assertPrerequisites = async (
  cosmos,
  getLienAmount,
  underlyingBrand,
  address,
  amountToLien,
  expiration,
) => {
  const accountState = await E(cosmos).getAccountState(address);
  // AWAIT ///

  let { total, bonded, locked } = accountState;
  const { currentTime } = accountState;
  assert.typeof(currentTime, 'bigint');
  assert(
    expiration > currentTime,
    `Expiration ${q(expiration)} must be after the current time ${q(
      currentTime,
    )}`,
  );

  total = AmountMath.coerce(underlyingBrand, total);
  bonded = AmountMath.coerce(underlyingBrand, bonded);
  locked = AmountMath.coerce(underlyingBrand, locked);

  // The amount for the address that currently has attestations that
  // create a lien.

  // NOTE: the total (and other values in the accountState) may
  // be less than the amount liened, due to slashing affecting the
  // cosmos balances but not affecting the amount liened.
  const liened = getLienAmount(address, currentTime);

  const unliened = subtractOrMakeEmpty(total, liened);
  const bondedAndUnliened = subtractOrMakeEmpty(bonded, liened);
  const unlocked = subtractOrMakeEmpty(total, locked);
  const unlockedAndUnliened = subtractOrMakeEmpty(unlocked, liened);

  // Prerequisite: x <= Unliened
  assert(
    AmountMath.isGTE(unliened, amountToLien),
    X`Only ${q(
      unliened,
    )} was unliened, but an attestation was attempted for ${q(amountToLien)}`,
  );

  // Prerequisite: x <= Bonded - Liened
  assert(
    AmountMath.isGTE(bondedAndUnliened, amountToLien),
    X`Only ${q(
      bondedAndUnliened,
    )} was bonded and unliened, but an attestation was attempted for ${q(
      amountToLien,
    )}`,
  );

  // Prerequisite: x <= Unlocked - Liened
  assert(
    AmountMath.isGTE(unlockedAndUnliened, amountToLien),
    X`Only ${q(
      unlockedAndUnliened,
    )} was unlocked and unliened, but an attestation was attempted for ${q(
      amountToLien,
    )}`,
  );

  return currentTime;
};
harden(assertPrerequisites);
export { assertPrerequisites };
