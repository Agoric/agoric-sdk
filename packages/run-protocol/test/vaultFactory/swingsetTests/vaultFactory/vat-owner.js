// @ts-check

import { Far } from '@agoric/marshal';
import { buildOwner } from '../setup.js';

// VaultFactory owner

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => buildOwner(vatPowers.testLog, ...args),
  });
}
