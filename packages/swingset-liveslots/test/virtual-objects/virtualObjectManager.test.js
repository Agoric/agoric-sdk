// @ts-nocheck
import test from 'ava';

import { kser, kslot } from '@agoric/kmarshal';
import {
  makeFakeVirtualObjectManager,
  makeFakeVirtualStuff,
} from '../../tools/fakeVirtualSupport.js';

import { vstr } from '../util.js';

function initThing(label = 'thing', counter = 0) {
  return { counter, label, resetCounter: 0 };
}
const thingBehavior = {
  inc({ state }) {
    state.counter += 1;
    return state.counter;
  },
  reset({ state }, newStart) {
    state.counter = newStart;
    state.resetCounter += 1;
    return state.resetCounter;
  },
  relabel({ state }, newLabel) {
    state.label = newLabel;
  },
  get({ state }) {
    return state.counter;
  },
  describe({ state }) {
    return `${state.label} counter has been reset ${state.resetCounter} times and is now ${state.counter}`;
  },
};

function thingVal(counter, label, resetCounter) {
  return JSON.stringify({
    counter: kser(counter),
    label: kser(label),
    resetCounter: kser(resetCounter),
  });
}

function multiThingVal(name, count) {
  return JSON.stringify({
    name: kser(name),
    count: kser(count),
  });
}

function minThing(label) {
  return thingVal(0, label, 0);
}

function initZot(arbitrary = 47, name = 'Bob', tag = 'say what?') {
  return { arbitrary, name, tag, count: 0 };
}
const zotBehavior = {
  sayHello({ state }, msg) {
    state.count += 1;
    return `${msg} ${state.name}`;
  },
  rename({ state }, newName) {
    state.name = newName;
    state.count += 1;
    return state.name;
  },
  getInfo({ state }) {
    state.count += 1;
    return `zot ${state.name} tag=${state.tag} count=${state.count} arbitrary=${state.arbitrary}`;
  },
};

function zotVal(arbitrary, name, tag, count) {
  return JSON.stringify({
    arbitrary: kser(arbitrary),
    name: kser(name),
    tag: kser(tag),
    count: kser(count),
  });
}

test('multifaceted virtual objects', t => {
  const log = [];
  const { defineKindMulti, flushStateCache } = makeFakeVirtualObjectManager({
    log,
  });

  const getName = ({ state }) => state.name;
  const getCount = ({ state }) => state.count;
  const makeMultiThing = defineKindMulti(
    'multithing',
    name => ({
      name,
      count: 0,
    }),
    {
      incr: {
        inc: ({ state }) => {
          state.count += 1;
        },
        getName,
        getCount,
      },
      decr: {
        dec: ({ state }) => {
          state.count -= 1;
        },
        getName,
        getCount,
      },
    },
  );
  const kid = 'o+v2';
  const { incr, decr } = makeMultiThing('foo');
  t.is(incr.getName(), 'foo');
  t.is(incr.getCount(), 0);
  t.is(decr.getName(), 'foo');
  t.is(decr.getCount(), 0);
  incr.inc();
  t.is(incr.getCount(), 1);
  incr.inc();
  t.is(incr.getCount(), 2);
  decr.dec();
  t.is(decr.getCount(), 1);
  const other = makeMultiThing('other');

  flushStateCache();
  t.deepEqual(log.splice(0), [
    `get idCounters => undefined`,
    `get kindIDID => undefined`,
    `set kindIDID 1`,
    `set vom.vkind.2.descriptor {"kindID":"2","tag":"multithing"}`,
    `set vom.${kid}/1 ${multiThingVal('foo', 1)}`,
    `set vom.${kid}/2 ${multiThingVal('other', 0)}`,
  ]);

  incr.inc();
  t.deepEqual(log.splice(0), [
    `get vom.${kid}/1 => ${multiThingVal('foo', 1)}`,
  ]);

  other.decr.dec();
  t.deepEqual(log.splice(0), [
    `get vom.${kid}/2 => ${multiThingVal('other', 0)}`,
  ]);

  incr.inc();
  t.deepEqual(log, []);

  flushStateCache();
  t.deepEqual(log.splice(0), [
    `set vom.${kid}/1 ${multiThingVal('foo', 3)}`,
    `set vom.${kid}/2 ${multiThingVal('other', -1)}`,
  ]);
  t.deepEqual(log, []);
});

test('single-faceted object definition fails with faceted behavior', t => {
  const { defineKind } = makeFakeVirtualObjectManager();
  // prettier-ignore
  t.throws(
    () => defineKind('multithing', null, { facetA: {}, facetB: {} }),
    { message: 'Check failed' },
  );
});

test('multi-faceted object definition fails with unfaceted behavior', t => {
  const { defineKindMulti } = makeFakeVirtualObjectManager();
  // prettier-ignore
  t.throws(
    () => defineKindMulti('singlething', null, { op: () => {} }),
    { message: 'Check failed' },
  );
});

