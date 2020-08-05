// @ts-check

import { importBundle } from '@agoric/import-bundle';
import { HandledPromise } from '@agoric/eventual-send';

const evalContractBundle = (bundle, additionalEndowments = {}) => {
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

  const defaultEndowments = {
    console: louderConsole,
    HandledPromise,
  };

  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
    ...Object.getOwnPropertyDescriptors({ require: myRequire }),
  });

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle, {
    endowments: fullEndowments,
  });
  return installation;
};

export { evalContractBundle };
