/* global replaceGlobalMeter */
import evaluate from '@agoric/evaluate';
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeMeter } from '@agoric/transform-metering/src/meter';

import { makeMint } from '@agoric/ertp/src/mint';
import { assert, details } from '@agoric/assert';
import makePromise from '@agoric/make-promise';
import { sameStructure } from '@agoric/same-structure';

const evaluateStringToFn = (functionSrcString, endowments) => {
  assert.typeof(functionSrcString, 'string');
  const fn = evaluate(functionSrcString, endowments);
  assert.typeof(
    fn,
    'function',
    details`"${functionSrcString}" must be a string for a function, but produced ${typeof fn}`,
  );
  return fn;
};

const evalContractCode = (code, additionalEndowments) => {
  const defaultEndowments = {
    harden,
    makePromise,
    assert,
    sameStructure,
    makeMint,
    Nat,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });

  // Refill a meter each time.
  // NOTE: We need 1e7 or the autoswap contract exhausts
  // the compute meter.
  const { meter, refillFacet } = makeMeter({ budgetCombined: 1e7 });
  const doRefill = () => {
    if (meter.isExhausted()) {
      // Don't refill.
      return;
    }
    // Refill the meter, since we're leaving a crank.
    Object.values(refillFacet, r => r());
  };

  // Make an endowment to get our meter.
  fullEndowments.getGlobalMeter = m => {
    if (m !== true && typeof replaceGlobalMeter !== 'undefined') {
      // Replace the global meter and register our refiller.
      replaceGlobalMeter(meter, doRefill);
    }
    return meter;
  };

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const getExport = evaluateStringToFn(code, fullEndowments);
  const installation = getExport();
  return installation;
};

export { evalContractCode };