// prettier-ignore
test('virtual object operations', t => {
  const log = [];
  const { defineKind, flushStateCache, dumpStore } = makeFakeVirtualObjectManager({ log });

  const makeThing = defineKind('thing', initThing, thingBehavior);
  const tid = 'o+v2';
  const makeZot = defineKind('zot', initZot, zotBehavior);
  const zid = 'o+v3';

  // phase 0: start
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"thing"}'],
    ['vom.vkind.3.descriptor', '{"kindID":"3","tag":"zot"}'],
  ]);

  // note: the "[t1-0].." comments show the expected cache contents,
  // with "*" meaning "dirty"

  // phase 1: object creations
  const thing1 = makeThing('thing-1'); // [t1-0*]
  // t1-0: 'thing-1' 0 0
  const thing2 = makeThing('thing-2', 100); // [t2-0* t1-0*]
  // t2-0: 'thing-2' 100 0
  const thing3 = makeThing('thing-3', 200); // [t3-0* t2-0* t1-0*]
  // t3-0: 'thing-3' 200 0
  const thing4 = makeThing('thing-4', 300); // [t4-0* t3-0* t2-0* t1-0*]
  // t4-0: 'thing-4' 300 0
  t.is(log.shift(), `get idCounters => undefined`);
  t.is(log.shift(), `get kindIDID => undefined`);
  t.is(log.shift(), `set kindIDID 1`);
  t.is(log.shift(), `set vom.vkind.2.descriptor {"kindID":"2","tag":"thing"}`);
  t.is(log.shift(), `set vom.vkind.3.descriptor {"kindID":"3","tag":"zot"}`);
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(0, 'thing-1', 0)}`);
  t.is(log.shift(), `set vom.${tid}/2 ${thingVal(100, 'thing-2', 0)}`);
  t.is(log.shift(), `set vom.${tid}/3 ${thingVal(200, 'thing-3', 0)}`);
  t.is(log.shift(), `set vom.${tid}/4 ${thingVal(300, 'thing-4', 0)}`);
  t.deepEqual(log, []);

  const zot1 = makeZot(23, 'Alice', 'is this on?'); // [z1-0*]
  // z1-0: 23 'Alice' 'is this on?' 0
  t.deepEqual(log, []);

  const zot2 = makeZot(29, 'Bob', 'what are you saying?'); // [z2-0* z1-0*]
  // z2-0: 29 'Bob' 'what are you saying?' 0
  t.deepEqual(log, []);

  const zot3 = makeZot(47, 'Carol', 'as if...'); // [z3-0* z2-0* z1-0*]
  // z3-0: 47 'Carol' 'as if...' 0
  t.deepEqual(log, []);

  const zot4 = makeZot(66, 'Dave', 'you and what army?'); // [z4-0* z3-0* z2-0* z1-0*]
  // z4-0: 66 'Dave' 'you and what army?' 0
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${zid}/1 ${zotVal(23, 'Alice', 'is this on?', 0)}`); // z1-0
  t.is(log.shift(), `set vom.${zid}/2 ${zotVal(29, 'Bob', 'what are you saying?', 0)}`); // z2-0
  t.is(log.shift(), `set vom.${zid}/3 ${zotVal(47, 'Carol', 'as if...', 0)}`); // z3-0
  t.is(log.shift(), `set vom.${zid}/4 ${zotVal(66, 'Dave', 'you and what army?', 0)}`); // z4-0
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(0, 'thing-1', 0)], // =t1-0
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    [`vom.${tid}/3`, thingVal(200, 'thing-3', 0)], // =t3-0
    [`vom.${tid}/4`, thingVal(300, 'thing-4', 0)], // =t4-0
    [`vom.${zid}/1`, zotVal(23, 'Alice', 'is this on?', 0)], // =z1-0
    [`vom.${zid}/2`, zotVal(29, 'Bob', 'what are you saying?', 0)], // =z2-0
    [`vom.${zid}/3`, zotVal(47, 'Carol', 'as if...', 0)], // =z3-0
    [`vom.${zid}/4`, zotVal(66, 'Dave', 'you and what army?', 0)], // =z4-0
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"thing"}'],
    ['vom.vkind.3.descriptor', '{"kindID":"3","tag":"zot"}'],
  ]);

  // phase 2: first batch-o-stuff
  // t1-0 -> t1-1
  t.is(thing1.inc(), 1); // [t1-1*]
  t.is(log.shift(), `get vom.${tid}/1 => ${thingVal(0, 'thing-1', 0)}`); // load t1-0
  t.deepEqual(log, []);

  // z1-0 -> z1-1
  t.is(zot1.sayHello('hello'), 'hello Alice'); // [t1-1* z1-1*]
  t.is(log.shift(), `get vom.${zid}/1 => ${zotVal(23, 'Alice', 'is this on?', 0)}`); // load z1-0
  t.deepEqual(log, []);

  // t1-1 -> t1-2 (no load, already in cache)
  t.is(thing1.inc(), 2); // [t1-2* z1-1*]
  t.deepEqual(log, []);

  // z2-0 -> z2-1
  t.is(zot2.sayHello('hi'), 'hi Bob'); // [t1-2* z1-1* z2-1*]
  t.is(log.shift(), `get vom.${zid}/2 => ${zotVal(29, 'Bob', 'what are you saying?', 0)}`); // load z2-0
  t.deepEqual(log, []);

  // t1-2 -> t1-3
  t.is(thing1.inc(), 3); // [t1-3* z1-1* z2-1*]
  t.deepEqual(log, []);

  // z3-0 -> z3-1
  t.is(zot3.sayHello('aloha'), 'aloha Carol'); // [t1-3* z1-1* z2-1* z3-1*]
  t.is(log.shift(), `get vom.${zid}/3 => ${zotVal(47, 'Carol', 'as if...', 0)}`); // load z3-0
  t.deepEqual(log, []);

  // z4-0 -> z4-1
  t.is(zot4.sayHello('bonjour'), 'bonjour Dave'); // [t1-3* z1-1* z2-1* z3-1* z4-1*]
  t.is(log.shift(), `get vom.${zid}/4 => ${zotVal(66, 'Dave', 'you and what army?', 0)}`); // load z4-0
  t.deepEqual(log, []);

  // z1-1 -> z1-2
  t.is(zot1.sayHello('hello again'), 'hello again Alice'); // [t1-3* z1-2* z2-1* z3-1* z4-1*]
  t.deepEqual(log, []);

  // read t2-0
  t.is(
    thing2.describe(),
    'thing-2 counter has been reset 0 times and is now 100',
  );
  // [t1-3* t2-0 z1-2* z2-1* z3-1* z4-1*]
  t.is(log.shift(), `get vom.${tid}/2 => ${thingVal(100, 'thing-2', 0)}`); // load t2-0
  t.deepEqual(log, []);

  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(3, 'thing-1', 0)}`); // write t1-3
  t.is(log.shift(), `set vom.${zid}/1 ${zotVal(23, 'Alice', 'is this on?', 2)}`); // write z1-2
  t.is(log.shift(), `set vom.${zid}/2 ${zotVal(29, 'Bob', 'what are you saying?', 1)}`); // write z2-1
  t.is(log.shift(), `set vom.${zid}/3 ${zotVal(47, 'Carol', 'as if...', 1)}`); // write z3-1
  t.is(log.shift(), `set vom.${zid}/4 ${zotVal(66, 'Dave', 'you and what army?', 1)}`); // write z4-1
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(3, 'thing-1', 0)], // =t1-3
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    [`vom.${tid}/3`, thingVal(200, 'thing-3', 0)], // =t3-0
    [`vom.${tid}/4`, thingVal(300, 'thing-4', 0)], // =t4-0
    [`vom.${zid}/1`, zotVal(23, 'Alice', 'is this on?', 2)], // =z1-2
    [`vom.${zid}/2`, zotVal(29, 'Bob', 'what are you saying?', 1)], // =z2-1
    [`vom.${zid}/3`, zotVal(47, 'Carol', 'as if...', 1)], // =z3-1
    [`vom.${zid}/4`, zotVal(66, 'Dave', 'you and what army?', 1)], // =z4-1
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"thing"}'],
    ['vom.vkind.3.descriptor', '{"kindID":"3","tag":"zot"}'],
  ]);

  // phase 3: second batch-o-stuff
  // read t1-3
  t.is(thing1.get(), 3); // [t1-3]
  t.is(log.shift(), `get vom.${tid}/1 => ${thingVal(3, 'thing-1', 0)}`); // load t1-3
  t.deepEqual(log, []);

  // t1-3 -> t1-4
  t.is(thing1.inc(), 4); // [t1-4*]
  t.deepEqual(log, []);

  // t4-0 -> t4-1
  t.is(thing4.reset(1000), 1); // [t1-4* t4-1*]
  t.is(log.shift(), `get vom.${tid}/4 => ${thingVal(300, 'thing-4', 0)}`); // load t4-0
  t.deepEqual(log, []);

  // z3-1 -> z3-2
  t.is(zot3.rename('Chester'), 'Chester'); // [t1-4* t4-1* z3-2*]
  t.is(log.shift(), `get vom.${zid}/3 => ${zotVal(47, 'Carol', 'as if...', 1)}`); // load z3-1
  t.deepEqual(log, []);

  // z1-2 -> z1-3
  t.is(zot1.getInfo(), 'zot Alice tag=is this on? count=3 arbitrary=23'); // [t1-4* t4-1* z1-3* z3-2*]
  t.is(log.shift(), `get vom.${zid}/1 => ${zotVal(23, 'Alice', 'is this on?', 2)}`); // load z1-2
  t.deepEqual(log, []);

  // z2-1 -> z2-2
  t.is(zot2.getInfo(), 'zot Bob tag=what are you saying? count=2 arbitrary=29'); // [t1-4* t4-1* z1-3* z2-2* z3-2*]
  t.is(log.shift(), `get vom.${zid}/2 => ${zotVal(29, 'Bob', 'what are you saying?', 1)}`); // load z2-1
  t.deepEqual(log, []);

  // read t2-0
  t.is(
    thing2.describe(),
    'thing-2 counter has been reset 0 times and is now 100',
  );
  // [t1-4* t2-0 t4-1* z1-3* z2-2* z3-2*]
  t.is(log.shift(), `get vom.${tid}/2 => ${thingVal(100, 'thing-2', 0)}`); // load t2-0
  t.deepEqual(log, []);

  // z3-2 -> z3-3, already in cache
  t.is(zot3.getInfo(), 'zot Chester tag=as if... count=3 arbitrary=47');
  // [t1-4* t2-0 t4-1* z1-3* z2-2* z3-3*]
  t.deepEqual(log, []);

  // read z4-1
  t.is(zot4.getInfo(), 'zot Dave tag=you and what army? count=2 arbitrary=66');
  // [t1-4* t2-0 t4-1* z1-3* z2-2* z3-3* z4-1]
  t.is(log.shift(), `get vom.${zid}/4 => ${zotVal(66, 'Dave', 'you and what army?', 1)}`); // load z4-1
  t.deepEqual(log, []);

  // t3-0 -> t3-1
  t.is(thing3.inc(), 201);
  // [t1-4* t2-0 t3-1* t4-1* z1-3* z2-2* z3-3* z4-1]
  t.is(log.shift(), `get vom.${tid}/3 => ${thingVal(200, 'thing-3', 0)}`); // load t3-0
  t.deepEqual(log, []);

  // read t4-1, already in cache
  t.is(
    thing4.describe(),
    'thing-4 counter has been reset 1 times and is now 1000',
  );
  // [t1-4* t2-0 t3-1* t4-1* z1-3* z2-2* z3-3* z4-1]
  t.deepEqual(log, []);

  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(4, 'thing-1', 0)}`); // write t1-4
  // t2-0 is not written because t2 is not dirty
  t.is(log.shift(), `set vom.${tid}/3 ${thingVal(201, 'thing-3', 0)}`); // write t3-1
  t.is(log.shift(), `set vom.${tid}/4 ${thingVal(1000, 'thing-4', 1)}`); // write t4-1
  t.is(log.shift(), `set vom.${zid}/1 ${zotVal(23, 'Alice', 'is this on?', 3)}`); // write z1-3
  t.is(log.shift(), `set vom.${zid}/2 ${zotVal(29, 'Bob', 'what are you saying?', 2)}`); // write z2-2
  t.is(log.shift(), `set vom.${zid}/3 ${zotVal(47, 'Chester', 'as if...', 3)}`); // write z3-3
  t.is(log.shift(), `set vom.${zid}/4 ${zotVal(66, 'Dave', 'you and what army?', 2)}`); // write z4-2
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(4, 'thing-1', 0)], // =t1-4
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    [`vom.${tid}/3`, thingVal(201, 'thing-3', 0)], // =t3-1
    [`vom.${tid}/4`, thingVal(1000, 'thing-4', 1)], // =t4-1
    [`vom.${zid}/1`, zotVal(23, 'Alice', 'is this on?', 3)], // =z1-3
    [`vom.${zid}/2`, zotVal(29, 'Bob', 'what are you saying?', 2)], // =z2-2
    [`vom.${zid}/3`, zotVal(47, 'Chester', 'as if...', 3)], // =z3-3
    [`vom.${zid}/4`, zotVal(66, 'Dave', 'you and what army?', 2)], // =z4-2
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"thing"}'],
    ['vom.vkind.3.descriptor', '{"kindID":"3","tag":"zot"}'],
  ]);

  // phase 4
  // t1-4 -> t1-5
  t.is(thing1.inc(), 5); // [t1-5*]
  t.is(log.shift(), `get vom.${tid}/1 => ${thingVal(4, 'thing-1', 0)}`); // load t1-4
  t.deepEqual(log, []);

  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(5, 'thing-1', 0)}`); // evict t1-5
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(5, 'thing-1', 0)], // =t1-5
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    [`vom.${tid}/3`, thingVal(201, 'thing-3', 0)], // =t3-1
    [`vom.${tid}/4`, thingVal(1000, 'thing-4', 1)], // =t4-1
    [`vom.${zid}/1`, zotVal(23, 'Alice', 'is this on?', 3)], // =z1-3
    [`vom.${zid}/2`, zotVal(29, 'Bob', 'what are you saying?', 2)], // =z2-2
    [`vom.${zid}/3`, zotVal(47, 'Chester', 'as if...', 3)], // =z3-3
    [`vom.${zid}/4`, zotVal(66, 'Dave', 'you and what army?', 2)], // =z4-2
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"thing"}'],
    ['vom.vkind.3.descriptor', '{"kindID":"3","tag":"zot"}'],
  ]);
});

test('symbol named methods', t => {
  const log = [];
  const { defineKind, flushStateCache, dumpStore } =
    makeFakeVirtualObjectManager({
      log,
    });

  const IncSym = Symbol.for('incsym');

  const symThingBehavior = {
    [IncSym]({ state }) {
      state.counter += 1;
      return state.counter;
    },
    get({ state }) {
      return state.counter;
    },
  };

  const makeThing = defineKind('symthing', initThing, symThingBehavior);
  const tid = 'o+v2';

  // phase 0: start
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"symthing"}'],
  ]);

  // phase 1: object creations
  const thing1 = makeThing('thing-1'); // [t1-0*]
  // t1-0: 'thing-1' 0 0
  const thing2 = makeThing('thing-2', 100); // [t1-0* t2-0*]
  // t2-0: 'thing-2' 100 0
  t.is(log.shift(), `get idCounters => undefined`);
  t.is(log.shift(), `get kindIDID => undefined`);
  t.is(log.shift(), `set kindIDID 1`);
  t.is(
    log.shift(),
    `set vom.vkind.2.descriptor {"kindID":"2","tag":"symthing"}`,
  );
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(0, 'thing-1', 0)}`); // write t1-0
  t.is(log.shift(), `set vom.${tid}/2 ${thingVal(100, 'thing-2', 0)}`); // write t2-0
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(0, 'thing-1', 0)], // =t1-0
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"symthing"}'],
  ]);

  // phase 2: call symbol-named method on thing1
  t.is(thing1[IncSym](), 1); // [t1-1*]
  t.is(log.shift(), `get vom.${tid}/1 => ${thingVal(0, 'thing-1', 0)}`); // load t1-0
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/1 ${thingVal(1, 'thing-1', 0)}`); // write t1-1
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(1, 'thing-1', 0)], // =t1-1
    [`vom.${tid}/2`, thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"symthing"}'],
  ]);

  // phase 3: call symbol-named method on thing2
  t.is(thing2[IncSym](), 101); // [t2-1*]
  t.is(log.shift(), `get vom.${tid}/2 => ${thingVal(100, 'thing-2', 0)}`); // load t2-0
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${tid}/2 ${thingVal(101, 'thing-2', 0)}`); // write t2-1
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    [`vom.${tid}/1`, thingVal(1, 'thing-1', 0)], // =t1-1
    [`vom.${tid}/2`, thingVal(101, 'thing-2', 0)], // =t2-1
    ['vom.vkind.2.descriptor', '{"kindID":"2","tag":"symthing"}'],
  ]);
});

