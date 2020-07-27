import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';

export const showPurseBalance = async (purseP, name, log) => {
  try {
    const amount = await E(purseP).getCurrentAmount();
    log(name, ': balance ', amount);
  } catch (err) {
    console.error(err);
  }
};

export const getLocalAmountMath = issuer =>
  Promise.all([
    E(issuer).getBrand(),
    E(issuer).getMathHelpersName(),
  ]).then(([brand, mathHelpersName]) => makeAmountMath(brand, mathHelpersName));

export const setupIssuers = async (zoe, issuers) => {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;

  const moolaAmountMath = await getLocalAmountMath(moolaIssuer);
  const simoleanAmountMath = await getLocalAmountMath(simoleanIssuer);
  const bucksAmountMath = await getLocalAmountMath(bucksIssuer);

  const moola = moolaAmountMath.make;
  const simoleans = simoleanAmountMath.make;
  const bucks = bucksAmountMath.make;

  return harden({
    issuers: harden([moolaIssuer, simoleanIssuer]),
    inviteIssuer,
    moolaIssuer,
    simoleanIssuer,
    bucksIssuer,
    moolaAmountMath,
    simoleanAmountMath,
    bucksAmountMath,
    moola,
    simoleans,
    bucks,
    purses,
  });
};
