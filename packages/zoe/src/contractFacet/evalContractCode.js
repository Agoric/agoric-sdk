// @ts-check

import { importBundle } from '@agoric/import-bundle';

const evalContractBundle = (bundle, additionalEndowments = {}) => {
  // Make the console more verbose.
  const louderConsole = {
    ...console,
    log: console.info,
  };

  const defaultEndowments = {
    console: louderConsole,
  };

  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });

  // Evaluate the export function, and use the resulting
  // module namespace as our installation.

  const installation = importBundle(bundle, {
    endowments: fullEndowments,
  }).catch(() => {}); // Don't trigger Node.js's UnhandledPromiseRejectionWarning
  return installation;
};

export { evalContractBundle };
