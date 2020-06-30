/* global harden */

import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';

export async function showPurseBalance(purseP, name, log) {
  try {
    const amount = await E(purseP).getCurrentAmount();
    log(name, ': balance ', amount);
  } catch (err) {
    console.error(err);
  }
}

export function getLocalAmountMath(issuer) {
  return Promise.all([
    E(issuer).getBrand(),
    E(issuer).getMathHelpersName(),
  ]).then(([brand, mathHelpersName]) => makeAmountMath(brand, mathHelpersName));
}

export async function setupPurses(zoe, issuers, payments) {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const [moolaIssuer, simoleanIssuer] = issuers;

  const [moolaPayment, simoleanPayment] = payments;
  const [moolaPurseP, simoleanPurseP] = purses;
  await E(moolaPurseP).deposit(moolaPayment);
  await E(simoleanPurseP).deposit(simoleanPayment);

  const moolaAmountMath = await getLocalAmountMath(moolaIssuer);
  const simoleanAmountMath = await getLocalAmountMath(simoleanIssuer);

  const moola = moolaAmountMath.make;
  const simoleans = simoleanAmountMath.make;

  return harden({
    issuers: harden([moolaIssuer, simoleanIssuer]),
    inviteIssuer,
    moolaIssuer,
    simoleanIssuer,
    moolaAmountMath,
    simoleanAmountMath,
    moola,
    simoleans,
    purses,
  });
}
