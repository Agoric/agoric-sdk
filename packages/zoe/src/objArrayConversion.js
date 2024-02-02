import { assert, Fail, q } from '@agoric/assert';

/**
 * @typedef {bigint|boolean|null|number|string|symbol|undefined} Primitive
 * @typedef {string|number|symbol} PropertyName
 */

/**
 * Assert all values from `part` appear in `whole`.
 *
 * @param {string[]} whole
 * @param {string[]} part
 */
export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    whole.includes(key) ||
      Fail`key ${q(key)} was not one of the expected keys ${q(whole)}`;
  });
};
