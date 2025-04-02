// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { M } from '@agoric/store';
import { makeLiveSlots } from '../../src/liveslots.js';
import { buildSyscall } from '../liveslots-helpers.js';
import { makeStartVat, makeMessage } from '../util.js';
import { makeMockGC } from '../mock-gc.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

/** @import {VatData} from '../../src/vatDataTypes.js'; */

const eph1 = Far('ephemeral1');
const eph2 = Far('ephemeral2');

const initHolder = value => ({ value });
const holderMethods = {
  get: ({ state }) => state.value,
  set: ({ state }, value) => (state.value = value),
};
/**
 * Define a virtual or durable kind for getting and setting a single value
 * constrained by the provided shape.
 *
 * @template {VatData.defineKind | VatData.defineDurableKind} D
 * @param {D} defineKind
 * @param {Parameters<D>[0]} kindIdentifier
 * @param {import('@endo/patterns').Pattern} valueShape
 */
const defineHolder = (defineKind, kindIdentifier, valueShape) =>
  defineKind(kindIdentifier, initHolder, holderMethods, {
    stateShape: { value: valueShape },
  });

// virtual/durable Kinds can specify a 'stateShape', which should be
// enforced at both initialization and subsequent state changes
const testStateShape = test.macro((t, valueShape, config) => {
  const { goodValues, badValues, throwsExpectation } = config;
  const { vom } = makeFakeVirtualStuff();
  const { defineKind } = vom;
  const makeHolder = defineHolder(defineKind, 'kindTag', valueShape);
  const instance = goodValues.map(value => makeHolder(value)).at(-1);
  for (const value of goodValues) {
    instance.set(value);
  }
  for (const value of badValues || []) {
    t.throws(() => makeHolder(value), throwsExpectation);
    t.throws(() => instance.set(value), throwsExpectation);
  }
  t.pass();
});
test('constrain state shape - M.any()', testStateShape, M.any(), {
  goodValues: [eph1, eph2, 1, 2, 'string'],
});
test('constrain state shape - M.number()', testStateShape, M.number(), {
  goodValues: [1],
  badValues: [eph1, 'string'],
  throwsExpectation: { message: /Must be a number/ },
});
test('constrain state shape - M.string()', testStateShape, M.string(), {
  goodValues: ['string'],
  badValues: [eph1, 1, 2],
  throwsExpectation: { message: /Must be a string/ },
});
test('constrain state shape - M.remotable()', testStateShape, M.remotable(), {
  goodValues: [eph1, eph2],
  badValues: ['string', 1, 2],
  throwsExpectation: { message: /Must be a remotable/ },
});
test('constrain state shape - specific remotable', testStateShape, eph1, {
  goodValues: [eph1],
  badValues: ['string', 1, 2],
  throwsExpectation: { message: /Must be:.*Alleged: ephemeral1/ },
});

// durable Kinds serialize and store their stateShape, which must
// itself be durable
test('durable state shape', t => {
  // note: relaxDurabilityRules defaults to true in fake tools
  const { vom } = makeFakeVirtualStuff({ relaxDurabilityRules: false });
  const { makeKindHandle, defineDurableKind } = vom;

  let kindNumber = 0;
  const defineNextKind = valueShape => {
    kindNumber += 1;
    const kh = makeKindHandle(`kind${kindNumber}`);
    return defineHolder(defineDurableKind, kh, valueShape);
  };

  const makeKind1 = defineNextKind();
  makeKind1();

  const makeKind2 = defineNextKind();
  makeKind2();

  const makeKind3 = defineNextKind(M.any());
  const obj3 = makeKind3();

  const makeKind4 = defineNextKind(M.string());
  const obj4 = makeKind4('string');

  const makeKind5 = defineNextKind(M.remotable());
  const durableValueFail = { message: /value for "value" is not durable/ };
  t.throws(() => makeKind5(eph1), durableValueFail);

  const durableShapeFail = { message: /stateShape.*is not durable: slot 0 of/ };
  t.throws(() => defineNextKind(eph1), durableShapeFail);

  const makeKind7 = defineNextKind(obj4); // obj4 is durable
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
      accept: _ref => {}, // assigns a vref
      create: valueShape => {
        const kh = makeKindHandle('shaped');
        baggage.init('kh', kh);
        defineHolder(defineDurableKind, kh, valueShape);
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
    const { valueShape } = vatParameters;
    const kh = baggage.get('kh');
    defineHolder(defineDurableKind, kh, valueShape);

    return Far('root', {});
  }

  // to test refcount increment/decrement, we need to override the
  // usual rule that the new version must exactly match the original
  // stateShape
  const options = { allowStateShapeChanges: true };
  const makeNS2 = () => ({ buildRootObject: build2 });
  const ls2 = makeLiveSlots(
    sc2,
    'vatA',
    {},
    options,
    gcTools,
    undefined,
    makeNS2,
  );

  const standard2Vref = 'o-2';
  const vp = { valueShape: kslot(standard2Vref) };
  const startVat2 = makeStartVat(kser(vp));
  await ls2.dispatch(startVat2);

  // redefining the durable kind, with a different 'standard' object,
  // will decrement the standard1 refcount, and increment that of
  // standard2

  t.falsy(ls2.testHooks.getReachableRefCount(standard1Vref));
  t.is(ls2.testHooks.getReachableRefCount(standard2Vref), 1);
});

