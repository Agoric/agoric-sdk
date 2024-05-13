// @jessie-check

import { Fail } from '@endo/errors';
import { initEmpty, makeExo } from '@agoric/store';
import { prepareExoClass } from '@agoric/vat-data';

import { HandleI } from './typeGuards.js';

/** @import {Baggage} from '@agoric/vat-data' */

/**
 * @template {string} H
 * @param {Baggage} baggage
 * @param {H} handleType
 * @returns {H extends 'Instance' ? () => Instance : () => Handle<H>}
 */
export const defineDurableHandle = (baggage, handleType) => {
  typeof handleType === 'string' || Fail`handleType must be a string`;
  const makeHandle = prepareExoClass(
    baggage,
    `${handleType}Handle`,
    HandleI,
    initEmpty,
    {},
  );
  // @ts-expect-error Bit by our own opaque types.
  return /** @type {() => Handle<H>} */ (makeHandle);
};
harden(defineDurableHandle);

/**
 * Create an opaque handle object.
 *
 * @template {string} H
 * @param {H} handleType the string literal type of the handle
 * @returns {H extends 'Instance' ? Instance : Handle<H>}
 */
export const makeHandle = handleType => {
  typeof handleType === 'string' || Fail`handleType must be a string`;
  // Return the intersection type (really just an empty object).
  // @ts-expect-error Bit by our own opaque types.
  return /** @type {Handle<H>} */ (makeExo(`${handleType}Handle`, HandleI, {}));
};
harden(makeHandle);
