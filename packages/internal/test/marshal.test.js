// @ts-check
import test from 'ava';

import { Far, getInterfaceOf, makeMarshal, passStyleOf } from '@endo/marshal';
import { Fail, q } from '@endo/errors';
import { makeInaccessibleVal } from '../src/marshal/inaccessible-val.js';
import { wrapRemoteMarshallerSendSlotsOnly as wrapRemoteMarshaller } from '../src/marshal/wrap-marshaller.js';

/**
 * @import {Marshal} from '@endo/marshal';
 * @import {Farable} from '@endo/exo';
 */

/**
 * @param {object} [options]
 * @param {Map<string, object>} [options.mockSotToVal]
 * @param {WeakMap<object, string>} [options.mockValToSlot]
 * @param {(val: any, direction: 'from' | 'to') => void} [options.valueHook]
 * @param {boolean} [options.readOnly]
 * @returns {Farable<
 *   Pick<Marshal<string | null>, 'fromCapData' | 'toCapData'>
 * >}
 */
const makeMockMarshaller = ({
  mockSotToVal = new Map(),
  mockValToSlot = new WeakMap(),
  valueHook,
  readOnly = false,
} = {}) => {
  let nextId = 1;
  const marshaller = makeMarshal(
    val => {
      if (!mockValToSlot.has(val) && !readOnly) {
        const nextSlot = `mock${nextId}`;
        nextId += 1;
        mockValToSlot.set(val, nextSlot);
        mockSotToVal.set(`${nextSlot}.(${getInterfaceOf(val)})`, val);
      }
      return mockValToSlot.get(val) || null;
    },
    (slot, iface) => {
      if (slot === null) {
        return makeInaccessibleVal(iface);
      }
      return (
        mockSotToVal.get(`${slot}.(${iface})`) ||
        Fail`Unknown mock slot ${q(slot)} for iface ${q(iface)}. Known entries: ${q([...mockSotToVal.keys()])}`
      );
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
    switch (passStyle) {
      case 'null':
      case 'undefined':
        break;
      case 'remotable':
        hasCap = true;
        break;
      default:
        t.fail(`Unexpected pass-style: ${passStyle}`);
    }
  }
  t.true(hasCap);
};

const unexpectedMarshallerInvocation = (t, val) => {
  t.log('Unexpected marshalled value', val);
  t.fail('Remote marshaller should not have been invoked');
};

test.before(t => {
  const marshaller = makeMockMarshaller();

  const specimen = harden({ remotable: Far('bar', { sentinel() {} }) });
  const specimen2 = harden({ remotable: Far('bar', { sentinel() {} }) });

  const marshalledSpecimen = marshaller.fromCapData(
    marshaller.toCapData(specimen),
  );

  // These tests rely on the fact `deepEqual` performs an identity check on
  // functions and that marshal does not pierce the remotable boundary, so that
  // `sentinel` is a proxy to check that the remotable identity is preserved.

  t.deepEqual(marshalledSpecimen, specimen);
  t.notDeepEqual(specimen, specimen2);
});

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

const withSlots = test.macro(async (t, { withCache } = {}) => {
  let valueHookCalled = false;
  const marshaller = makeMockMarshaller({
    valueHook: val => {
      if (valueHookCalled && withCache) {
        unexpectedMarshallerInvocation(t, val);
      } else {
        valueHookCalled = true;
        checkRemoteMarshallerValueInvariants(t, val);
      }
    },
  });
  const wrappedMarshaller = wrapRemoteMarshaller(
    marshaller,
    {},
    withCache
      ? {} // default caches
      : {
          slotToVal: null,
          valToSlot: null,
        },
  );

  const specimen = harden({ foo: 42, bar: Far('bar', { sentinel() {} }) });

  // Will populate the cache
  const capData = await wrappedMarshaller.toCapData(specimen);
  // Will hit the cache
  const clone = await wrappedMarshaller.fromCapData(capData);

  t.deepEqual(clone, specimen);
  t.is(clone.bar, specimen.bar);

  // Will hit the cache
  const capData2 = await wrappedMarshaller.toCapData(specimen);

  const caches = {
    slotToVal: withCache ? new Map() : null,
    valToSlot: withCache ? new Map() : null,
  };
  const wrappedMarshaller2 = wrapRemoteMarshaller(marshaller, {}, caches);
  valueHookCalled = false;

  // Populate the cache
  const clone2 = await wrappedMarshaller2.fromCapData(capData2);
  t.true(valueHookCalled);
  t.deepEqual(clone2, specimen);

  if (withCache) {
    const cap = specimen.bar;
    const slot = capData2.slots[0];
    t.is(caches.slotToVal?.get(slot), cap);
    t.is(caches.valToSlot?.get(cap), slot);
  }

  // Hit the cache
  const clone3 = await wrappedMarshaller2.fromCapData(capData2);
  t.deepEqual(clone3, specimen);
});

test('wrapRemoteMarshaller - with slots - without cache', withSlots, {
  withCache: false,
});
test('wrapRemoteMarshaller - with slots - with cache', withSlots, {
  withCache: true,
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

  t.like(capData, { slots: [null] });
  t.deepEqual(clone, { ...specimen, bar: makeInaccessibleVal('bar') });
});

const withNullAndNonNullSlots = test.macro(async (t, { withCache }) => {
  const sharedCap = Far('shared', { sentinel() {} });

  const mockSotToVal = new Map();
  const mockValToSlot = new WeakMap();

  let valueHookCalled = false;
  const writeMarshaller = makeMockMarshaller({ mockSotToVal, mockValToSlot });
  const marshaller = makeMockMarshaller({
    mockSotToVal,
    mockValToSlot,
    valueHook: val => {
      if (valueHookCalled && withCache) {
        unexpectedMarshallerInvocation(t, val);
      } else {
        valueHookCalled = true;
        checkRemoteMarshallerValueInvariants(t, val);
      }
    },
    readOnly: true,
  });

  const cacheSeveredVal = withCache === 'includeSevered';
  const caches = {
    slotToVal: withCache ? new Map() : null,
    valToSlot: withCache ? new Map() : null,
    cacheSeveredVal,
  };
  const wrappedMarshaller = wrapRemoteMarshaller(marshaller, {}, caches);

  const {
    slots: [sharedSlot],
  } = writeMarshaller.toCapData(sharedCap);

  const specimen = harden({
    foo: 42,
    bar: Far('bar', { sentinel() {} }),
    shared: sharedCap,
  });

  const capData = await wrappedMarshaller.toCapData(specimen);
  if (withCache) {
    t.is(caches.slotToVal?.get(sharedSlot), sharedCap);
    t.is(caches.valToSlot?.get(sharedCap), sharedSlot);

    if (cacheSeveredVal) {
      t.is(caches.valToSlot?.get(specimen.bar), null);
      t.is(caches.valToSlot?.size, 2);
    } else {
      t.false(caches.valToSlot?.has(specimen.bar));
      t.is(caches.valToSlot?.size, 1);
    }

    // Must never cache a null slot
    t.false(caches.slotToVal?.has(null));
    t.is(caches.slotToVal?.size, 1);
  }
  const clone = await wrappedMarshaller.fromCapData(capData);
  t.deepEqual(clone, { ...specimen, bar: makeInaccessibleVal('bar') });

  if (!cacheSeveredVal) {
    // Without caching of severed val, toCapData will have to invoke the marshaller again
    // That invocation will have an `undefined` value for the cached sharedCap.
    valueHookCalled = false;
  }
  const capData2 = await wrappedMarshaller.toCapData(specimen);
  if (withCache) {
    // Must not have updated slot cache for the (maybe cached) severed value
    t.false(caches.slotToVal?.has(null));
    t.is(caches.slotToVal?.size, 1);
  }
  t.deepEqual(capData2, capData);
});

test(
  'wrapRemoteMarshaller - null and non-null slots - without cache',
  withNullAndNonNullSlots,
  { withCache: false },
);
test(
  'wrapRemoteMarshaller - null and non-null slots - with cache',
  withNullAndNonNullSlots,
  { withCache: true },
);
test(
  'wrapRemoteMarshaller - null and non-null slots - with cache of severed values',
  withNullAndNonNullSlots,
  { withCache: 'includeSevered' },
);

test('wrapRemoteMarshaller preserves identity in fromCapData', async t => {
  const src = makeMockMarshaller();
  const wrappedMarshaller = wrapRemoteMarshaller(src);

  const specimen = Far('BLD Brand');
  const capData = await src.toCapData(specimen);

  const presence1 = await wrappedMarshaller.fromCapData(capData);
  const presence2 = await wrappedMarshaller.fromCapData(capData);
  t.is(presence1, presence2);
});
