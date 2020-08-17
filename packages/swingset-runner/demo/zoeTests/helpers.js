import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';

export const showPurseBalance = async (purseP, name, log) => {
  try {
    const amount = await E(purseP).getCurrentAmount();
    log(name, ': balance ', amount);
  } catch (err) {
    console.error(err);
  }
};

export const setupIssuers = async (zoe, issuers) => {
  const purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
  const inviteIssuer = await E(zoe).getInvitationIssuer();
  const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;

  const moolaAmountMath = await makeLocalAmountMath(moolaIssuer);
  const simoleanAmountMath = await makeLocalAmountMath(simoleanIssuer);
  const bucksAmountMath = await makeLocalAmountMath(bucksIssuer);

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
