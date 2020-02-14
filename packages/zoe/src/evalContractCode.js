import evaluate from '@agoric/evaluate';
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';
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
    produceIssuer,
    Nat,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });
  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const getExport = evaluateStringToFn(code, fullEndowments);
  const installation = getExport();
  return installation;
};

export { evalContractCode };
