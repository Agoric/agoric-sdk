// @ts-check

/* global makeKind makeWeakStore */

import { importBundle } from '@agoric/import-bundle';
import { assert } from '@agoric/assert';
import { handlePWarning } from '../handleWarning.js';

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
  handlePWarning(installation);
  return installation;
};

export { evalContractBundle };