test('virtual object cycles using the finish function', t => {
  const { vom } = makeFakeVirtualStuff();
  const { defineKind } = vom;

  const makeOtherThing = defineKind(
    'otherThing',
    (name, firstThing) => ({ name, firstThing }),
    {
      getName: ({ state }) => state.name,
      getFirstThing: ({ state }) => state.firstThing,
    },
  );
  const makeFirstThing = defineKind(
    'firstThing',
    name => ({
      name,
      otherThing: undefined,
    }),
    {
      getName: ({ state }) => state.name,
      getOtherThing: ({ state }) => state.otherThing,
    },
    {
      finish: ({ state, self }) => {
        state.otherThing = makeOtherThing(`${state.name}'s other thing`, self);
      },
    },
  );

  const thing = makeFirstThing('foo');
  t.is(thing.getName(), 'foo');
  t.is(thing.getOtherThing().getName(), `foo's other thing`);
  t.is(thing.getOtherThing().getFirstThing(), thing);
});

test('durable kind IDs cannot be reused', t => {
  const { vom } = makeFakeVirtualStuff();
  const { makeKindHandle, defineDurableKind } = vom;

  const kindHandle = makeKindHandle('testkind');
  defineDurableKind(kindHandle, initThing, thingBehavior);
  t.throws(() => defineDurableKind(kindHandle, initThing, thingBehavior), {
    message: 'redefinition of durable kind "testkind"',
  });
});

