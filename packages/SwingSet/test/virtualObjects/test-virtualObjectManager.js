import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualObjectManager.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

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

function thingVal(counter, label, resetCounter) {
  return JSON.stringify({
    counter: capdata(JSON.stringify(counter)),
    label: capdata(JSON.stringify(label)),
    resetCounter: capdata(JSON.stringify(resetCounter)),
  });
}

function minThing(label) {
  return thingVal(0, label, 0);
}

function makeRefInstance(state) {
  return {
    init(value) {
      state.value = value;
    },
    self: Far('ref', {
      setVal(value) {
        state.value = value;
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

function zotVal(arbitrary, name, tag, count) {
  return JSON.stringify({
    arbitrary: capdata(JSON.stringify(arbitrary)),
    name: capdata(JSON.stringify(name)),
    tag: capdata(JSON.stringify(tag)),
    count: capdata(JSON.stringify(count)),
  });
}

// prettier-ignore
test('virtual object operations', t => {
  const log = [];
  const { makeKind, flushCache, dumpStore } = makeFakeVirtualObjectManager({ cacheSize: 3, log });

  const thingMaker = makeKind(makeThingInstance);
  const zotMaker = makeKind(makeZotInstance);

  // phase 0: start
  t.deepEqual(dumpStore(), []);

  // phase 1: object creations
  const thing1 = thingMaker('thing-1'); // [t1-0]
  // t1-0: 'thing-1' 0 0
  const thing2 = thingMaker('thing-2', 100); // [t2-0 t1-0]
  // t2-0: 'thing-2' 100 0
  const thing3 = thingMaker('thing-3', 200); // [t3-0 t2-0 t1-0]
  // t3-0: 'thing-3' 200 0
  const thing4 = thingMaker('thing-4', 300); // [t4-0 t3-0 t2-0 t1-0]
  // t4-0: 'thing-4' 300 0
  t.deepEqual(log, []);

  const zot1 = zotMaker(23, 'Alice', 'is this on?'); // [z1-0 t4-0 t3-0 t2-0] evict t1-0
  // z1-0: 23 'Alice' 'is this on?' 0
  t.is(log.shift(), `set vom.o+1/1 ${thingVal(0, 'thing-1', 0)}`); // evict t1-0
  t.deepEqual(log, []);

  const zot2 = zotMaker(29, 'Bob', 'what are you saying?'); // [z2-0 z1-0 t4-0 t3-0] evict t2-0
  // z2-0: 29 'Bob' 'what are you saying?' 0
  t.is(log.shift(), `set vom.o+1/2 ${thingVal(100, 'thing-2', 0)}`); // evict t2-0
  t.deepEqual(log, []);

  const zot3 = zotMaker(47, 'Carol', 'as if...'); // [z3-0 z2-0 z1-0 t4-0] evict t3-0
  // z3-0: 47 'Carol' 'as if...' 0
  t.is(log.shift(), `set vom.o+1/3 ${thingVal(200, 'thing-3', 0)}`); // evict t3-0
  t.deepEqual(log, []);

  const zot4 = zotMaker(66, 'Dave', 'you and what army?'); // [z4-0 z3-0 z2-0 z1-0] evict t4-0
  // z4-0: 66 'Dave' 'you and what army?' 0
  t.is(log.shift(), `set vom.o+1/4 ${thingVal(300, 'thing-4', 0)}`); // evict t4-0
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['vom.o+1/1', thingVal(0, 'thing-1', 0)], // =t1-0
    ['vom.o+1/2', thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.o+1/3', thingVal(200, 'thing-3', 0)], // =t3-0
    ['vom.o+1/4', thingVal(300, 'thing-4', 0)], // =t4-0
  ]);

  // phase 2: first batch-o-stuff
  t.is(thing1.inc(), 1); // [t1-1 z4-0 z3-0 z2-0] evict z1-0
  t.is(log.shift(), `set vom.o+2/1 ${zotVal(23, 'Alice', 'is this on?', 0)}`); // evict z1-0
  t.is(log.shift(), `get vom.o+1/1 => ${thingVal(0, 'thing-1', 0)}`); // load t1-0
  t.deepEqual(log, []);

  // t1-1: 'thing-1' 1 0
  t.is(zot1.sayHello('hello'), 'hello Alice'); // [z1-1 t1-1 z4-0 z3-0] evict z2-0
  t.is(log.shift(), `set vom.o+2/2 ${zotVal(29, 'Bob', 'what are you saying?', 0)}`); // evict z2-0
  t.is(log.shift(), `get vom.o+2/1 => ${zotVal(23, 'Alice', 'is this on?', 0)}`); // load z1-0
  t.deepEqual(log, []);

  // z1-1: 23 'Alice' 'is this on?' 1
  t.is(thing1.inc(), 2); // [t1-2 z1-1 z4-0 z3-0]
  t.deepEqual(log, []);

  // t1-2: 'thing-1' 2 0
  t.is(zot2.sayHello('hi'), 'hi Bob'); // [z2-1 t1-2 z1-1 z4-0] evict z3-0
  t.is(log.shift(), `set vom.o+2/3 ${zotVal(47, 'Carol', 'as if...', 0)}`); // evict z3-0
  t.is(log.shift(), `get vom.o+2/2 => ${zotVal(29, 'Bob', 'what are you saying?', 0)}`); // load z2-0
  t.deepEqual(log, []);

  // z2-1: 29 'Bob' 'what are you saying?' 1
  t.is(thing1.inc(), 3); // [t1-3 z2-1 z1-1 z4-0]
  t.deepEqual(log, []);

  // t1-3: 'thing-1' 3 0
  t.is(zot3.sayHello('aloha'), 'aloha Carol'); // [z3-1 t1-3 z2-1 z1-1] evict z4-0
  t.is(log.shift(), `set vom.o+2/4 ${zotVal(66, 'Dave', 'you and what army?', 0)}`); // evict z4-0
  t.is(log.shift(), `get vom.o+2/3 => ${zotVal(47, 'Carol', 'as if...', 0)}`); // load z3-0
  t.deepEqual(log, []);

  // z3-1: 47 'Carol' 'as if...' 1
  t.is(zot4.sayHello('bonjour'), 'bonjour Dave'); // [z4-1 z3-1 t1-3 z2-1] evict z1-1
  t.is(log.shift(), `set vom.o+2/1 ${zotVal(23, 'Alice', 'is this on?', 1)}`); // evict z1-1
  t.is(log.shift(), `get vom.o+2/4 => ${zotVal(66, 'Dave', 'you and what army?', 0)}`); // load z4-0
  t.deepEqual(log, []);

  // z4-1: 66 'Dave' 'you and what army?' 1
  t.is(zot1.sayHello('hello again'), 'hello again Alice'); // [z1-2 z4-1 z3-1 t1-3] evict z2-1
  t.is(log.shift(), `set vom.o+2/2 ${zotVal(29, 'Bob', 'what are you saying?', 1)}`); // evict z2-1
  t.is(log.shift(), `get vom.o+2/1 => ${zotVal(23, 'Alice', 'is this on?', 1)}`); // get z1-1
  t.deepEqual(log, []);

  // z1-2: 23 'Alice' 'is this on?' 2
  t.is(
    thing2.describe(), // [t2-0 z1-2 z4-1 z3-1] evict t1-3
    'thing-2 counter has been reset 0 times and is now 100',
  );
  t.is(log.shift(), `set vom.o+1/1 ${thingVal(3, 'thing-1', 0)}`); // evict t1-3
  t.is(log.shift(), `get vom.o+1/2 => ${thingVal(100, 'thing-2', 0)}`); // load t2-0
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['vom.o+1/1', thingVal(3, 'thing-1', 0)], // =t1-3
    ['vom.o+1/2', thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.o+1/3', thingVal(200, 'thing-3', 0)], // =t3-0
    ['vom.o+1/4', thingVal(300, 'thing-4', 0)], // =t4-0
    ['vom.o+2/1', zotVal(23, 'Alice', 'is this on?', 1)], // =z1-1
    ['vom.o+2/2', zotVal(29, 'Bob', 'what are you saying?', 1)], // =z2-1
    ['vom.o+2/3', zotVal(47, 'Carol', 'as if...', 0)], // =z3-0
    ['vom.o+2/4', zotVal(66, 'Dave', 'you and what army?', 0)], // =z4-0
  ]);

  // phase 3: second batch-o-stuff
  t.is(thing1.get(), 3); // [t1-3 t2-0 z1-2 z4-1] evict z3-1
  t.is(log.shift(), `set vom.o+2/3 ${zotVal(47, 'Carol', 'as if...', 1)}`); // evict z3-1
  t.is(log.shift(), `get vom.o+1/1 => ${thingVal(3, 'thing-1', 0)}`); // load t1-3
  t.deepEqual(log, []);

  t.is(thing1.inc(), 4); // [t1-4 t2-0 z1-2 z4-1]
  t.deepEqual(log, []);

  // t1-4: 'thing-1' 4 0
  t.is(thing4.reset(1000), 1); // [t4-1 t1-4 t2-0 z1-2] evict z4-1
  t.is(log.shift(), `set vom.o+2/4 ${zotVal(66, 'Dave', 'you and what army?', 1)}`); // evict z4-1
  t.is(log.shift(), `get vom.o+1/4 => ${thingVal(300, 'thing-4', 0)}`); // load t4-0
  t.deepEqual(log, []);

  // t4-1: 'thing-4' 1000 1
  t.is(zot3.rename('Chester'), 'Chester'); // [z3-2 t4-1 t1-4 t2-0] evict z1-2
  t.is(log.shift(), `set vom.o+2/1 ${zotVal(23, 'Alice', 'is this on?', 2)}`); // evict z1-2
  t.is(log.shift(), `get vom.o+2/3 => ${zotVal(47, 'Carol', 'as if...', 1)}`); // load z3-1
  t.deepEqual(log, []);

  // z3-2: 47 'Chester' 'as if...' 2
  t.is(zot1.getInfo(), 'zot Alice tag=is this on? count=3 arbitrary=23'); // [z1-3 z3-2 t4-1 t1-4] evict t2-0
  // evict t2-0 does nothing because t2 is not dirty
  t.is(log.shift(), `get vom.o+2/1 => ${zotVal(23, 'Alice', 'is this on?', 2)}`); // load z1-2
  t.deepEqual(log, []);

  // z1-3: 23 'Alice' 'is this on?' 3
  t.is(zot2.getInfo(), 'zot Bob tag=what are you saying? count=2 arbitrary=29'); // [z2-2 z1-3 z3-2 t4-1] evict t1-4
  t.is(log.shift(), `set vom.o+1/1 ${thingVal(4, 'thing-1', 0)}`); // evict t1-4
  t.is(log.shift(), `get vom.o+2/2 => ${zotVal(29, 'Bob', 'what are you saying?', 1)}`); // load z2-1
  t.deepEqual(log, []);

  // z2-2: 29 'Bob' 'what are you saying?' 1
  t.is(
    thing2.describe(), // [t2-0 z2-2 z1-3 z3-2] evict t4-1
    'thing-2 counter has been reset 0 times and is now 100',
  );
  t.is(log.shift(), `set vom.o+1/4 ${thingVal(1000, 'thing-4', 1)}`); // evict t4-1
  t.is(log.shift(), `get vom.o+1/2 => ${thingVal(100, 'thing-2', 0)}`); // load t2-0
  t.deepEqual(log, []);

  t.is(zot3.getInfo(), 'zot Chester tag=as if... count=3 arbitrary=47'); // [z3-3 t2-0 z2-2 z1-3]
  t.deepEqual(log, []);

  // z3-3: 47 'Chester' 'as if...' 3
  t.is(zot4.getInfo(), 'zot Dave tag=you and what army? count=2 arbitrary=66'); // [z4-1 z3-3 t2-0 z2-2] evict z1-3
  t.is(log.shift(), `set vom.o+2/1 ${zotVal(23, 'Alice', 'is this on?', 3)}`); // evict z1-3
  t.is(log.shift(), `get vom.o+2/4 => ${zotVal(66, 'Dave', 'you and what army?', 1)}`); // load z4-1
  t.deepEqual(log, []);

  // z4-2: 66 'Dave' 'you and what army?' 2
  t.is(thing3.inc(), 201); // [t3-1 z4-2 z3-3 t2-0] evict z2-2
  t.is(log.shift(), `set vom.o+2/2 ${zotVal(29, 'Bob', 'what are you saying?', 2)}`); // evict z2-2
  t.is(log.shift(), `get vom.o+1/3 => ${thingVal(200, 'thing-3', 0)}`); // load t3-0
  t.deepEqual(log, []);

  // t3-1: 'thing-3' 201 0
  t.is(
    thing4.describe(), // [t4-1 t3-1 z4-2 z3-3] evict t2-0
    'thing-4 counter has been reset 1 times and is now 1000',
  );
  // evict t2-0 does nothing because t2 is not dirty
  t.is(log.shift(), `get vom.o+1/4 => ${thingVal(1000, 'thing-4', 1)}`); // load t4-1
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['vom.o+1/1', thingVal(4, 'thing-1', 0)], // =t1-4
    ['vom.o+1/2', thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.o+1/3', thingVal(200, 'thing-3', 0)], // =t3-0
    ['vom.o+1/4', thingVal(1000, 'thing-4', 1)], // =t4-1
    ['vom.o+2/1', zotVal(23, 'Alice', 'is this on?', 3)], // =z1-3
    ['vom.o+2/2', zotVal(29, 'Bob', 'what are you saying?', 2)], // =z2-2
    ['vom.o+2/3', zotVal(47, 'Carol', 'as if...', 1)], // =z3-1
    ['vom.o+2/4', zotVal(66, 'Dave', 'you and what army?', 1)], // =z4-1
  ]);

  // phase 4: flush test
  t.is(thing1.inc(), 5); // [t1-5 t4-1 t3-1 z4-2] evict z3-3
  t.is(log.shift(), `set vom.o+2/3 ${zotVal(47, 'Chester', 'as if...', 3)}`); // evict z3-3
  t.is(log.shift(), `get vom.o+1/1 => ${thingVal(4, 'thing-1', 0)}`); // load t1-4
  t.deepEqual(log, []);

  // t1-5: 'thing-1' 5 0
  flushCache(); // [] evict z4-2 t3-1 t4-1 t1-5
  t.is(log.shift(), `set vom.o+2/4 ${zotVal(66, 'Dave', 'you and what army?', 2)}`); // evict z4-2
  t.is(log.shift(), `set vom.o+1/3 ${thingVal(201, 'thing-3', 0)}`); // evict t3-1
  // evict t4-1 does nothing because t4 is not dirty
  t.is(log.shift(), `set vom.o+1/1 ${thingVal(5, 'thing-1', 0)}`); // evict t1-5
  t.deepEqual(log, []);

  t.deepEqual(dumpStore(), [
    ['vom.o+1/1', thingVal(5, 'thing-1', 0)], // =t1-5
    ['vom.o+1/2', thingVal(100, 'thing-2', 0)], // =t2-0
    ['vom.o+1/3', thingVal(201, 'thing-3', 0)], // =t3-1
    ['vom.o+1/4', thingVal(1000, 'thing-4', 1)], // =t4-1
    ['vom.o+2/1', zotVal(23, 'Alice', 'is this on?', 3)], // =z1-3
    ['vom.o+2/2', zotVal(29, 'Bob', 'what are you saying?', 2)], // =z2-2
    ['vom.o+2/3', zotVal(47, 'Chester', 'as if...', 3)], // =z3-3
    ['vom.o+2/4', zotVal(66, 'Dave', 'you and what army?', 2)], // =z4-2
  ]);
});

test('virtual object gc', t => {
  const log = [];
  const {
    makeKind,
    dumpStore,
    setExportStatus,
    deleteEntry,
    possibleVirtualObjectDeath,
  } = makeFakeVirtualObjectManager({ cacheSize: 3, log });

  const thingMaker = makeKind(makeThingInstance);
  const refMaker = makeKind(makeRefInstance);

  // make a bunch of things which we'll use
  // all virtual objects are born locally ref'd
  const things = [];
  for (let i = 1; i <= 9; i += 1) {
    things.push(thingMaker(`thing #${i}`));
  }
  t.is(log.shift(), `set vom.o+1/1 ${minThing('thing #1')}`);
  t.is(log.shift(), `set vom.o+1/2 ${minThing('thing #2')}`);
  t.is(log.shift(), `set vom.o+1/3 ${minThing('thing #3')}`);
  t.is(log.shift(), `set vom.o+1/4 ${minThing('thing #4')}`);
  t.is(log.shift(), `set vom.o+1/5 ${minThing('thing #5')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.o+1/1', minThing('thing #1')],
    ['vom.o+1/2', minThing('thing #2')],
    ['vom.o+1/3', minThing('thing #3')],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);

  // This is what the finalizer would do if the local reference was dropped and GC'd
  function pretendGC(vref) {
    deleteEntry(vref);
    possibleVirtualObjectDeath(vref);
  }

  // case 1: export, drop local ref, drop export
  // export
  setExportStatus('o+1/1', 'reachable');
  t.is(log.shift(), `set vom.es.o+1/1 1`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because exported
  pretendGC('o+1/1');
  t.is(log.shift(), `get vom.rc.o+1/1 => undefined`);
  t.is(log.shift(), `get vom.es.o+1/1 => 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.es.o+1/1', '1'],
    ['vom.o+1/1', minThing('thing #1')],
    ['vom.o+1/2', minThing('thing #2')],
    ['vom.o+1/3', minThing('thing #3')],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);
  // drop export -- should delete
  setExportStatus('o+1/1', 'recognizable');
  t.is(log.shift(), `set vom.es.o+1/1 0`);
  t.is(log.shift(), `get vom.rc.o+1/1 => undefined`);
  t.deepEqual(log, []);
  pretendGC('o+1/1');
  t.is(log.shift(), `get vom.rc.o+1/1 => undefined`);
  t.is(log.shift(), `get vom.es.o+1/1 => 0`);
  t.is(log.shift(), `get vom.o+1/1 => ${thingVal(0, 'thing #1', 0)}`);
  t.is(log.shift(), `delete vom.o+1/1`);
  t.is(log.shift(), `delete vom.rc.o+1/1`);
  t.is(log.shift(), `delete vom.es.o+1/1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.o+1/2', minThing('thing #2')],
    ['vom.o+1/3', minThing('thing #3')],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);

  // case 2: export, drop export, drop local ref
  // export
  setExportStatus('o+1/2', 'reachable');
  t.is(log.shift(), `set vom.es.o+1/2 1`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd locally
  setExportStatus('o+1/2', 'recognizable');
  t.is(log.shift(), `set vom.es.o+1/2 0`);
  t.is(log.shift(), `get vom.rc.o+1/2 => undefined`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.es.o+1/2', '0'],
    ['vom.o+1/2', minThing('thing #2')],
    ['vom.o+1/3', minThing('thing #3')],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);
  // drop local ref -- should delete
  pretendGC('o+1/2');
  t.is(log.shift(), `get vom.rc.o+1/2 => undefined`);
  t.is(log.shift(), `get vom.es.o+1/2 => 0`);
  t.is(log.shift(), `get vom.o+1/2 => ${thingVal(0, 'thing #2', 0)}`);
  t.is(log.shift(), `delete vom.o+1/2`);
  t.is(log.shift(), `delete vom.rc.o+1/2`);
  t.is(log.shift(), `delete vom.es.o+1/2`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.o+1/3', minThing('thing #3')],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);

  // case 3: drop local ref with no prior export
  // drop local ref -- should delete
  pretendGC('o+1/3');
  t.is(log.shift(), `get vom.rc.o+1/3 => undefined`);
  t.is(log.shift(), `get vom.es.o+1/3 => undefined`);
  t.is(log.shift(), `get vom.o+1/3 => ${thingVal(0, 'thing #3', 0)}`);
  t.is(log.shift(), `delete vom.o+1/3`);
  t.is(log.shift(), `delete vom.rc.o+1/3`);
  t.is(log.shift(), `delete vom.es.o+1/3`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
  ]);

  // case 4: ref virtually, export, drop local ref, drop export
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref1 = refMaker(things[3]);
  t.is(log.shift(), `set vom.o+1/6 ${minThing('thing #6')}`);
  t.is(log.shift(), `get vom.rc.o+1/4 => undefined`);
  t.is(log.shift(), `set vom.rc.o+1/4 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
    ['vom.o+1/6', minThing('thing #6')],
    ['vom.rc.o+1/4', '1'],
  ]);
  // export
  setExportStatus('o+1/4', 'reachable');
  t.is(log.shift(), `set vom.es.o+1/4 1`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC('o+1/4');
  t.is(log.shift(), `get vom.rc.o+1/4 => 1`);
  t.is(log.shift(), `get vom.es.o+1/4 => 1`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd virtually
  setExportStatus('o+1/4', 'recognizable');
  t.is(log.shift(), `set vom.es.o+1/4 0`);
  t.is(log.shift(), `get vom.rc.o+1/4 => 1`);
  t.deepEqual(log, []);

  // case 5: export, ref virtually, drop local ref, drop export
  // export
  setExportStatus('o+1/5', 'reachable');
  t.is(log.shift(), `set vom.es.o+1/5 1`);
  t.deepEqual(log, []);
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref2 = refMaker(things[4]);
  t.is(log.shift(), `set vom.o+1/7 ${minThing('thing #7')}`);
  t.is(log.shift(), `get vom.rc.o+1/5 => undefined`);
  t.is(log.shift(), `set vom.rc.o+1/5 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.es.o+1/4', '0'],
    ['vom.es.o+1/5', '1'],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
    ['vom.o+1/6', minThing('thing #6')],
    ['vom.o+1/7', minThing('thing #7')],
    ['vom.rc.o+1/4', '1'],
    ['vom.rc.o+1/5', '1'],
  ]);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC('o+1/5');
  t.is(log.shift(), `get vom.rc.o+1/5 => 1`);
  t.is(log.shift(), `get vom.es.o+1/5 => 1`);
  t.deepEqual(log, []);
  // drop export -- should not delete because ref'd virtually
  setExportStatus('o+1/5', 'recognizable');
  t.is(log.shift(), `set vom.es.o+1/5 0`);
  t.is(log.shift(), `get vom.rc.o+1/5 => 1`);
  t.deepEqual(log, []);

  // case 6: ref virtually, drop local ref
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref3 = refMaker(things[5]);
  t.is(log.shift(), `set vom.o+1/8 ${minThing('thing #8')}`);
  t.is(log.shift(), `get vom.rc.o+1/6 => undefined`);
  t.is(log.shift(), `set vom.rc.o+1/6 1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.es.o+1/4', '0'],
    ['vom.es.o+1/5', '0'],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
    ['vom.o+1/6', minThing('thing #6')],
    ['vom.o+1/7', minThing('thing #7')],
    ['vom.o+1/8', minThing('thing #8')],
    ['vom.rc.o+1/4', '1'],
    ['vom.rc.o+1/5', '1'],
    ['vom.rc.o+1/6', '1'],
  ]);
  // drop local ref -- should not delete because ref'd virtually
  pretendGC('o+1/6');
  t.is(log.shift(), `get vom.rc.o+1/6 => 1`);
  t.is(log.shift(), `get vom.es.o+1/6 => undefined`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    ['vom.es.o+1/4', '0'],
    ['vom.es.o+1/5', '0'],
    ['vom.o+1/4', minThing('thing #4')],
    ['vom.o+1/5', minThing('thing #5')],
    ['vom.o+1/6', minThing('thing #6')],
    ['vom.o+1/7', minThing('thing #7')],
    ['vom.o+1/8', minThing('thing #8')],
    ['vom.rc.o+1/4', '1'],
    ['vom.rc.o+1/5', '1'],
    ['vom.rc.o+1/6', '1'],
  ]);
});

function makeDefectivelyNonFarThingInstance(state) {
  return {
    init(label = 'thing') {
      state.label = label;
    },
    self: {
      noop() {},
    },
  };
}

test('demand farhood', t => {
  const { makeKind } = makeFakeVirtualObjectManager({ cacheSize: 3 });

  const thingMaker = makeKind(makeDefectivelyNonFarThingInstance);
  t.throws(() => thingMaker('thing'), { message: 'self must be declared Far' });
});

test('weak store operations', t => {
  const { makeVirtualScalarWeakMap, makeKind } = makeFakeVirtualObjectManager({
    cacheSize: 3,
  });

  const thingMaker = makeKind(makeThingInstance);
  const zotMaker = makeKind(makeZotInstance);

  const thing1 = thingMaker('t1');
  const thing2 = thingMaker('t2');

  const zot1 = zotMaker(1, 'z1');
  const zot2 = zotMaker(2, 'z2');
  const zot3 = zotMaker(3, 'z3');
  const zot4 = zotMaker(4, 'z4');

  const ws1 = makeVirtualScalarWeakMap();
  const ws2 = makeVirtualScalarWeakMap();
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

test('virtualized weak collection operations', t => {
  // TODO: don't yet have a way to test the weakness of the virtualized weak
  // collections

  const {
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    makeKind,
  } = makeFakeVirtualObjectManager({ cacheSize: 3 });

  const thingMaker = makeKind(makeThingInstance);
  const zotMaker = makeKind(makeZotInstance);

  const thing1 = thingMaker('t1');
  const thing2 = thingMaker('t2');

  const zot1 = zotMaker(1, 'z1');
  const zot2 = zotMaker(2, 'z2');
  const zot3 = zotMaker(3, 'z3');
  const zot4 = zotMaker(4, 'z4');

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
