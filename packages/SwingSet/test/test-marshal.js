import '@agoric/install-ses';
import { Remotable } from '@agoric/marshal';
import test from 'ava';
import { makePromiseKit } from '@agoric/promise-kit';

import { WeakRef, FinalizationRegistry } from '../src/weakref';
import { makeMarshaller } from '../src/kernel/liveSlots';

import { buildVatController } from '../src/index';

const gcTools = harden({ WeakRef, FinalizationRegistry });

async function prep() {
  const config = {};
  const controller = await buildVatController(config);
  await controller.run();
}

test('serialize exports', t => {
  const { m } = makeMarshaller(undefined, gcTools);
  const ser = val => m.serialize(val);
  const o1 = Remotable('Alleged: o1', undefined, {});
  const o2 = Remotable('Alleged: o2', undefined, {
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
    body: '[{"@qclass":"slot","iface":"Alleged: o1","index":0},{"@qclass":"ibid","index":1}]',
    slots: ['o+1'],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    body: '[{"@qclass":"slot","iface":"Alleged: o2","index":0},{"@qclass":"slot","iface":"Alleged: o1","index":1}]',
    slots: ['o+2', 'o+1'],
  });
});

test('deserialize imports', async t => {
  await prep();
  const { m } = makeMarshaller(undefined, gcTools);
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  // a should be a proxy/presence. For now these are obvious.
  t.is(a.toString(), '[Alleged: presence o-1]');
  t.truthy(Object.isFrozen(a));

  // m now remembers the proxy
  const b = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = m.unserialize({
    body: '{"@qclass":"slot","index":2}',
    slots: ['x', 'x', 'o-1'],
  });
  t.is(a, c);
});

test('deserialize exports', t => {
  const { m } = makeMarshaller(undefined, gcTools);
  const o1 = Remotable('Alleged: o1', undefined, {});
  m.serialize(o1); // allocates slot=1
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o+1'],
  });
  t.is(a, o1);
});

test('serialize imports', async t => {
  await prep();
  const { m } = makeMarshaller(undefined, gcTools);
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.deepEqual(m.serialize(a), {
    body: '{"@qclass":"slot","iface":"Alleged: presence o-1","index":0}',
    slots: ['o-1'],
  });
});

test('serialize promise', async t => {
  const log = [];
  const syscall = {
    fulfillToData(result, data) {
      log.push({ result, data });
    },
  };

  const { m } = makeMarshaller(syscall, gcTools);
  const { promise, resolve } = makePromiseKit();
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
    m.unserialize({ body: '{"@qclass":"slot","index":0}', slots: ['p+5'] }),
    promise,
  );

  resolve(5);
  t.deepEqual(log, []);

  const { promise: pauseP, resolve: pauseRes } = makePromiseKit();
  setImmediate(() => pauseRes());
  await pauseP;
  t.deepEqual(log, [{ result: 'p+5', data: { body: '5', slots: [] } }]);
});

test('unserialize promise', async t => {
  await prep();
  const log = [];
  const syscall = {
    subscribe(promiseID) {
      log.push(`subscribe-${promiseID}`);
    },
  };

  const { m } = makeMarshaller(syscall, gcTools);
  const p = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['p-1'],
  });
  t.deepEqual(log, ['subscribe-p-1']);
  t.truthy(p instanceof Promise);
});
