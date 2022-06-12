/* global WeakRef, FinalizationRegistry */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeMarshaller } from '../src/liveslots/liveslots.js';
import { XSNAP_COST_MODEL } from '../src/limits/cost-models.js';

const gcTools = harden({
  WeakRef,
  FinalizationRegistry,
  meterControl: makeDummyMeterControl(),
});

function makeUnmeteredMarshaller(syscall) {
  const { m } = makeMarshaller(syscall, gcTools);
  const unmeteredUnserialize = gcTools.meterControl.unmetered(m.unserialize);
  return { m, unmeteredUnserialize };
}

test('serialize exports', t => {
  const syscall = {
    vatstoreGet: () => undefined,
  };
  const { m } = makeMarshaller(syscall, gcTools);
  const ser = m.serialize;
  const o1 = Far('o1', {});
  const o2 = Far('o2', {
    meth1() {
      return 4;
    },
  });
  t.deepEqual(ser(o1), {
    body: '{"@qclass":"slot","iface":"Alleged: o1","index":0}',
    slots: ['o+1'],
  });
  // m now remembers that o1 is exported as 1
  t.deepEqual(ser(harden([o1, o1])), {
    body: '[{"@qclass":"slot","iface":"Alleged: o1","index":0},{"@qclass":"slot","index":0}]',
    slots: ['o+1'],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    body: '[{"@qclass":"slot","iface":"Alleged: o2","index":0},{"@qclass":"slot","iface":"Alleged: o1","index":1}]',
    slots: ['o+2', 'o+1'],
  });
});

test('limits are enforced', async t => {
  const syscall = {
    vatstoreGet: () => undefined,
  };
  const { m } = makeMarshaller(syscall, gcTools, 'forVatID', XSNAP_COST_MODEL);
  const ser = m.serialize;

  t.throws(() => ser('x'.repeat(4 * 1024 * 1024)) && 'unexpected success', {
    message: /value cost .* exceeds .* maximum value cost/,
  });
  t.is(ser('x'.repeat(4 * 1024 * 1024 - 8)) && 'success', 'success');

  t.throws(() => ser(harden({ ['x'.repeat(253)]: 'y' })), {
    message: /key cost .* exceeds .* maximum property cost/,
  });
  t.assert(ser(harden({ ['x'.repeat(252)]: 'y' })));

  t.throws(
    () =>
      ser(harden(['x'.repeat(2 * 1024 * 1024), 'x'.repeat(2 * 1024 * 1024)])) &&
      'unexpected success',
    { message: /total cost .* exceeds .* maximum total cost/ },
  );

  t.is(
    ser(
      harden(['x'.repeat(2 * 1024 * 1024), 'x'.repeat(2 * 1024 * 1024 - 50)]),
    ) && 'success',
    'success',
  );

  t.throws(() => ser(harden(10n ** 100n)), {
    message: /value.*number of digits .* exceeds maximum bigint digits/,
  });
  t.assert(ser(harden(10n ** 99n)));

  t.throws(() => ser(harden(-(10n ** 100n))), {
    message: /value.*number of digits .* exceeds maximum bigint digits/,
  });
  t.assert(ser(harden(-(10n ** 99n))));
});

test('deserialize imports', async t => {
  const { unmeteredUnserialize } = makeUnmeteredMarshaller(undefined);
  const a = unmeteredUnserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  // a should be a proxy/presence. For now these are obvious.
  t.is(a.toString(), '[object Alleged: presence o-1]');
  t.truthy(Object.isFrozen(a));

  // m now remembers the proxy
  const b = unmeteredUnserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = unmeteredUnserialize({
    body: '{"@qclass":"slot","index":2}',
    slots: ['x', 'x', 'o-1'],
  });
  t.is(a, c);
});

test('deserialize exports', t => {
  const syscall = {
    vatstoreGet: () => undefined,
  };
  const { m, unmeteredUnserialize } = makeUnmeteredMarshaller(syscall);
  const o1 = Far('o1', {});
  m.serialize(o1); // allocates slot=1
  const a = unmeteredUnserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o+1'],
  });
  t.is(a, o1);
});

test('serialize imports', async t => {
  const { m, unmeteredUnserialize } = makeUnmeteredMarshaller(undefined);
  const a = unmeteredUnserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.deepEqual(m.serialize(a), {
    body: '{"@qclass":"slot","iface":"Alleged: presence o-1","index":0}',
    slots: ['o-1'],
  });
});

test('serialize promise', async t => {
  const syscall = {
    vatstoreGet: () => undefined,
  };

  const { m, unmeteredUnserialize } = makeUnmeteredMarshaller(syscall);
  const { promise } = makePromiseKit();
  t.deepEqual(m.serialize(promise), {
    body: '{"@qclass":"slot","index":0}',
    slots: ['p+5'],
  });
  // serializer should remember the promise
  t.deepEqual(m.serialize(harden(['other stuff', promise])), {
    body: '["other stuff",{"@qclass":"slot","index":0}]',
    slots: ['p+5'],
  });

  // inbound should recognize it and return the promise
  t.deepEqual(
    unmeteredUnserialize({
      body: '{"@qclass":"slot","index":0}',
      slots: ['p+5'],
    }),
    promise,
  );
});

test('unserialize promise', async t => {
  const log = [];
  const syscall = {
    subscribe(promiseID) {
      log.push(`subscribe-${promiseID}`);
    },
  };

  const { m } = makeMarshaller(syscall, gcTools);
  const unserialize = gcTools.meterControl.unmetered(m.unserialize);
  const p = unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['p-1'],
  });
  t.deepEqual(log, ['subscribe-p-1']);
  t.truthy(p instanceof Promise);
});
