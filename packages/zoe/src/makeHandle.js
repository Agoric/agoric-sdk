// @ts-check

import { initEmpty } from '@agoric/store';
import { vivifyFarClass } from '@agoric/vat-data';
import { Far } from '@endo/marshal';
import { HandleI } from './typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @template {string} H
 * @param {Baggage} baggage
 * @param {H} handleType
 * @returns {() => Handle<H>}
 */
export const defineDurableHandle = (baggage, handleType) => {
  assert.typeof(handleType, 'string', 'handleType must be a string');
  const makeHandle = vivifyFarClass(
    baggage,
    `${handleType}Handle`,
    HandleI,
    initEmpty,
    {},
  );
  return /** @type {() => Handle<H>} */ (makeHandle);
};
harden(defineDurableHandle);

/**
 * Create an opaque handle object.
 *
 * @template {string} H
 * @param {H} handleType the string literal type of the handle
 * @returns {Handle<H>}
 */
export const makeHandle = handleType => {
  assert.typeof(handleType, 'string', 'handleType must be a string');
  // Return the intersection type (really just an empty object).
  return /** @type {Handle<H>} */ (Far(`${handleType}Handle`));
};
harden(makeHandle);
