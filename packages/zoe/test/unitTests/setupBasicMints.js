import harden from '@agoric/harden';

import produceIssuers from '@agoric/ertp';

const setup = () => {
  const moolaIssuerObjs = produceIssuers('moola');
  const simoleanIssuerObjs = produceIssuers('simoleans');
  const bucksIssuerObjs = produceIssuers('bucks');

  const all = [moolaIssuerObjs, simoleanIssuerObjs, bucksIssuerObjs];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);

  return harden({
    mints,
    issuers,
    amountMaths,
    moolaIssuerObjs,
    simoleanIssuerObjs,
    bucksIssuerObjs,
    moola: moolaIssuerObjs.amountMath.make,
    simoleans: simoleanIssuerObjs.amountMath.make,
    bucks: bucksIssuerObjs.amountMath.make,
  });
};
harden(setup);
export { setup };
