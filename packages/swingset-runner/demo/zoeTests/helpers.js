import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

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
  const moolaBrand = await E(moolaIssuer).getBrand();
  const simoleanBrand = await E(simoleanIssuer).getBrand();
  const bucksBrand = await E(bucksIssuer).getBrand();

  const moola = value => AmountMath.make(moolaBrand, value);
  const simoleans = value => AmountMath.make(simoleanBrand, value);
  const bucks = value => AmountMath.make(bucksBrand, value);

  return harden({
    issuers: harden([moolaIssuer, simoleanIssuer]),
    inviteIssuer,
    moolaIssuer,
    simoleanIssuer,
    bucksIssuer,
    moola,
    simoleans,
    bucks,
    purses,
  });
};