test('durable stateShape must match', async t => {
  const kvStore = new Map();
  const { syscall: sc1 } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  function build1(vatPowers, _vp, baggage) {
    const { VatData } = vatPowers;
    const { makeKindHandle, defineDurableKind } = VatData;

    return Far('root', {
      create: (obj1, obj2) => {
        const kh = makeKindHandle('shaped');
        baggage.init('kh', kh);
        const stateShape = { x: obj1, y: obj2 };
        defineDurableKind(kh, initHolder, holderMethods, { stateShape });
      },
    });
  }

  const makeNS1 = () => ({ buildRootObject: build1 });
  const ls1 = makeLiveSlots(sc1, 'vatA', {}, {}, gcTools, undefined, makeNS1);
  const startVat1 = makeStartVat(kser());
  await ls1.dispatch(startVat1);
  const rootA = 'o+0';

  const vref1 = 'o-1';
  const vref2 = 'o-2';
  await ls1.dispatch(
    makeMessage(rootA, 'create', [kslot(vref1), kslot(vref2)]),
  );

  // the first version's state is { x: vref1, y: vref2 }

  // ------

  // Simulate upgrade by starting from the non-empty kvStore.
  const clonedStore = new Map(kvStore);
  const { syscall: sc2 } = buildSyscall({ kvStore: clonedStore });

  function build2(vatPowers, vatParameters, baggage) {
    const { VatData } = vatPowers;
    const { defineDurableKind } = VatData;
    const { obj1, obj2 } = vatParameters;
    const kh = baggage.get('kh');
    const redefineDurableKind = stateShape => {
      defineDurableKind(kh, initHolder, holderMethods, { stateShape });
    };
    // several shapes that are not compatible
    const shape1 = { x: obj1, y: M.any() };
    const shape2 = { x: obj1 };
    const shape3 = { x: obj1, y: obj2, z: M.string() };
    const shape4 = { x: M.or(obj1, M.string()), y: obj2 };
    const shape5 = { x: obj2, y: obj1 }; // wrong slots
    const trial = shape => {
      t.throws(() => redefineDurableKind(shape), {
        message: /durable Kind stateShape mismatch/,
      });
    };
    trial(shape1);
    trial(shape2);
    trial(shape3);
    trial(shape4);
    trial(shape5);
    const stateShape = { x: obj1, y: obj2 }; // the correct shape
    redefineDurableKind(stateShape);
    t.pass();

    return Far('root', {});
  }

  // we do *not* override allowStateShapeChanges
  // const options = { allowStateShapeChanges: true };
  const options = undefined;
  const makeNS2 = () => ({ buildRootObject: build2 });
  const ls2 = makeLiveSlots(
    sc2,
    'vatA',
    {},
    options,
    gcTools,
    undefined,
    makeNS2,
  );

  const vp = { obj1: kslot(vref1), obj2: kslot(vref2) };
  const startVat2 = makeStartVat(kser(vp));
  await ls2.dispatch(startVat2);
});
