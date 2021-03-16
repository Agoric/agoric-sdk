// @ts-check

/* global makeKind makeWeakStore */

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
    makeKind,
    makeWeakStore,
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
  // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
  // This does not suppress any error messages.
  installation.catch(() => {});
  return installation;
};

export { evalContractBundle };
