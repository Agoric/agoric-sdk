/* global harden */

import Nat from '@agoric/nat';

import makeIssuerKit from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { producePromise } from '@agoric/produce-promise';
import { sameStructure } from '@agoric/same-structure';
import { importBundle } from '@agoric/import-bundle';
import { HandledPromise } from '@agoric/eventual-send';

const evalContractBundle = (bundle, additionalEndowments, vatPowers) => {
  // Make the console more verbose.
  const louderConsole = {
    ...console,
    log: console.info,
  };
  function myRequire(what) {
    if (what === '@agoric/harden') {
      return harden;
    }
    throw Error(`require(${what}) not implemented`);
  }
  harden(myRequire);

  // TODO: this should really only be console and HandledPromise
  const defaultEndowments = {
    assert,
    console: louderConsole,
    harden,
    Nat,
    makeIssuerKit,
    producePromise,
    sameStructure,
    HandledPromise,
  };

  const transforms = [];
  const meteringEndowments = {};
  if (vatPowers && vatPowers.transformMetering && vatPowers.makeGetMeter) {
    const { makeGetMeter, transformMetering } = vatPowers;
    // This implements fail-stop, since a contract that exhausts the meter
    // will not run again.
    const { getMeter } = makeGetMeter({ refillIfExhausted: false });
    transforms.push(src => transformMetering(src, getMeter));
    meteringEndowments.getMeter = getMeter;
  }
  // Note: Old dapps used `makeZoe({ require })`, not `makeZoe()` or
  // `makeZoe({}, vatPowers)`. The first argument of makeZoe appears to
  // evalContractBundle as 'additionalEndowments'. To remain compatible with
  // them (for a brief while), we apply 'require' last, to ignore the one
  // that appears in additionalEndowments.

  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
    ...Object.getOwnPropertyDescriptors(meteringEndowments),
    ...Object.getOwnPropertyDescriptors({ require: myRequire }),
  });

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle, {
    endowments: fullEndowments,
    transforms,
  });
  return installation;
};

export { evalContractBundle };
