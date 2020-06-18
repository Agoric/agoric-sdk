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
  if (vatPowers && vatPowers.transformMetering && vatPowers.setMeter) {
    // TODO for now, the meter will never get refilled. the next step is for
    // the kernel to get involved and refill it for us between cranks
    // (vatPowers will provide a kernel-supplied makeMeter)
    const { setMeter, transformMetering } = vatPowers;
    const { meter, refillFacet } = makeMeter();
    function getMeter() {
      // Tell the kernel to enable "global metering" on JS builtins. This will
      // remain active until we call setMeter() again, or the crank is complete
      // (whereupon the kernel will turn off metering).
      setMeter(meter);
      return meter;
    }
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

  /*
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
*/

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle,
                                    { endowments: fullEndowments,
                                      transforms,
                                    });
  return installation;
};

export { evalContractBundle };