test('durable kind IDs can be reanimated', t => {
  const log = [];
  const { vom, vrm, cm, fakeStuff } = makeFakeVirtualStuff({
    log,
  });
  const { makeKindHandle, defineDurableKind, flushStateCache } = vom;
  const { isVirtualObjectReachable } = vrm;
  const { makeScalarBigMapStore } = cm;
  const { deleteEntry } = fakeStuff;

  // Make a persistent place to put the durable kind ID
  const placeToPutIt = makeScalarBigMapStore();
  // Not verifying here that makeScalarBigMapStore worked -- it's tested elsewhere
  log.length = 0;

  // Create a durable kind ID, but don't use it yet
  let kindHandle = makeKindHandle('testkind');
  t.is(
    log.shift(),
    'set vom.dkind.10.descriptor {"kindID":"10","tag":"testkind"}',
  );
  t.is(log.shift(), 'set vom.dkind.10.nextID 1');
  t.deepEqual(log, []);
  const khid = `o+d1/10`;
  const kind = kslot(khid, 'kind');

  // Store it in the store without having used it
  placeToPutIt.init('savedKindID', kindHandle);
  t.is(log.shift(), 'get vc.4.ssavedKindID => undefined');
  t.is(log.shift(), `get vom.rc.${khid} => undefined`);
  t.is(log.shift(), `set vom.rc.${khid} 1`);
  t.is(log.shift(), `set vc.4.ssavedKindID ${vstr(kind)}`);
  t.is(log.shift(), 'get vc.4.|entryCount => 0');
  t.is(log.shift(), 'set vc.4.|entryCount 1');
  t.deepEqual(log, []);

  // Forget its Representative
  kindHandle = null;
  deleteEntry(khid);
  t.deepEqual(log, []);
  t.truthy(isVirtualObjectReachable(khid));
  t.is(log.shift(), `get vom.rc.${khid} => 1`);
  t.is(log.shift(), `get vom.es.${khid} => undefined`);
  t.deepEqual(log, []);

  // Fetch it from the store, which should reanimate it
  const fetchedKindID = placeToPutIt.get('savedKindID');
  t.is(log.shift(), `get vc.4.ssavedKindID => ${vstr(kind)}`);
  t.is(
    log.shift(),
    'get vom.dkind.10.descriptor => {"kindID":"10","tag":"testkind"}',
  );
  t.is(log.shift(), 'get vom.dkind.10.nextID => 1');
  t.deepEqual(log, []);

  // Use it now, to define a durable kind
  const makeThing = defineDurableKind(fetchedKindID, initThing, thingBehavior);
  t.is(
    log.shift(),
    'set vom.dkind.10.descriptor {"kindID":"10","tag":"testkind","unfaceted":true,"stateShapeCapData":{"body":"#\\"#undefined\\"","slots":[]}}',
  );
  t.deepEqual(log, []);

  // Make an instance of the new kind, just to be sure it's there
  makeThing('laterThing');
  flushStateCache();
  t.is(log.shift(), 'set vom.dkind.10.nextID 2');
  t.is(log.shift(), `set vom.o+d10/1 ${thingVal(0, 'laterThing', 0)}`);
  t.deepEqual(log, []);
});

