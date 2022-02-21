// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

const { details: X } = assert;

// TODO: Make the attestation contract more generic by allowing this
// to be parameterized

// If x is greater than or equal to y, subtract. If not, return empty.
const subtractOrMakeEmpty = (x, y) => {
  if (AmountMath.isGTE(x, y)) {
    return AmountMath.subtract(x, y);
  } else {
    return AmountMath.makeEmptyFromAmount(x);
  }
};
harden(subtractOrMakeEmpty);

/**
 * Assert the cosmos-specific prerequisites
 *
 * @@ Is this redundant w.r.t. golang checks???
 *
 * @param {ERef<StakingAuthority>} stakeReporter
 * @param {GetLiened} getLiened
 * @param {Brand} underlyingBrand
 * @param {Address} address
 * @param {Amount} amountToLien
 */
const assertPrerequisites = async (
  stakeReporter,
  getLiened,
  underlyingBrand,
  address,
  amountToLien,
) => {
  const accountState = await E(stakeReporter).getAccountState(
    address,
    underlyingBrand,
  );
  // AWAIT ///

  let { total, bonded, locked } = accountState;

  total = AmountMath.coerce(underlyingBrand, total);
  bonded = AmountMath.coerce(underlyingBrand, bonded);
  locked = AmountMath.coerce(underlyingBrand, locked);

  // The amount for the address that currently has attestations that
  // create a lien.

  // NOTE: the total (and other values in the accountState) may
  // be less than the amount liened, due to slashing affecting the
  // cosmos balances but not affecting the amount liened.
  const liened = getLiened(address, underlyingBrand);

  const unliened = subtractOrMakeEmpty(total, liened);
  const bondedAndUnliened = subtractOrMakeEmpty(bonded, liened);
  const unlocked = subtractOrMakeEmpty(total, locked);
  const unlockedAndUnliened = subtractOrMakeEmpty(unlocked, liened);

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
};
harden(assertPrerequisites);
export { assertPrerequisites };
