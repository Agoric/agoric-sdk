/* global WeakRef, FinalizationRegistry */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { kser, makeError } from '@agoric/kmarshal';
import { makeMarshaller } from '@agoric/swingset-liveslots';

import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';

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
    body: '#"$0.Alleged: o1"',
    slots: ['o+1'],
  });
  // m now remembers that o1 is exported as 1
  t.deepEqual(ser(harden([o1, o1])), {
    body: '#["$0.Alleged: o1","$0"]',
    slots: ['o+1'],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    body: '#["$0.Alleged: o2","$1.Alleged: o1"]',
    slots: ['o+2', 'o+1'],
  });
});

test('deserialize imports', async t => {
  const { unmeteredUnserialize } = makeUnmeteredMarshaller(undefined);
  const a = unmeteredUnserialize({
    body: '#"$0"',
    slots: ['o-1'],
  });
  // a should be a proxy/presence. For now these are obvious.
  t.is(a.toString(), '[object Alleged: presence o-1]');
  t.truthy(Object.isFrozen(a));

  // m now remembers the proxy
  const b = unmeteredUnserialize({
    body: '#"$0"',
    slots: ['o-1'],
  });
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = unmeteredUnserialize({
    body: '#"$2"',
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
    body: '#"$0"',
    slots: ['o+1'],
  });
  t.is(a, o1);
});

test('serialize imports', async t => {
  const { m, unmeteredUnserialize } = makeUnmeteredMarshaller(undefined);
  const a = unmeteredUnserialize({
    body: '#"$0"',
    slots: ['o-1'],
  });
  t.deepEqual(m.serialize(a), {
    body: '#"$0.Alleged: presence o-1"',
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
    body: '#"&0"',
    slots: ['p+5'],
  });
  // serializer should remember the promise
  t.deepEqual(m.serialize(harden(['other stuff', promise])), {
    body: '#["other stuff","&0"]',
    slots: ['p+5'],
  });

  // inbound should recognize it and return the promise
  t.deepEqual(
    unmeteredUnserialize({
      body: '#"&0"',
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
    body: '#"&0"',
    slots: ['p-1'],
  });
  t.deepEqual(log, ['subscribe-p-1']);
  t.truthy(p instanceof Promise);
});

test('kernel serialization of errors', async t => {
  // The kernel synthesizes e.g. `Error('vat-upgrade failure')`, so we
  // need kmarshal to serialize those errors in a deterministic
  // way. This test checks that we don't get surprising things like
  // `errorId` or stack traces.
  const e1 = kser(Error('fake error'));
  const ref = {
    body: '#{"#error":"fake error","name":"Error"}',
    slots: [],
  };
  t.deepEqual(e1, ref);

  const e2 = makeError('fake error');
  t.deepEqual(e2, ref);
});
