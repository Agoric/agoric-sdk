// @ts-check

import { importBundle } from '@agoric/import-bundle';
import { assert } from '@agoric/assert';

const evalContractBundle = (bundle, additionalEndowments = {}) => {
  // Make the console more verbose.
  const louderConsole = {
    ...console,
    log: console.info,
  };

  const defaultEndowments = {
    console: louderConsole,
    assert,
  };

  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle, {
    endowments: fullEndowments,
  });
  installation.catch(err => {
    console.error(err);
    // Remove to suppress Node.js's UnhandledPromiseRejectionWarning
    throw err;
  });
  return installation;
};

export { evalContractBundle };
