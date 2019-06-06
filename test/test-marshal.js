/* globals BigInt */

import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import { makeMarshal, mustPassByPresence } from '@agoric/marshal';

import { makeMarshaller } from '../src/kernel/liveSlots';
import makePromise from '../src/kernel/makePromise';

test('serialize static data', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);
  t.throws(() => ser([1, 2]), /cannot pass non-frozen objects like .*/);
  t.deepEqual(ser(harden([1, 2])), { argsString: '[1,2]', slots: [] });
  t.deepEqual(ser(harden({ foo: 1 })), { argsString: '{"foo":1}', slots: [] });
  t.deepEqual(ser(true), { argsString: 'true', slots: [] });
  t.deepEqual(ser(1), { argsString: '1', slots: [] });
  t.deepEqual(ser('abc'), { argsString: '"abc"', slots: [] });
  t.deepEqual(ser(undefined), {
    argsString: '{"@qclass":"undefined"}',
    slots: [],
  });
  t.deepEqual(ser(-0), { argsString: '{"@qclass":"-0"}', slots: [] });
  t.deepEqual(ser(NaN), { argsString: '{"@qclass":"NaN"}', slots: [] });
  t.deepEqual(ser(Infinity), {
    argsString: '{"@qclass":"Infinity"}',
    slots: [],
  });
  t.deepEqual(ser(-Infinity), {
    argsString: '{"@qclass":"-Infinity"}',
    slots: [],
  });
  t.deepEqual(ser(Symbol.for('sym1')), {
    argsString: '{"@qclass":"symbol","key":"sym1"}',
    slots: [],
  });
  let bn;
  try {
    bn = BigInt(4);
  } catch (e) {
    if (!(e instanceof ReferenceError)) {
      throw e;
    }
  }
  if (bn) {
    t.deepEqual(ser(bn), {
      argsString: '{"@qclass":"bigint","digits":"4"}',
      slots: [],
    });
  }

  let em;
  try {
    throw new ReferenceError('msg');
  } catch (e) {
    em = harden(e);
  }
  t.deepEqual(ser(em), {
    argsString: '{"@qclass":"error","name":"ReferenceError","message":"msg"}',
    slots: [],
  });

  t.end();
});

test('unserialize static data', t => {
  const m = makeMarshal();
  const uns = val => m.unserialize(val, []);
  t.equal(uns('1'), 1);
  t.equal(uns('"abc"'), 'abc');
  t.equal(uns('false'), false);

  // JS primitives that aren't natively representable by JSON
  t.deepEqual(uns('{"@qclass":"undefined"}'), undefined);
  t.ok(Object.is(uns('{"@qclass":"-0"}'), -0));
  t.notOk(Object.is(uns('{"@qclass":"-0"}'), 0));
  t.ok(Object.is(uns('{"@qclass":"NaN"}'), NaN));
  t.deepEqual(uns('{"@qclass":"Infinity"}'), Infinity);
  t.deepEqual(uns('{"@qclass":"-Infinity"}'), -Infinity);
  t.deepEqual(uns('{"@qclass":"symbol", "key":"sym1"}'), Symbol.for('sym1'));

  // Normal json reviver cannot make properties with undefined values
  t.deepEqual(uns('[{"@qclass":"undefined"}]'), [undefined]);
  t.deepEqual(uns('{"foo": {"@qclass":"undefined"}}'), { foo: undefined });
  let bn;
  try {
    bn = BigInt(4);
  } catch (e) {
    if (!(e instanceof ReferenceError)) {
      throw e;
    }
  }
  if (bn) {
    t.deepEqual(uns('{"@qclass":"bigint","digits":"1234"}'), BigInt(1234));
  }

  const em1 = uns(
    '{"@qclass":"error","name":"ReferenceError","message":"msg"}',
  );
  t.ok(em1 instanceof ReferenceError);
  t.equal(em1.message, 'msg');
  t.ok(Object.isFrozen(em1));

  const em2 = uns('{"@qclass":"error","name":"TypeError","message":"msg2"}');
  t.ok(em2 instanceof TypeError);
  t.equal(em2.message, 'msg2');

  const em3 = uns('{"@qclass":"error","name":"Unknown","message":"msg3"}');
  t.ok(em3 instanceof Error);
  t.equal(em3.message, 'msg3');

  t.deepEqual(uns('[1,2]'), [1, 2]);
  t.deepEqual(uns('{"a":1,"b":2}'), { a: 1, b: 2 });
  t.deepEqual(uns('{"a":1,"b":{"c": 3}}'), { a: 1, b: { c: 3 } });

  // should be frozen
  const arr = uns('[1,2]');
  t.ok(Object.isFrozen(arr));
  const a = uns('{"b":{"c":{"d": []}}}');
  t.ok(Object.isFrozen(a));
  t.ok(Object.isFrozen(a.b));
  t.ok(Object.isFrozen(a.b.c));
  t.ok(Object.isFrozen(a.b.c.d));

  t.end();
});

