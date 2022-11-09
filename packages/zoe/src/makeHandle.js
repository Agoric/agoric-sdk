// @ts-check

import { assert } from '@agoric/assert';
import { initEmpty, makeHeapFarInstance } from '@agoric/store';
import {
  provide,
  defineDurableFarClass,
  makeKindHandle,
} from '@agoric/vat-data';
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
  const durableHandleKindHandle = provide(
    baggage,
    `${handleType}KindHandle`,
    () => makeKindHandle(`${handleType}Handle`),
  );
  const makeHandle = defineDurableFarClass(
    durableHandleKindHandle,
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
 * @returns {Handle<H>}
 */
export const makeHandle = handleType => {
  assert.typeof(handleType, 'string', 'handleType must be a string');
  // Return the intersection type (really just an empty object).
  // @ts-expect-error Bit by our own opaque types.
  return /** @type {Handle<H>} */ (
    makeHeapFarInstance(`${handleType}Handle`, HandleI, {})
  );
};
harden(makeHandle);
