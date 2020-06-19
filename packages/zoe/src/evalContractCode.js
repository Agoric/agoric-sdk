/* global replaceGlobalMeter, registerEndOfCrank, Compartment */
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeMeter } from '@agoric/transform-metering/src/meter';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import { producePromise } from '@agoric/produce-promise';
import { sameStructure } from '@agoric/same-structure';
import { importBundle } from '@agoric/import-bundle';

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

  let transforms = [];
  let meteringEndowments = {};
  if (vatPowers && vatPowers.transformMetering && vatPowers.makeGetMeter) {
    const { makeGetMeter, transformMetering } = vatPowers;
    // This implements fail-stop, since a contract that exhausts the meter
    // will not run again.
    const { getMeter } = makeGetMeter({ refillIfExhausted: false });
    transforms.push(src => transformMetering(src, getMeter));
    meteringEndowments.getMeter = getMeter;
  }

  const defaultEndowments = {
    console: louderConsole,
    harden,
    require: myRequire,
    producePromise,
    assert,
    sameStructure,
    produceIssuer,
    Nat,
  };
  // TODO(for mfig from warner): why the null prototype?
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
    ...Object.getOwnPropertyDescriptors(meteringEndowments),
  });

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle,
                                    { endowments: fullEndowments,
                                      transforms,
                                    });
  return installation;
};

export { evalContractBundle };
