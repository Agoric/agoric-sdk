import { test } from '../../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import { Far } from '@agoric/marshal';
import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualObjectManager';

function capdata(body, slots = []) {
  return harden({ body, slots });
}
const s = JSON.stringify;

function makeThingInstance(state) {
  return {
    init(label = 'thing', counter = 0) {
      state.counter = counter;
      state.label = label;
      state.resetCounter = 0;
    },
    self: Far('thing', {
      inc() {
        state.counter += 1;
        return state.counter;
      },
      reset(newStart) {
        state.counter = newStart;
        state.resetCounter += 1;
        return state.resetCounter;
      },
      relabel(newLabel) {
        state.label = newLabel;
      },
      get() {
        return state.counter;
      },
      describe() {
        return `${state.label} counter has been reset ${state.resetCounter} times and is now ${state.counter}`;
      },
    }),
  };
}

function makeZotInstance(state) {
  return {
    init(arbitrary = 47, name = 'Bob', tag = 'say what?') {
      state.arbitrary = arbitrary;
      state.name = name;
      state.tag = tag;
      state.count = 0;
    },
    self: Far('zot', {
      sayHello(msg) {
        state.count += 1;
        return `${msg} ${state.name}`;
      },
      rename(newName) {
        state.name = newName;
        state.count += 1;
        return state.name;
      },
      getInfo() {
        state.count += 1;
        return `zot ${state.name} tag=${state.tag} count=${state.count} arbitrary=${state.arbitrary}`;
      },
    }),
  };
}

