import { E } from '@agoric/eventual-send';
import { makeAmountMath } from '@agoric/ertp/src/amountMath';
import harden from '@agoric/harden';

export const showPaymentBalance = async (paymentP, name, log) => {
  try {
    const amount = await E(paymentP).getBalance();
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

export const setupIssuers = async (zoe, purses) => {
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const moolaIssuer = await E(moolaPurseP).getIssuer();
  const simoleanIssuer = await E(simoleanPurseP).getIssuer();
  const bucksIssuer = await E(bucksPurseP).getIssuer();

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
  });
};
