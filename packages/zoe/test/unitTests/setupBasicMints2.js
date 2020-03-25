import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';

const setup = () => {
  const moolaR = produceIssuer('moola');
  const simoleanR = produceIssuer('simoleans');
  const bucksR = produceIssuer('bucks');

  return harden({
    moolaR,
    simoleanR,
    bucksR,
    moola: moolaR.amountMath.make,
    simoleans: simoleanR.amountMath.make,
    bucks: bucksR.amountMath.make,
  });
};
harden(setup);
export { setup };