test('virtual object gc', t => {
  const log = [];
  const { vom, vrm, fakeStuff } = makeFakeVirtualStuff({ log });
  const { defineKind, flushStateCache } = vom;
  const { setExportStatus, deleteVirtualObject, isVirtualObjectReachable } =
    vrm;
  const { deleteEntry, dumpStore } = fakeStuff;

  const makeThing = defineKind('thing', initThing, thingBehavior);
  const tbase = 'o+v10';
  const makeRef = defineKind('ref', value => ({ value }), {
    setVal: ({ state }, value) => {
      state.value = value;
    },
  });

  t.is(log.shift(), `get idCounters => undefined`);
  t.is(log.shift(), `get kindIDID => undefined`);
  t.is(log.shift(), `set kindIDID 1`);
  const skit = [
    'storeKindIDTable',
    '{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}',
  ];
  t.is(log.shift(), `get storeKindIDTable => undefined`);
  t.is(log.shift(), `set ${skit[0]} ${skit[1]}`);
  t.is(log.shift(), 'set vc.1.|nextOrdinal 1');
  t.is(log.shift(), 'set vc.1.|entryCount 0');
  t.is(log.shift(), 'get watcherTableID => undefined');
  t.is(log.shift(), 'set vc.2.|nextOrdinal 1');
  t.is(log.shift(), 'set vc.2.|entryCount 0');
  t.is(log.shift(), 'set watcherTableID o+d6/2');
  t.is(log.shift(), 'get vom.rc.o+d6/2 => undefined');
  t.is(log.shift(), 'set vom.rc.o+d6/2 1');
  t.is(log.shift(), 'get watchedPromiseTableID => undefined');
  t.is(log.shift(), 'set vc.3.|nextOrdinal 1');
  t.is(log.shift(), 'set vc.3.|entryCount 0');
  t.is(log.shift(), 'set watchedPromiseTableID o+d6/3');
  t.is(log.shift(), 'get vom.rc.o+d6/3 => undefined');
  t.is(log.shift(), 'set vom.rc.o+d6/3 1');
  t.is(
    log.shift(),
    'set vom.vkind.10.descriptor {"kindID":"10","tag":"thing"}',
  );
  t.is(log.shift(), `set vom.vkind.11.descriptor {"kindID":"11","tag":"ref"}`);
  t.deepEqual(log, []);

  // make a bunch of things which we'll use
  // all virtual objects are born locally ref'd
  const things = [];
  for (let i = 1; i <= 9; i += 1) {
    things.push(makeThing(`thing #${i}`));
  }
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `set vom.${tbase}/1 ${minThing('thing #1')}`);
  t.is(log.shift(), `set vom.${tbase}/2 ${minThing('thing #2')}`);
  t.is(log.shift(), `set vom.${tbase}/3 ${minThing('thing #3')}`);
  t.is(log.shift(), `set vom.${tbase}/4 ${minThing('thing #4')}`);
  t.is(log.shift(), `set vom.${tbase}/5 ${minThing('thing #5')}`);
  t.is(log.shift(), `set vom.${tbase}/6 ${minThing('thing #6')}`);
  t.is(log.shift(), `set vom.${tbase}/7 ${minThing('thing #7')}`);
  t.is(log.shift(), `set vom.${tbase}/8 ${minThing('thing #8')}`);
  t.is(log.shift(), `set vom.${tbase}/9 ${minThing('thing #9')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.${tbase}/1`, minThing('thing #1')],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // This is what the finalizer would do if the local reference was dropped and GC'd
  function pretendGC(vref, shouldDelete) {
    deleteEntry(vref);
    t.is(!!isVirtualObjectReachable(vref), !shouldDelete);
    if (shouldDelete) {
      deleteVirtualObject(vref);
    }
  }

  // case 1: export, drop local ref, drop export
  // export
  setExportStatus(`${tbase}/1`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/1 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/1 r`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because exported
  pretendGC(`${tbase}/1`, false);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/1 => r`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.es.${tbase}/1`, 'r'],
    [`vom.${tbase}/1`, minThing('thing #1')],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // drop export -- should delete
  setExportStatus(`${tbase}/1`, 'recognizable');
  t.is(log.shift(), `get vom.es.${tbase}/1 => r`);
  t.is(log.shift(), `set vom.es.${tbase}/1 s`);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.deepEqual(log, []);
  pretendGC(`${tbase}/1`, true);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/1 => s`);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/1 => s`);
  t.is(log.shift(), `get vom.${tbase}/1 => ${thingVal(0, 'thing #1', 0)}`);
  t.is(log.shift(), `delete vom.rc.${tbase}/1`);
  t.is(log.shift(), `delete vom.es.${tbase}/1`);
  // This getNextKey is looking for vom.ir records (things which
  // recognize the dropped object, to notify them of its
  // retirement). It doesn't find any, and getNextKey reports the next
  // lexicographic key, which happens to be the vom.${tbase}/1 data
  // record itself, because that doesn't get deleted until a flush
  t.is(log.shift(), `getNextKey vom.ir.${tbase}/1| => vom.${tbase}/1`);
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `delete vom.${tbase}/1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // case 2: export, drop export, drop local ref
  // export
  setExportStatus(`${tbase}/2`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/2 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/2 r`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd locally
  setExportStatus(`${tbase}/2`, 'recognizable');
  t.is(log.shift(), `get vom.es.${tbase}/2 => r`);
  t.is(log.shift(), `set vom.es.${tbase}/2 s`);
  t.is(log.shift(), `get vom.rc.${tbase}/2 => undefined`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.es.${tbase}/2`, 's'],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // drop local ref -- should delete
  pretendGC(`${tbase}/2`, true);
  t.is(log.shift(), `get vom.rc.${tbase}/2 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/2 => s`);
  t.is(log.shift(), `get vom.rc.${tbase}/2 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/2 => s`);
  t.is(log.shift(), `get vom.${tbase}/2 => ${thingVal(0, 'thing #2', 0)}`);
  t.is(log.shift(), `delete vom.rc.${tbase}/2`);
  t.is(log.shift(), `delete vom.es.${tbase}/2`);
  t.is(log.shift(), `getNextKey vom.ir.${tbase}/2| => vom.${tbase}/2`);
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `delete vom.${tbase}/2`);
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // case 3: drop local ref with no prior export
  // drop local ref -- should delete
  pretendGC(`${tbase}/3`, true);
  t.is(log.shift(), `get vom.rc.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.rc.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.${tbase}/3 => ${thingVal(0, 'thing #3', 0)}`);
  t.is(log.shift(), `delete vom.rc.${tbase}/3`);
  t.is(log.shift(), `delete vom.es.${tbase}/3`);
  t.is(log.shift(), `getNextKey vom.ir.${tbase}/3| => vom.${tbase}/3`);
  t.deepEqual(log, []);
  flushStateCache();
  t.is(log.shift(), `delete vom.${tbase}/3`);
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);

  // case 4: ref virtually, export, drop local ref, drop export
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref1 = makeRef(things[3]);
  t.is(log.shift(), `get vom.rc.${tbase}/4 => undefined`);
  t.is(log.shift(), `set vom.rc.${tbase}/4 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    [`vom.rc.${tbase}/4`, '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);
  // export
  setExportStatus(`${tbase}/4`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/4 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/4 r`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC(`${tbase}/4`, false);
  t.is(log.shift(), `get vom.rc.${tbase}/4 => 1`);
  t.is(log.shift(), `get vom.es.${tbase}/4 => r`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd virtually
  setExportStatus(`${tbase}/4`, 'recognizable');
  t.is(log.shift(), `get vom.es.${tbase}/4 => r`);
  t.is(log.shift(), `set vom.es.${tbase}/4 s`);
  t.is(log.shift(), `get vom.rc.${tbase}/4 => 1`);
  t.deepEqual(log, []);

  // case 5: export, ref virtually, drop local ref, drop export
  // export
  setExportStatus(`${tbase}/5`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/5 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/5 r`);
  t.deepEqual(log, []);
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref2 = makeRef(things[4]);
  t.is(log.shift(), `get vom.rc.${tbase}/5 => undefined`);
  t.is(log.shift(), `set vom.rc.${tbase}/5 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 'r'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC(`${tbase}/5`, false);
  t.is(log.shift(), `get vom.rc.${tbase}/5 => 1`);
  t.is(log.shift(), `get vom.es.${tbase}/5 => r`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd virtually
  setExportStatus(`${tbase}/5`, 'recognizable');
  t.is(log.shift(), `get vom.es.${tbase}/5 => r`);
  t.is(log.shift(), `set vom.es.${tbase}/5 s`);
  t.is(log.shift(), `get vom.rc.${tbase}/5 => 1`);
  t.deepEqual(log, []);

  // case 6: ref virtually, drop local ref
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref3 = makeRef(things[5]);
  t.is(log.shift(), `get vom.rc.${tbase}/6 => undefined`);
  t.is(log.shift(), `set vom.rc.${tbase}/6 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 's'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
    [`vom.rc.${tbase}/6`, '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);
  // drop local ref -- should not delete because ref'd virtually
  pretendGC(`${tbase}/6`, false);
  t.is(log.shift(), `get vom.rc.${tbase}/6 => 1`);
  t.is(log.shift(), `get vom.es.${tbase}/6 => undefined`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['kindIDID', '1'],
    skit,
    ['vc.1.|entryCount', '0'],
    ['vc.1.|nextOrdinal', '1'],
    ['vc.2.|entryCount', '0'],
    ['vc.2.|nextOrdinal', '1'],
    ['vc.3.|entryCount', '0'],
    ['vc.3.|nextOrdinal', '1'],
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 's'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.${tbase}/9`, minThing('thing #9')],
    ['vom.rc.o+d6/2', '1'],
    ['vom.rc.o+d6/3', '1'],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
    [`vom.rc.${tbase}/6`, '1'],
    ['vom.vkind.10.descriptor', '{"kindID":"10","tag":"thing"}'],
    ['vom.vkind.11.descriptor', '{"kindID":"11","tag":"ref"}'],
    ['watchedPromiseTableID', 'o+d6/3'],
    ['watcherTableID', 'o+d6/2'],
  ]);
});

