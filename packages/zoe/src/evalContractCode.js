import evaluate from '@agoric/evaluate';
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeMint } from '@agoric/ertp/src/mint';
import { insist } from '@agoric/insist';
import makePromise from '@agoric/make-promise';
import { sameStructure } from '@agoric/same-structure';

const evaluateStringToFn = (functionSrcString, endowments) => {
  insist(typeof functionSrcString === 'string')`\n
"${functionSrcString}" must be a string, but was ${typeof functionSrcString}`;
  const fn = evaluate(functionSrcString, endowments);
  insist(typeof fn === 'function')`\n
"${functionSrcString}" must be a string for a function, but produced ${typeof fn}`;
  return fn;
};

const evalContractCode = (code, additionalEndowments) => {
  const defaultEndowments = {
    harden,
    makePromise,
    insist,
    sameStructure,
    makeMint,
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