test('virtual object operations', t => {
  const { makeKind, flushCache, dumpStore } = makeFakeVirtualObjectManager(3);

  const thingMaker = makeKind(makeThingInstance);
  const zotMaker = makeKind(makeZotInstance);

  // phase 0: start
  t.deepEqual(dumpStore(), []);

  // phase 1: object creations
  const thing1 = thingMaker('thing-1');
  const thing2 = thingMaker('thing-2', 100);
  const thing3 = thingMaker('thing-3', 200);
  const thing4 = thingMaker('thing-4', 300);

  const zot1 = zotMaker(23, 'Alice', 'is this on?');
  const zot2 = zotMaker(29, 'Bob', 'what are you saying?');
  const zot3 = zotMaker(47, 'Carol', 'as if...');
  const zot4 = zotMaker(66, 'Dave', 'you and what army?');

  // prettier-ignore
  t.deepEqual(dumpStore(), [
    ['o+1/1', s({counter:capdata('0'),label:capdata('"thing-1"'),resetCounter:capdata('0')})],
    ['o+1/2', s({counter:capdata('100'),label:capdata('"thing-2"'),resetCounter:capdata('0')})],
    ['o+1/3', s({counter:capdata('200'),label:capdata('"thing-3"'),resetCounter:capdata('0')})],
    ['o+1/4', s({counter:capdata('300'),label:capdata('"thing-4"'),resetCounter:capdata('0')})],
  ]);

  // phase 2: first batch-o-stuff
  t.is(thing1.inc(), 1);
  t.is(zot1.sayHello('hello'), 'hello Alice');
  t.is(thing1.inc(), 2);
  t.is(zot2.sayHello('hi'), 'hi Bob');
  t.is(thing1.inc(), 3);
  t.is(zot3.sayHello('aloha'), 'aloha Carol');
  t.is(zot4.sayHello('bonjour'), 'bonjour Dave');
  t.is(zot1.sayHello('hello again'), 'hello again Alice');
  t.is(
    thing2.describe(),
    'thing-2 counter has been reset 0 times and is now 100',
  );
  // prettier-ignore
  t.deepEqual(dumpStore(), [
    ['o+1/1', s({counter:capdata('3'),label:capdata('"thing-1"'),resetCounter:capdata('0')})],
    ['o+1/2', s({counter:capdata('100'),label:capdata('"thing-2"'),resetCounter:capdata('0')})],
    ['o+1/3', s({counter:capdata('200'),label:capdata('"thing-3"'),resetCounter:capdata('0')})],
    ['o+1/4', s({counter:capdata('300'),label:capdata('"thing-4"'),resetCounter:capdata('0')})],
    ['o+2/1', s({arbitrary:capdata('23'),name:capdata('"Alice"'),tag:capdata('"is this on?"'),count:capdata('2')})],
    ['o+2/2', s({arbitrary:capdata('29'),name:capdata('"Bob"'),tag:capdata('"what are you saying?"'),count:capdata('0')})],
    ['o+2/3', s({arbitrary:capdata('47'),name:capdata('"Carol"'),tag:capdata('"as if..."'),count:capdata('0')})],
    ['o+2/4', s({arbitrary:capdata('66'),name:capdata('"Dave"'),tag:capdata('"you and what army?"'),count:capdata('0')})],
  ]);

  // phase 3: second batch-o-stuff
  t.is(thing1.get(), 3);
  t.is(thing1.inc(), 4);
  t.is(thing4.reset(1000), 1);
  t.is(zot3.rename('Chester'), 'Chester');
  t.is(zot1.getInfo(), 'zot Alice tag=is this on? count=3 arbitrary=23');
  t.is(zot2.getInfo(), 'zot Bob tag=what are you saying? count=2 arbitrary=29');
  t.is(
    thing2.describe(),
    'thing-2 counter has been reset 0 times and is now 100',
  );
  t.is(zot3.getInfo(), 'zot Chester tag=as if... count=3 arbitrary=47');
  t.is(zot4.getInfo(), 'zot Dave tag=you and what army? count=2 arbitrary=66');
  t.is(thing3.inc(), 201);
  t.is(
    thing4.describe(),
    'thing-4 counter has been reset 1 times and is now 1000',
  );
  // prettier-ignore
  t.deepEqual(dumpStore(), [
    ['o+1/1', s({counter:capdata('4'),label:capdata('"thing-1"'),resetCounter:capdata('0')})],
    ['o+1/2', s({counter:capdata('100'),label:capdata('"thing-2"'),resetCounter:capdata('0')})],
    ['o+1/3', s({counter:capdata('200'),label:capdata('"thing-3"'),resetCounter:capdata('0')})],
    ['o+1/4', s({counter:capdata('1000'),label:capdata('"thing-4"'),resetCounter:capdata('1')})],
    ['o+2/1', s({arbitrary:capdata('23'),name:capdata('"Alice"'),tag:capdata('"is this on?"'),count:capdata('3')})],
    ['o+2/2', s({arbitrary:capdata('29'),name:capdata('"Bob"'),tag:capdata('"what are you saying?"'),count:capdata('2')})],
    ['o+2/3', s({arbitrary:capdata('47'),name:capdata('"Chester"'),tag:capdata('"as if..."'),count:capdata('3')})],
    ['o+2/4', s({arbitrary:capdata('66'),name:capdata('"Dave"'),tag:capdata('"you and what army?"'),count:capdata('1')})],
  ]);

  // phase 4: flush test
  t.is(thing1.inc(), 5);
  flushCache();
  // prettier-ignore
  t.deepEqual(dumpStore(), [
    ['o+1/1', s({counter:capdata('5'),label:capdata('"thing-1"'),resetCounter:capdata('0')})],
    ['o+1/2', s({counter:capdata('100'),label:capdata('"thing-2"'),resetCounter:capdata('0')})],
    ['o+1/3', s({counter:capdata('201'),label:capdata('"thing-3"'),resetCounter:capdata('0')})],
    ['o+1/4', s({counter:capdata('1000'),label:capdata('"thing-4"'),resetCounter:capdata('1')})],
    ['o+2/1', s({arbitrary:capdata('23'),name:capdata('"Alice"'),tag:capdata('"is this on?"'),count:capdata('3')})],
    ['o+2/2', s({arbitrary:capdata('29'),name:capdata('"Bob"'),tag:capdata('"what are you saying?"'),count:capdata('2')})],
    ['o+2/3', s({arbitrary:capdata('47'),name:capdata('"Chester"'),tag:capdata('"as if..."'),count:capdata('3')})],
    ['o+2/4', s({arbitrary:capdata('66'),name:capdata('"Dave"'),tag:capdata('"you and what army?"'),count:capdata('2')})],
  ]);
});

test('weak store operations', t => {
  const { makeWeakStore, makeKind } = makeFakeVirtualObjectManager(3);

  const thingMaker = makeKind(makeThingInstance);
  const zotMaker = makeKind(makeZotInstance);

  const thing1 = thingMaker('t1');
  const thing2 = thingMaker('t2');

  const zot1 = zotMaker(1, 'z1');
  const zot2 = zotMaker(2, 'z2');
  const zot3 = zotMaker(3, 'z3');
  const zot4 = zotMaker(4, 'z4');

  const ws1 = makeWeakStore();
  const ws2 = makeWeakStore();
  const nv1 = {};
  const nv2 = { a: 47 };
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
