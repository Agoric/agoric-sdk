// @ts-check
import test from 'ava';

import { Far, makeMarshal, passStyleOf } from '@endo/marshal';
import { Fail } from '@endo/errors';
import { wrapRemoteMarshaller, makeInaccessibleVal } from '../src/marshal.js';

/**
 * @import {Marshal} from '@endo/marshal';
 * @import {Farable} from '@endo/exo';
 */

/**
 * @param {object} [options]
 * @param {Map<string, object>} [options.slotToVal]
 * @param {WeakMap<object, string>} [options.valToSlot]
 * @param {(val: any, direction: 'from' | 'to') => void} [options.valueHook]
 * @param {boolean} [options.readOnly]
 * @returns {Farable<
 *   Pick<Marshal<string | null>, 'fromCapData' | 'toCapData'>
 * >}
 */
const makeMockMarshaller = ({
  slotToVal = new Map(),
  valToSlot = new WeakMap(),
  valueHook,
  readOnly = false,
} = {}) => {
  let nextId = 1;
  const marshaller = makeMarshal(
    val => {
      if (!valToSlot.has(val) && !readOnly) {
        const nextSlot = `mock${nextId}`;
        nextId += 1;
        valToSlot.set(val, nextSlot);
        slotToVal.set(nextSlot, val);
      }
      return valToSlot.get(val) || null;
    },
    (slot, iface) => {
      if (slot === null) {
        return makeInaccessibleVal(iface);
      }
      return slotToVal.get(slot) || Fail`Unknown mock slot ${slot}`;
    },
    {
      serializeBodyFormat: 'smallcaps',
    },
  );

  return Far('mock marshaller', {
    toCapData(val) {
      valueHook?.(val, 'to');
      return marshaller.toCapData(val);
    },
    fromCapData(data) {
      const val = marshaller.fromCapData(data);
      valueHook?.(val, 'from');
      return val;
    },
  });
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {any} val
 */
const checkRemoteMarshallerValueInvariants = (t, val) => {
  t.true(Array.isArray(val));
  t.true(val.length > 0);
  let hasCap = false;
  for (const elem of val) {
    const passStyle = passStyleOf(elem);
    if (passStyle !== 'null') {
      t.is(passStyle, 'remotable');
      hasCap = true;
    }
  }
  t.true(hasCap);
};

const unexpectedMarshallerInvocation = (t, val) => {
  t.log('Unexpected marshalled value', val);
  t.fail('Remote marshaller should not have been invoked');
};

test('wrapRemoteMarshaller - empty slots', async t => {
  const marshaller = makeMockMarshaller({
    valueHook: val => {
      unexpectedMarshallerInvocation(t, val);
    },
  });

  const wrappedMarshaller = wrapRemoteMarshaller(marshaller);

  const specimen = harden({ foo: 42, err: Error('bar') });

  const capData = await wrappedMarshaller.toCapData(specimen);
  const clone = await wrappedMarshaller.fromCapData(capData);

  t.deepEqual(clone, specimen);
});

test('wrapRemoteMarshaller - with slots', async t => {
  const marshaller = makeMockMarshaller({
    valueHook: val => {
      checkRemoteMarshallerValueInvariants(t, val);
    },
  });
  const wrappedMarshaller = wrapRemoteMarshaller(marshaller);

  const specimen = harden({ foo: 42, bar: Far('bar', { sentinel() {} }) });

  const capData = await wrappedMarshaller.toCapData(specimen);
  const clone = await wrappedMarshaller.fromCapData(capData);

  t.deepEqual(clone, specimen);
});

test('wrapRemoteMarshaller - read-only marshaller', async t => {
  const marshaller = makeMockMarshaller({
    valueHook: (val, direction) => {
      if (direction === 'from') {
        unexpectedMarshallerInvocation(t, val);
      } else {
        checkRemoteMarshallerValueInvariants(t, val);
      }
    },
    readOnly: true,
  });
  const wrappedMarshaller = wrapRemoteMarshaller(marshaller);

  const specimen = harden({ foo: 42, bar: Far('bar', { sentinel() {} }) });

  const capData = await wrappedMarshaller.toCapData(specimen);
  const clone = await wrappedMarshaller.fromCapData(capData);

  t.deepEqual(clone, { ...specimen, bar: makeInaccessibleVal('bar') });
});

test('wrapRemoteMarshaller - null and non-null slots', async t => {
  const sharedCap = Far('shared', { sentinel() {} });

  const slotToVal = new Map();
  const valToSlot = new WeakMap();

  const writeMarshaller = makeMockMarshaller({ slotToVal, valToSlot });
  const marshaller = makeMockMarshaller({
    slotToVal,
    valToSlot,
    valueHook: val => {
      checkRemoteMarshallerValueInvariants(t, val);
    },
    readOnly: true,
  });

  const wrappedMarshaller = wrapRemoteMarshaller(marshaller);

  writeMarshaller.toCapData(sharedCap);

  const specimen = harden({
    foo: 42,
    bar: Far('bar', { sentinel() {} }),
    shared: sharedCap,
  });

  const capData = await wrappedMarshaller.toCapData(specimen);
  const clone = await wrappedMarshaller.fromCapData(capData);

  t.deepEqual(clone, { ...specimen, bar: makeInaccessibleVal('bar') });
});
