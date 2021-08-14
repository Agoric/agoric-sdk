import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';

import '@agoric/zoe/exported.js';

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
  const moolaBrand = await E(moolaIssuer).getBrand();
  const simoleanBrand = await E(simoleanIssuer).getBrand();

  const [moolaPayment, simoleanPayment] = payments;
  const [moolaPurseP, simoleanPurseP] = purses;
  await E(moolaPurseP).deposit(moolaPayment);
  await E(simoleanPurseP).deposit(simoleanPayment);

  const moola = value => AmountMath.make(moolaBrand, value);
  const simoleans = value => AmountMath.make(simoleanBrand, value);

  return harden({
    issuers: harden([moolaIssuer, simoleanIssuer]),
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    purses,
  });
}
