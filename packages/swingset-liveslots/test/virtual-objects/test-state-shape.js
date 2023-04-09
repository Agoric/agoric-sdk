import test from 'ava';
import '@endo/init/debug.js';

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { makeLiveSlots } from '../../src/liveslots.js';
import { kser, kslot } from '../kmarshal.js';
import { buildSyscall } from '../liveslots-helpers.js';
import { makeStartVat, makeMessage } from '../util.js';
import { makeMockGC } from '../mock-gc.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

function makeGenericRemotable(typeName) {
  return Far(typeName, {
    aMethod() {
      return 'whatever';
    },
  });
}
const eph1 = makeGenericRemotable('ephemeral1');
const eph2 = makeGenericRemotable('ephemeral2');

const init = value => ({ value });
const behavior = {
  set: ({ state }, value) => (state.value = value),
};

// virtual/durable Kinds can specify a 'stateShape', which should be
// enforced, both during initialization and subsequent state changes

test('constrain state shape', t => {
  const { vom } = makeFakeVirtualStuff();
  const { defineKind } = vom;
  const any = { value: M.any() };
  const number = { value: M.number() };
  const string = { value: M.string() };
  const remotable = { value: M.remotable() };
  const eph = { value: eph1 };

  // M.any() allows anything
  const makeA = defineKind('kindA', init, behavior, { stateShape: any });
  makeA(eph1);
  makeA(1);
  makeA('string');
  const a = makeA(1);
  a.set(eph1);
  a.set(2);
  a.set('other string');

  // M.number() requires a number
  const numberFail = { message: /Must be a number/ };
  const makeB = defineKind('kindB', init, behavior, { stateShape: number });
  t.throws(() => makeB(eph1), numberFail);
  const b = makeB(1);
  t.throws(() => makeB('string'), numberFail);
  t.throws(() => b.set(eph1), numberFail);
  t.throws(() => b.set('string'), numberFail);

  // M.string() requires a string
  const stringFail = { message: /Must be a string/ };
  const makeC = defineKind('kindC', init, behavior, { stateShape: string });
  t.throws(() => makeC(eph1), stringFail);
  const c = makeC('string');
  t.throws(() => makeC(1), stringFail);
  t.throws(() => c.set(eph1), stringFail);
  t.throws(() => c.set(2), stringFail);

  // M.remotable() requires any Remotable
  const remotableFail = { message: /Must be a remotable/ };
  const makeD = defineKind('kindD', init, behavior, { stateShape: remotable });
  const d = makeD(eph1);
  makeD(eph2);
  t.throws(() => makeD(1), remotableFail);
  t.throws(() => makeD('string'), remotableFail);
  d.set(eph2);
  t.throws(() => d.set(2), remotableFail);
  t.throws(() => d.set('string'), remotableFail);

  // using a specific Remotable object requires that exact object
  const eph1Fail = { message: /Must be:.*Alleged: ephemeral1/ };
  const makeE = defineKind('kindE', init, behavior, { stateShape: eph });
  const e = makeE(eph1);
  t.throws(() => makeE(eph2), eph1Fail);
  t.throws(() => makeE(1), eph1Fail);
  t.throws(() => makeE('string'), eph1Fail);
  e.set(eph1);
  t.throws(() => e.set(eph2), eph1Fail);
  t.throws(() => e.set(2), eph1Fail);
  t.throws(() => e.set('string'), eph1Fail);
});

// durable Kinds serialize and store their stateShape, which must
// itself be durable

test('durable state shape', t => {
  // note: relaxDurabilityRules defaults to true in fake tools
  const { vom } = makeFakeVirtualStuff({ relaxDurabilityRules: false });
  const { makeKindHandle, defineDurableKind } = vom;

  const make = (which, stateShape) => {
    const kh = makeKindHandle(`kind${which}`);
    return defineDurableKind(kh, init, behavior, { stateShape });
  };

  const makeKind1 = make(1);
  makeKind1();

  const makeKind2 = make(2);
  makeKind2();

  const makeKind3 = make(3, { value: M.any() });
  const obj3 = makeKind3();

  const makeKind4 = make(4, { value: M.string() });
  const obj4 = makeKind4('string');

  const makeKind5 = make(5, { value: M.remotable() });
  const durableValueFail = { message: /value for "value" is not durable/ };
  t.throws(() => makeKind5(eph1), durableValueFail);

  const durableShapeFail = { message: /stateShape.*is not durable: slot 0 of/ };
  t.throws(() => make(6, { value: eph1 }), durableShapeFail);

  const makeKind7 = make(7, { value: obj4 }); // obj4 is durable
  makeKind7(obj4);
  const specificRemotableFail = { message: /kind3.*Must be:.*kind4/ };
  t.throws(() => makeKind7(obj3), specificRemotableFail);
});

// durable Kinds maintain refcounts on their serialized stateShape

test('durable stateShape refcounts', async t => {
  const kvStore = new Map();
  const { syscall: sc1 } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  function build1(vatPowers, _vp, baggage) {
    const { VatData } = vatPowers;
    const { makeKindHandle, defineDurableKind } = VatData;

    return Far('root', {
      accept: _standard1 => 0, // assign it a vref
      create: standard1 => {
        const kh = makeKindHandle('shaped');
        baggage.init('kh', kh);
        const stateShape = { value: standard1 };
        defineDurableKind(kh, init, behavior, { stateShape });
      },
    });
  }

  const makeNS1 = () => ({ buildRootObject: build1 });
  const ls1 = makeLiveSlots(sc1, 'vatA', {}, {}, gcTools, undefined, makeNS1);
  const startVat1 = makeStartVat(kser());
  await ls1.dispatch(startVat1);
  const rootA = 'o+0';

  const standard1Vref = 'o-1';
  await ls1.dispatch(makeMessage(rootA, 'accept', []));
  t.falsy(ls1.testHooks.getReachableRefCount(standard1Vref));

  await ls1.dispatch(makeMessage(rootA, 'create', [kslot(standard1Vref)]));

  // using our 'standard1' object in stateShape causes its refcount to
  // be incremented
  t.is(ls1.testHooks.getReachableRefCount(standard1Vref), 1);

  // ------

  // Simulate upgrade by starting from the non-empty kvStore.
  const clonedStore = new Map(kvStore);
  const { syscall: sc2 } = buildSyscall({ kvStore: clonedStore });

  function build2(vatPowers, vatParameters, baggage) {
    const { VatData } = vatPowers;
    const { defineDurableKind } = VatData;
    const { standard2 } = vatParameters;
    const kh = baggage.get('kh');
    const stateShape = { value: standard2 };
    defineDurableKind(kh, init, behavior, { stateShape });

    return Far('root', {});
  }

  const makeNS2 = () => ({ buildRootObject: build2 });
  const ls2 = makeLiveSlots(sc2, 'vatA', {}, {}, gcTools, undefined, makeNS2);

  const standard2Vref = 'o-2';
  const vp = { standard2: kslot(standard2Vref) };
  const startVat2 = makeStartVat(kser(vp));
  await ls2.dispatch(startVat2);

  // redefining the durable kind, with a different 'standard' object,
  // will decrement the standard1 refcount, and increment that of
  // standard2

  t.falsy(ls2.testHooks.getReachableRefCount(standard1Vref));
  t.is(ls2.testHooks.getReachableRefCount(standard2Vref), 1);
});
