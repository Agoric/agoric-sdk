import { test } from '../../tools/prepare-test-env-ava.js';

import {
  makeFakeVirtualObjectManager,
  makeFakeVirtualStuff,
} from '../../tools/fakeVirtualSupport.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function initThing(label = 'thing', counter = 0) {
  return { counter, label, resetCounter: 0 };
}
function actualizeThing(state) {
  return {
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
  };
}

function thingVal(counter, label, resetCounter) {
  return JSON.stringify({
    counter: capdata(JSON.stringify(counter)),
    label: capdata(JSON.stringify(label)),
    resetCounter: capdata(JSON.stringify(resetCounter)),
  });
}

function multiThingVal(name, count) {
  return JSON.stringify({
    name: capdata(JSON.stringify(name)),
    count: capdata(JSON.stringify(count)),
  });
}

function minThing(label) {
  return thingVal(0, label, 0);
}

function initZot(arbitrary = 47, name = 'Bob', tag = 'say what?') {
  return { arbitrary, name, tag, count: 0 };
}
function actualizeZot(state) {
  return {
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

test('multifaceted virtual objects', t => {
  const log = [];
  const { defineKind } = makeFakeVirtualObjectManager({ cacheSize: 0, log });

  const makeMultiThing = defineKind(
    'multithing',
    name => ({
      name,
      count: 0,
    }),
    state => {
      const getName = () => state.name;
      const getCount = () => state.count;
      return {
        incr: {
          inc: () => {
            state.count += 1;
          },
          getName,
          getCount,
        },
        decr: {
          dec: () => {
            state.count -= 1;
          },
          getName,
          getCount,
        },
      };
    },
  );
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
  t.is(log.shift(), `set vom.o+1/1 ${multiThingVal('foo', 1)}`);
  t.deepEqual(log, []);
  incr.inc();
  t.is(log.shift(), `set vom.o+1/2 ${multiThingVal('other', 0)}`);
  t.is(log.shift(), `get vom.o+1/1 => ${multiThingVal('foo', 1)}`);
  other.decr.dec();
  t.is(log.shift(), `set vom.o+1/1 ${multiThingVal('foo', 2)}`);
  t.is(log.shift(), `get vom.o+1/2 => ${multiThingVal('other', 0)}`);
  incr.inc();
  t.is(log.shift(), `set vom.o+1/2 ${multiThingVal('other', -1)}`);
  t.is(log.shift(), `get vom.o+1/1 => ${multiThingVal('foo', 2)}`);
  t.deepEqual(log, []);
});

// prettier-ignore
test('virtual object operations', t => {
  const log = [];
  const { defineKind, flushCache, dumpStore } = makeFakeVirtualObjectManager({ cacheSize: 3, log });

  const makeThing = defineKind('thing', initThing, actualizeThing);
  const makeZot = defineKind('zot', initZot, actualizeZot);

  // phase 0: start
  t.deepEqual(dumpStore(), []);

  // phase 1: object creations
  const thing1 = makeThing('thing-1'); // [t1-0]
  // t1-0: 'thing-1' 0 0
  const thing2 = makeThing('thing-2', 100); // [t2-0 t1-0]
  // t2-0: 'thing-2' 100 0
  const thing3 = makeThing('thing-3', 200); // [t3-0 t2-0 t1-0]
  // t3-0: 'thing-3' 200 0
  const thing4 = makeThing('thing-4', 300); // [t4-0 t3-0 t2-0 t1-0]
  // t4-0: 'thing-4' 300 0
  t.deepEqual(log, []);

  const zot1 = makeZot(23, 'Alice', 'is this on?'); // [z1-0 t4-0 t3-0 t2-0] evict t1-0
  // z1-0: 23 'Alice' 'is this on?' 0
  t.is(log.shift(), `set vom.o+1/1 ${thingVal(0, 'thing-1', 0)}`); // evict t1-0
  t.deepEqual(log, []);

  const zot2 = makeZot(29, 'Bob', 'what are you saying?'); // [z2-0 z1-0 t4-0 t3-0] evict t2-0
  // z2-0: 29 'Bob' 'what are you saying?' 0
  t.is(log.shift(), `set vom.o+1/2 ${thingVal(100, 'thing-2', 0)}`); // evict t2-0
  t.deepEqual(log, []);

  const zot3 = makeZot(47, 'Carol', 'as if...'); // [z3-0 z2-0 z1-0 t4-0] evict t3-0
  // z3-0: 47 'Carol' 'as if...' 0
  t.is(log.shift(), `set vom.o+1/3 ${thingVal(200, 'thing-3', 0)}`); // evict t3-0
  t.deepEqual(log, []);

  const zot4 = makeZot(66, 'Dave', 'you and what army?'); // [z4-0 z3-0 z2-0 z1-0] evict t4-0
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

test('virtual object cycles using the finish function', t => {
  const { vom } = makeFakeVirtualStuff();
  const { defineKind } = vom;

  const makeOtherThing = defineKind(
    'otherThing',
    (name, firstThing) => ({ name, firstThing }),
    state => ({
      getName: () => state.name,
      getFirstThing: () => state.firstThing,
    }),
  );
  const makeFirstThing = defineKind(
    'firstThing',
    name => ({
      name,
      otherThing: undefined,
    }),
    state => ({
      getName: () => state.name,
      getOtherThing: () => state.otherThing,
    }),
    (state, self) => {
      state.otherThing = makeOtherThing(`${state.name}'s other thing`, self);
    },
  );

  const thing = makeFirstThing('foo');
  t.is(thing.getName(), 'foo');
  t.is(thing.getOtherThing().getName(), `foo's other thing`);
  t.is(thing.getOtherThing().getFirstThing(), thing);
});

test('durable kind IDs can be reanimated', t => {
  const log = [];
  const { vom, vrm, cm, fakeStuff } = makeFakeVirtualStuff({
    cacheSize: 0,
    log,
  });
  const { makeKindHandle, defineDurableKind, flushCache } = vom;
  const { possibleVirtualObjectDeath } = vrm;
  const { makeScalarBigMapStore } = cm;
  const { deleteEntry } = fakeStuff;

  // Make a persistent place to put the durable kind ID
  const placeToPutIt = makeScalarBigMapStore();
  // Not verifying here that makeScalarBigMapStore worked -- it's tested elsewhere
  log.length = 0;

  // Create a durable kind ID, but don't use it yet
  let kindHandle = makeKindHandle('testkind');
  t.is(log.shift(), 'set kindIDID 9');
  t.is(log.shift(), 'set vom.kind.10 {"kindID":"10","tag":"testkind"}');
  t.deepEqual(log, []);

  // Store it in the store without having used it
  placeToPutIt.init('savedKindID', kindHandle);
  t.is(log.shift(), 'get vc.1.ssavedKindID => undefined');
  t.is(log.shift(), 'get vom.rc.o+9/10 => undefined');
  t.is(log.shift(), 'set vom.rc.o+9/10 1');
  const kindBody =
    '"{\\"@qclass\\":\\"slot\\",\\"iface\\":\\"Alleged: kind\\",\\"index\\":0}"';
  const kindSer = `{"body":${kindBody},"slots":["o+9/10"]}`;
  t.is(log.shift(), `set vc.1.ssavedKindID ${kindSer}`);
  t.is(log.shift(), 'get vc.1.|entryCount => 0');
  t.is(log.shift(), 'set vc.1.|entryCount 1');
  t.deepEqual(log, []);

  // Forget its existence
  kindHandle = null;
  deleteEntry('o+9/10');
  possibleVirtualObjectDeath('o+9/10');
  t.is(log.shift(), 'get vom.rc.o+9/10 => 1');
  t.is(log.shift(), 'get vom.es.o+9/10 => undefined');
  t.deepEqual(log, []);

  // Fetch it from the store, which should reanimate it
  const fetchedKindID = placeToPutIt.get('savedKindID');
  t.is(log.shift(), `get vc.1.ssavedKindID => ${kindSer}`);
  t.is(log.shift(), 'get vom.kind.10 => {"kindID":"10","tag":"testkind"}');
  t.deepEqual(log, []);

  // Use it now, to define a durable kind
  const makeThing = defineDurableKind(fetchedKindID, initThing, actualizeThing);
  t.deepEqual(log, []);

  // Make an instance of the new kind, just to be sure it's there
  makeThing('laterThing');
  flushCache();
  t.is(
    log.shift(),
    'set vom.o+10/1 {"counter":{"body":"0","slots":[]},"label":{"body":"\\"laterThing\\"","slots":[]},"resetCounter":{"body":"0","slots":[]}}',
  );
  t.deepEqual(log, []);
});

test('virtual object gc', t => {
  const log = [];
  const { vom, vrm, fakeStuff } = makeFakeVirtualStuff({ cacheSize: 3, log });
  const { defineKind } = vom;
  const { setExportStatus, possibleVirtualObjectDeath } = vrm;
  const { deleteEntry, dumpStore } = fakeStuff;

  const makeThing = defineKind('thing', initThing, actualizeThing);
  const tbase = 'o+9';
  const makeRef = defineKind(
    'ref',
    value => ({ value }),
    state => ({
      setVal: value => {
        state.value = value;
      },
    }),
  );

  const skit = [
    'storeKindIDTable',
    '{"scalarMapStore":1,"scalarWeakMapStore":2,"scalarSetStore":3,"scalarWeakSetStore":4,"scalarDurableMapStore":5,"scalarDurableWeakMapStore":6,"scalarDurableSetStore":7,"scalarDurableWeakSetStore":8}',
  ];
  t.is(log.shift(), `get storeKindIDTable => undefined`);
  t.is(log.shift(), `set ${skit[0]} ${skit[1]}`);
  t.deepEqual(log, []);

  // make a bunch of things which we'll use
  // all virtual objects are born locally ref'd
  const things = [];
  for (let i = 1; i <= 9; i += 1) {
    things.push(makeThing(`thing #${i}`));
  }
  t.is(log.shift(), `set vom.${tbase}/1 ${minThing('thing #1')}`);
  t.is(log.shift(), `set vom.${tbase}/2 ${minThing('thing #2')}`);
  t.is(log.shift(), `set vom.${tbase}/3 ${minThing('thing #3')}`);
  t.is(log.shift(), `set vom.${tbase}/4 ${minThing('thing #4')}`);
  t.is(log.shift(), `set vom.${tbase}/5 ${minThing('thing #5')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.${tbase}/1`, minThing('thing #1')],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
  ]);

  // This is what the finalizer would do if the local reference was dropped and GC'd
  function pretendGC(vref) {
    deleteEntry(vref);
    possibleVirtualObjectDeath(vref);
  }

  // case 1: export, drop local ref, drop export
  // export
  setExportStatus(`${tbase}/1`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/1 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/1 r`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because exported
  pretendGC(`${tbase}/1`);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/1 => r`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.es.${tbase}/1`, 'r'],
    [`vom.${tbase}/1`, minThing('thing #1')],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
  ]);
  // drop export -- should delete
  setExportStatus(`${tbase}/1`, 'recognizable');
  t.is(log.shift(), `get vom.es.${tbase}/1 => r`);
  t.is(log.shift(), `set vom.es.${tbase}/1 s`);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.deepEqual(log, []);
  pretendGC(`${tbase}/1`);
  t.is(log.shift(), `get vom.rc.${tbase}/1 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/1 => s`);
  t.is(log.shift(), `get vom.${tbase}/1 => ${thingVal(0, 'thing #1', 0)}`);
  t.is(log.shift(), `delete vom.${tbase}/1`);
  t.is(log.shift(), `delete vom.rc.${tbase}/1`);
  t.is(log.shift(), `delete vom.es.${tbase}/1`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
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
    skit,
    [`vom.es.${tbase}/2`, 's'],
    [`vom.${tbase}/2`, minThing('thing #2')],
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
  ]);
  // drop local ref -- should delete
  pretendGC(`${tbase}/2`);
  t.is(log.shift(), `get vom.rc.${tbase}/2 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/2 => s`);
  t.is(log.shift(), `get vom.${tbase}/2 => ${thingVal(0, 'thing #2', 0)}`);
  t.is(log.shift(), `delete vom.${tbase}/2`);
  t.is(log.shift(), `delete vom.rc.${tbase}/2`);
  t.is(log.shift(), `delete vom.es.${tbase}/2`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.${tbase}/3`, minThing('thing #3')],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
  ]);

  // case 3: drop local ref with no prior export
  // drop local ref -- should delete
  pretendGC(`${tbase}/3`);
  t.is(log.shift(), `get vom.rc.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.es.${tbase}/3 => undefined`);
  t.is(log.shift(), `get vom.${tbase}/3 => ${thingVal(0, 'thing #3', 0)}`);
  t.is(log.shift(), `delete vom.${tbase}/3`);
  t.is(log.shift(), `delete vom.rc.${tbase}/3`);
  t.is(log.shift(), `delete vom.es.${tbase}/3`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
  ]);

  // case 4: ref virtually, export, drop local ref, drop export
  // ref virtually
  // eslint-disable-next-line no-unused-vars
  const ref1 = makeRef(things[3]);
  t.is(log.shift(), `get vom.rc.${tbase}/4 => undefined`);
  t.is(log.shift(), `set vom.rc.${tbase}/4 1`);
  t.is(log.shift(), `set vom.${tbase}/6 ${minThing('thing #6')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.rc.${tbase}/4`, '1'],
  ]);
  // export
  setExportStatus(`${tbase}/4`, 'reachable');
  t.is(log.shift(), `get vom.es.${tbase}/4 => undefined`);
  t.is(log.shift(), `set vom.es.${tbase}/4 r`);
  t.deepEqual(log, []);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC(`${tbase}/4`);
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
  t.is(log.shift(), `set vom.${tbase}/7 ${minThing('thing #7')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 'r'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
  ]);
  // drop local ref -- should not delete because ref'd virtually AND exported
  pretendGC(`${tbase}/5`);
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
  t.is(log.shift(), `set vom.${tbase}/8 ${minThing('thing #8')}`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 's'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
    [`vom.rc.${tbase}/6`, '1'],
  ]);
  // drop local ref -- should not delete because ref'd virtually
  pretendGC(`${tbase}/6`);
  t.is(log.shift(), `get vom.rc.${tbase}/6 => 1`);
  t.is(log.shift(), `get vom.es.${tbase}/6 => undefined`);
  t.deepEqual(log, []);
  t.deepEqual(dumpStore(), [
    skit,
    [`vom.es.${tbase}/4`, 's'],
    [`vom.es.${tbase}/5`, 's'],
    [`vom.${tbase}/4`, minThing('thing #4')],
    [`vom.${tbase}/5`, minThing('thing #5')],
    [`vom.${tbase}/6`, minThing('thing #6')],
    [`vom.${tbase}/7`, minThing('thing #7')],
    [`vom.${tbase}/8`, minThing('thing #8')],
    [`vom.rc.${tbase}/4`, '1'],
    [`vom.rc.${tbase}/5`, '1'],
    [`vom.rc.${tbase}/6`, '1'],
  ]);
});

test('weak store operations', t => {
  const { vom, cm } = makeFakeVirtualStuff({ cacheSize: 3 });
  const { defineKind } = vom;
  const { makeScalarBigWeakMapStore } = cm;

  const makeThing = defineKind('thing', initThing, actualizeThing);
  const makeZot = defineKind('zot', initZot, actualizeZot);

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
    makeFakeVirtualObjectManager({ cacheSize: 3 });

  const makeThing = defineKind('thing', initThing, actualizeThing);
  const makeZot = defineKind('zot', initZot, actualizeZot);

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
