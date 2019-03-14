/* globals BigInt */

import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import { makeMarshal } from '../src/kernel/marshal';
import { makeLiveSlots } from '../src/kernel/liveSlots';

test('serialize static data', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);
  t.throws(
    () => ser([1, 2]),
    /non-frozen objects like .* are disabled for now/,
  );
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
  t.deepEqual(uns('{"@qclass":"undefined"}'), undefined);
  t.deepEqual(uns('{"@qclass":"symbol", "key":"sym1"}'), Symbol.for('sym1'));
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

test('serialize exports', t => {
  const { m } = makeLiveSlots();
  const ser = val => m.serialize(val);
  const o1 = harden({});
  const o2 = harden({
    meth1() {
      return 4;
    },
  });
  t.deepEqual(ser(o1), {
    argsString: '{"@qclass":"slot","index":0}',
    slots: [1],
  });
  // m now remembers that o1 is exported as 1
  t.deepEqual(ser(harden([o1, o1])), {
    argsString: '[{"@qclass":"slot","index":0},{"@qclass":"ibid","index":1}]',
    slots: [1],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    argsString: '[{"@qclass":"slot","index":0},{"@qclass":"slot","index":1}]',
    slots: [2, 1],
  });

  t.end();
});

test('deserialize imports', t => {
  const { m } = makeLiveSlots();
  const a = m.unserialize('{"@qclass":"slot","index":0}', [-1]);
  // a should be a proxy/presence. For now these are obvious.
  t.ok('_slotID_-1' in a);
  t.ok(Object.isFrozen(a));

  // m now remembers the proxy
  const b = m.unserialize('{"@qclass":"slot","index":0}', [-1]);
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = m.unserialize('{"@qclass":"slot","index":2}', ['x', 'x', -1]);
  t.is(a, c);

  t.end();
});

test('deserialize exports', t => {
  const { m } = makeLiveSlots();
  const o1 = harden({});
  m.serialize(o1); // allocates slot=1
  const a = m.unserialize('{"@qclass":"slot","index":0}', [1]);
  t.is(a, o1);

  t.end();
});

test('serialize imports', t => {
  const { m } = makeLiveSlots();
  const a = m.unserialize('{"@qclass":"slot","index":0}', [-1]);
  t.deepEqual(m.serialize(a), {
    argsString: '{"@qclass":"slot","index":0}',
    slots: [-1],
  });

  t.end();
});
