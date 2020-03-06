/* global replaceGlobalMeter, registerEndOfCrank */
import { evaluateProgram } from '@agoric/evaluate';
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeMeter } from '@agoric/transform-metering/src/meter';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import makePromise from '@agoric/make-promise';
import { sameStructure } from '@agoric/same-structure';

const evaluateStringToFn = (functionSrcString, endowments) => {
  assert.typeof(functionSrcString, 'string');
  const nestedEvaluate = src =>
    evaluateProgram(src, { ...endowments, nestedEvaluate });
  const fn = nestedEvaluate(`(${functionSrcString})`);
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
    produceIssuer,
    Nat,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });

  // Refill our meter each crank.
  const { meter, refillFacet } = makeMeter();
  const doRefill = () => {
    // Refill the meter if it wasn't exhausted.
    // This implements fail-stop, since a contract that exhausts the meter
    // will not run again.
    if (!meter.isExhausted()) {
      refillFacet.combined();
    }
  };

  // Make an endowment to get our meter.
  fullEndowments.getMeter = m => {
    if (m !== true && typeof replaceGlobalMeter !== 'undefined') {
      // Replace the global meter.
      replaceGlobalMeter(meter);
    }
    if (typeof registerEndOfCrank !== 'undefined') {
      // Refill at the end of the crank.
      registerEndOfCrank(doRefill);
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