test('serialize ibid cycle', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);
  const cycle = ['a', 'x', 'c'];
  cycle[1] = cycle;
  harden(cycle);

  t.deepEqual(ser(cycle), {
    argsString: '["a",{"@qclass":"ibid","index":0},"c"]',
    slots: [],
  });
  t.end();
});

test('forbid ibid cycle', t => {
  const m = makeMarshal();
  const uns = val => m.unserialize(val, []);
  t.throws(
    () => uns('["a",{"@qclass":"ibid","index":0},"c"]'),
    /Ibid cycle at 0/,
  );
  t.end();
});

test('unserialize ibid cycle', t => {
  const m = makeMarshal();
  const uns = val => m.unserialize(val, [], 'warnOfCycles');
  const cycle = uns('["a",{"@qclass":"ibid","index":0},"c"]');
  t.ok(Object.is(cycle[1], cycle));
  t.end();
});

test('serialize exports', t => {
  const { m } = makeMarshaller();
  const ser = val => m.serialize(val);
  const o1 = harden({});
  const o2 = harden({
    meth1() {
      return 4;
    },
  });
  t.deepEqual(ser(o1), {
    argsString: '{"@qclass":"slot","index":0}',
    slots: [{ type: 'export', id: 1 }],
  });
  // m now remembers that o1 is exported as 1
  t.deepEqual(ser(harden([o1, o1])), {
    argsString: '[{"@qclass":"slot","index":0},{"@qclass":"ibid","index":1}]',
    slots: [{ type: 'export', id: 1 }],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    argsString: '[{"@qclass":"slot","index":0},{"@qclass":"slot","index":1}]',
    slots: [{ type: 'export', id: 2 }, { type: 'export', id: 1 }],
  });

  t.end();
});

test('deserialize imports', t => {
  const { m } = makeMarshaller();
  const a = m.unserialize('{"@qclass":"slot","index":0}', [
    { type: 'import', id: 1 },
  ]);
  // a should be a proxy/presence. For now these are obvious.
  t.ok('_importID_1' in a);
  t.ok(Object.isFrozen(a));

  // m now remembers the proxy
  const b = m.unserialize('{"@qclass":"slot","index":0}', [
    { type: 'import', id: 1 },
  ]);
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = m.unserialize('{"@qclass":"slot","index":2}', [
    'x',
    'x',
    { type: 'import', id: 1 },
  ]);
  t.is(a, c);

  t.end();
});

test('deserialize exports', t => {
  const { m } = makeMarshaller();
  const o1 = harden({});
  m.serialize(o1); // allocates slot=1
  const a = m.unserialize('{"@qclass":"slot","index":0}', [
    { type: 'export', id: 1 },
  ]);
  t.is(a, o1);

  t.end();
});

test('serialize imports', t => {
  const { m } = makeMarshaller();
  const a = m.unserialize('{"@qclass":"slot","index":0}', [
    { type: 'import', id: 1 },
  ]);
  t.deepEqual(m.serialize(a), {
    argsString: '{"@qclass":"slot","index":0}',
    slots: [{ type: 'import', id: 1 }],
  });

  t.end();
});

test('serialize promise', async t => {
  const log = [];
  const syscall = {
    createPromise() {
      return {
        promiseID: 1,
        resolverID: 2,
      };
    },
    fulfillToData(resolverID, data, slots) {
      log.push({ resolverID, data, slots });
    },
  };

  const { m } = makeMarshaller(syscall);
  const { p, res } = makePromise();
  t.deepEqual(m.serialize(p), {
    argsString: '{"@qclass":"slot","index":0}',
    slots: [{ type: 'promise', id: 1 }],
  });
  // serializer should remember the promise
  t.deepEqual(m.serialize(harden(['other stuff', p])), {
    argsString: '["other stuff",{"@qclass":"slot","index":0}]',
    slots: [{ type: 'promise', id: 1 }],
  });

  // inbound should recognize it and return the promise
  t.deepEqual(
    m.unserialize('{"@qclass":"slot","index":0}', [{ type: 'promise', id: 1 }]),
    p,
  );

  res(5);
  t.deepEqual(log, []);

  const { p: pauseP, res: pauseRes } = makePromise();
  setImmediate(() => pauseRes());
  await pauseP;
  t.deepEqual(log, [{ resolverID: 2, data: '5', slots: [] }]);

  t.end();
});

test('unserialize promise', t => {
  const log = [];
  const syscall = {
    subscribe(promiseID) {
      log.push(`subscribe-${promiseID}`);
    },
  };

  const { m } = makeMarshaller(syscall);
  const p = m.unserialize('{"@qclass":"slot","index":0}', [
    { type: 'promise', id: 1 },
  ]);
  t.deepEqual(log, ['subscribe-1']);
  t.ok(p instanceof Promise);

  t.end();
});

test('null cannot be pass-by-presence', t => {
  t.throws(() => mustPassByPresence(null), /null cannot be pass-by-presence/);
  t.end();
});

test('mal-formed @qclass', t => {
  const m = makeMarshal();
  const uns = val => m.unserialize(val, []);
  t.throws(() => uns('{"@qclass": 0}'), /invalid qclass/);
  t.end();
});
