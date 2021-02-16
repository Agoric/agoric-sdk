// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeMarshal } from './marshal';

import './types';

/** @type {ConvertValToSlot<any>} */
const doNotConvertValToSlot = val =>
  assert.fail(X`Marshal's stringify rejects presences and promises ${val}`);

/** @type {ConvertSlotToVal<any>} */
const doNotConvertSlotToVal = (slot, _iface) =>
  assert.fail(X`Marshal's parse must not encode any slots ${slot}`);

const badArrayHandler = harden({
  get: (_target, name, _receiver) => {
    if (name === 'length') {
      return 0;
    }
    assert.fail(X`Marshal's parse must not encode any slot positions ${name}`);
  },
});

const badArray = harden(new Proxy(harden([]), badArrayHandler));

const { serialize, unserialize } = makeMarshal(
  doNotConvertValToSlot,
  doNotConvertSlotToVal,
  { errorTagging: 'off' },
);

const PREFIX = 'M:';

const PREFIX_PATTERN = /^M:(.*)$/;

const addPrefix = suffix => `${PREFIX}${suffix}`;

const removePrefix = str => {
  const match = PREFIX_PATTERN.exec(str);
  assert(
    match !== null,
    X`Marshal only parses strings that marshal strigified ${str}`,
  );
  return match[1];
};

/**
 * @param {OnlyData} val
 * @returns {string}
 */
const stringify = val => addPrefix(serialize(val).body);
harden(stringify);

/**
 * @param {string} str
 * @returns {OnlyData}
 */
const parse = str =>
  unserialize(
    harden({
      body: removePrefix(str),
      slots: badArray,
    }),
  );
harden(parse);

export { stringify, parse };
