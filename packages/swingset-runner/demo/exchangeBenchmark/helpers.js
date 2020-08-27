import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';

import '@agoric/zoe/exported';

export async function showPurseBalance(purseP, name, log) {
  try {
    const amount = await E(purseP).getCurrentAmount();
    log(name, ': balance ', amount);
  } catch (err) {
    console.error(err);
  }
}

/**
 * @param {ZoeService} zoe
 * @param {Issuer[]} issuers
 * @param {Payment[]} payments
 */
export async function setupPurses(zoe, issuers, payments) {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const [moolaIssuer, simoleanIssuer] = issuers;

  const [moolaPayment, simoleanPayment] = payments;
  const [moolaPurseP, simoleanPurseP] = purses;
  await E(moolaPurseP).deposit(moolaPayment);
  await E(simoleanPurseP).deposit(simoleanPayment);

  const moolaAmountMath = await makeLocalAmountMath(moolaIssuer);
  const simoleanAmountMath = await makeLocalAmountMath(simoleanIssuer);

  const moola = moolaAmountMath.make;
  const simoleans = simoleanAmountMath.make;

  return harden({
    moola,
    simoleans,
    purses,
  });
}
