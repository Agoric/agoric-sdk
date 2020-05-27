/* global replaceGlobalMeter, registerEndOfCrank, Compartment */
import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeMeter } from '@agoric/transform-metering/src/meter';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import { producePromise } from '@agoric/produce-promise';
import { sameStructure } from '@agoric/same-structure';
import { importBundle } from '@agoric/import-bundle';

const evalContractBundle = (bundle, additionalEndowments) => {
  // Make the console more verbose.
  const louderConsole = {
    ...console,
    log: console.info,
  };
  const defaultEndowments = {
    console: louderConsole,
    harden,
    producePromise,
    assert,
    sameStructure,
    produceIssuer,
    Nat,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
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

  const installation = importBundle(bundle, { endowments: fullEndowments });
  return installation;
};

export { evalContractBundle };