test('weak store operations', t => {
  const { vom, cm } = makeFakeVirtualStuff();
  const { defineKind } = vom;
  const { makeScalarBigWeakMapStore } = cm;

  const makeThing = defineKind('thing', initThing, thingBehavior);
  const makeZot = defineKind('zot', initZot, zotBehavior);

  const thing1 = makeThing('t1');
  const thing2 = makeThing('t2');

  const zot1 = makeZot(1, 'z1');
  const zot2 = makeZot(2, 'z2');
  const zot3 = makeZot(3, 'z3');
  const zot4 = makeZot(4, 'z4');

  const ws1 = makeScalarBigWeakMapStore();
  const ws2 = makeScalarBigWeakMapStore();
  const nv1 = 'a';
  const nv2 = 'b';
  ws1.init(zot1, 'zot #1');
  ws2.init(zot2, 'zot #2');
  ws1.init(zot3, 'zot #3');
  ws2.init(zot4, 'zot #4');
  ws1.init(thing1, 'thing #1');
  ws2.init(thing2, 'thing #2');
  ws1.init(nv1, 'non-virtual object #1');
  ws1.init(nv2, 'non-virtual object #2');
  t.is(ws1.get(zot1), 'zot #1');
  t.is(ws1.has(zot1), true);
  t.is(ws2.has(zot1), false);
  ws1.set(zot3, 'zot #3 revised');
  ws2.delete(zot4);
  t.is(ws1.get(nv1), 'non-virtual object #1');
  t.is(ws1.get(nv2), 'non-virtual object #2');
  t.is(ws2.has(zot4), false);
  t.is(ws1.get(zot3), 'zot #3 revised');
  ws1.delete(nv1);
  t.is(ws1.has(nv1), false);
  ws1.set(nv2, 'non-virtual object #2 revised');
  t.is(ws1.get(nv2), 'non-virtual object #2 revised');
});

