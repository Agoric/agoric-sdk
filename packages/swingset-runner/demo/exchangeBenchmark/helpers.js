/* global harden */

import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';

export async function showPurseBalance(purseE, name, log) {
  try {
    const amount = await E(purseE).getCurrentAmount();
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
  const [moolaIssuer, simoleanIssuer] = issuers;

  const [moolaPayment, simoleanPayment] = payments;
  const [moolaPurseE, simoleanPurseE] = purses;
  await E(moolaPurseE).deposit(moolaPayment);
  await E(simoleanPurseE).deposit(simoleanPayment);

  const moolaAmountMath = await getLocalAmountMath(moolaIssuer);
  const simoleanAmountMath = await getLocalAmountMath(simoleanIssuer);

  const moola = moolaAmountMath.make;
  const simoleans = simoleanAmountMath.make;

  return harden({
    issuers: harden([moolaIssuer, simoleanIssuer]),
    moolaIssuer,
    simoleanIssuer,
    moolaAmountMath,
    simoleanAmountMath,
    moola,
    simoleans,
    purses,
  });
}
