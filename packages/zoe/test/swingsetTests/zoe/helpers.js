import { E } from '@agoric/eventual-send';
import { makeUnitOps } from '@agoric/ertp/core/unitOps';
import harden from '@agoric/harden';

export const showPaymentBalance = async (paymentP, name, log) => {
  try {
    const units = await E(paymentP).getBalance();
    log(name, ': balance ', units);
  } catch (err) {
    console.error(err);
  }
};

export const getLocalUnitOps = assay =>
  Promise.all([
    E(assay).getLabel(),
    E(assay).getExtentOps(),
  ]).then(([label, { name, extentOpsArgs = [] }]) =>
    makeUnitOps(label, name, extentOpsArgs),
  );

export const setupAssays = async (zoe, purses) => {
  const [moolaPurseP, simoleanPurseP, bucksPurseP] = purses;
  const inviteAssay = await E(zoe).getInviteAssay();
  const moolaAssay = await E(moolaPurseP).getAssay();
  const simoleanAssay = await E(simoleanPurseP).getAssay();
  const bucksAssay = await E(bucksPurseP).getAssay();

  const moolaUnitOps = await getLocalUnitOps(moolaAssay);
  const simoleanUnitOps = await getLocalUnitOps(simoleanAssay);
  const bucksUnitOps = await getLocalUnitOps(bucksAssay);

  const moola = moolaUnitOps.make;
  const simoleans = simoleanUnitOps.make;
  const bucks = bucksUnitOps.make;

  return harden({
    assays: harden([moolaAssay, simoleanAssay]),
    inviteAssay,
    moolaAssay,
    simoleanAssay,
    bucksAssay,
    moolaUnitOps,
    simoleanUnitOps,
    bucksUnitOps,
    moola,
    simoleans,
    bucks,
  });
};