test('virtualized weak collection operations', t => {
  // TODO: don't yet have a way to test the weakness of the virtualized weak
  // collections

  const { VirtualObjectAwareWeakMap, VirtualObjectAwareWeakSet, defineKind } =
    makeFakeVirtualObjectManager();

  const makeThing = defineKind('thing', initThing, thingBehavior);
  const makeZot = defineKind('zot', initZot, zotBehavior);

  const thing1 = makeThing('t1');
  const thing2 = makeThing('t2');

  const zot1 = makeZot(1, 'z1');
  const zot2 = makeZot(2, 'z2');
  const zot3 = makeZot(3, 'z3');
  const zot4 = makeZot(4, 'z4');

  const wm1 = new VirtualObjectAwareWeakMap();
  const wm2 = new VirtualObjectAwareWeakMap();
  const nv1 = {};
  const nv2 = { a: 47 };
  wm1.set(zot1, 'zot #1');
  wm2.set(zot2, 'zot #2');
  wm1.set(zot3, 'zot #3');
  wm2.set(zot4, 'zot #4');
  wm1.set(thing1, 'thing #1');
  wm2.set(thing2, 'thing #2');
  wm1.set(nv1, 'non-virtual object #1');
  wm1.set(nv2, 'non-virtual object #2');
  t.is(wm1.get(zot1), 'zot #1');
  t.is(wm1.has(zot1), true);
  t.is(wm2.has(zot1), false);
  wm1.set(zot3, 'zot #3 revised');
  wm2.delete(zot4);
  t.is(wm1.get(nv1), 'non-virtual object #1');
  t.is(wm1.get(nv2), 'non-virtual object #2');
  t.is(wm2.has(zot4), false);
  t.is(wm1.get(zot3), 'zot #3 revised');
  wm1.delete(nv1);
  t.is(wm1.has(nv1), false);
  wm1.set(nv2, 'non-virtual object #2 revised');
  t.is(wm1.get(nv2), 'non-virtual object #2 revised');

  const ws1 = new VirtualObjectAwareWeakSet();
  const ws2 = new VirtualObjectAwareWeakSet();
  ws1.add(zot1);
  ws2.add(zot2);
  ws1.add(zot3);
  ws2.add(zot4);
  ws1.add(thing1);
  ws2.add(thing2);
  ws1.add(nv1);
  ws1.add(nv2);
  t.is(ws1.has(zot1), true);
  t.is(ws2.has(zot1), false);
  ws1.add(zot3);
  ws2.delete(zot4);
  t.is(ws1.has(nv1), true);
  t.is(ws1.has(nv2), true);
  t.is(ws2.has(nv1), false);
  t.is(ws2.has(nv2), false);
  t.is(ws2.has(zot4), false);
  t.is(ws1.has(zot3), true);
  ws1.delete(nv1);
  t.is(ws1.has(nv1), false);
  ws1.add(nv2);
  t.is(ws1.has(nv2), true);
});
