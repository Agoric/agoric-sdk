import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';

const setup = () => {
  const moolaIssuerResults = produceIssuer('moola');
  const simoleanIssuerResults = produceIssuer('simoleans');
  const bucksIssuerResults = produceIssuer('bucks');

  const all = [moolaIssuerResults, simoleanIssuerResults, bucksIssuerResults];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);
  const brands = all.map(objs => objs.brand);

  return harden({
    mints,
    issuers,
    amountMaths,
    brands,
    moolaIssuerResults,
    simoleanIssuerResults,
    bucksIssuerResults,
    moola: moolaIssuerResults.amountMath.make,
    simoleans: simoleanIssuerResults.amountMath.make,
    bucks: bucksIssuerResults.amountMath.make,
  });
};
harden(setup);
export { setup };
