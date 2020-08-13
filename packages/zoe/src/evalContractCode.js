/* global HandledPromise */
import Nat from '@agoric/nat';

import makeIssuerKit from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';
import { sameStructure } from '@agoric/same-structure';
import { importBundle } from '@agoric/import-bundle';

const evalContractBundle = (bundle, additionalEndowments = {}) => {
  // Make the console more verbose.
  const louderConsole = {
    ...console,
    log: console.info,
  };

  // TODO: this should really only be console
  const defaultEndowments = {
    assert,
    console: louderConsole,
    harden,
    Nat,
    makeIssuerKit,
    makePromiseKit,
    sameStructure,
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
  return installation;
};

export { evalContractBundle };
