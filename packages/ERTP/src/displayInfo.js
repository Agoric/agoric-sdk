import { assert, details, q } from '@agoric/assert';

/**
 * Assert all values from `part` appear in `whole`.
 *
 * @param {string[]} whole
 * @param {string[]} part
 */
export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    assert(
      whole.includes(key),
      details`key ${q(key)} was not one of the expected keys ${q(whole)}`,
    );
  });
};

// Assert that the keys of `record` are all in `allowedKeys`. If a key
// of `record` is not in `allowedKeys`, throw an error. If a key in
// `allowedKeys` is not a key of record, we do not throw an error.
export const assertKeysAllowed = (allowedKeys, record) => {
  const keys = Object.getOwnPropertyNames(record);
  assertSubset(allowedKeys, keys);
  // assert that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(record).length === 0,
    details`no symbol properties allowed`,
  );
};

export const assertDisplayInfo = allegedDisplayInfo => {
  if (allegedDisplayInfo === undefined) {
    return;
  }
  const displayInfoKeys = harden(['decimalPlaces']);
  assertKeysAllowed(displayInfoKeys, allegedDisplayInfo);
};
