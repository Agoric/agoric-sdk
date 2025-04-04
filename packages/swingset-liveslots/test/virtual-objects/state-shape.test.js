// @ts-nocheck
import test from 'ava';

import { Fail } from '@endo/errors';
import { Far } from '@endo/marshal';
import { kser, kslot, kunser } from '@agoric/kmarshal';
import { M } from '@agoric/store';
import { makeLiveSlots } from '../../src/liveslots.js';
import { buildSyscall } from '../liveslots-helpers.js';
import { makeStartVat, makeMessage } from '../util.js';
import { makeMockGC } from '../mock-gc.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

/** @import {VatOneResolution} from '../../src/types.js'; */
/** @import {VatData} from '../../src/vatDataTypes.js'; */

let lastPnum = 100;
/**
 * Send a "message" syscall into a liveslots instance and return the
 * unserialized result, or an error if the result is unsettled or rejected.
 *
 * @param {ReturnType<typeof makeLiveSlots>} ls
 * @param {ReturnType<typeof buildSyscall>['log']} syscallLog
 * @param {[target: unknown, method: string | symbol, args?: unknown[]]} message
 */
const dispatchForResult = async (ls, syscallLog, message) => {
  const oldSyscallCount = syscallLog.length;
  lastPnum += 1;
  const resultVpid = `p-${lastPnum}`;
  const vdo = makeMessage(...message.concat(undefined).slice(0, 3), resultVpid);
  await ls.dispatch(vdo);
  const newSyscalls = syscallLog.slice(oldSyscallCount);
  /** @type {VatOneResolution[]} */
  const newResolutions = newSyscalls.flatMap(vso =>
    vso.type === 'resolve' ? vso.resolutions : [],
  );
  const [_vpid, isRejection, capdata] =
    newResolutions.find(resolution => resolution[0] === resultVpid) ||
    Fail`unsettled by syscalls ${syscallLog.slice(oldSyscallCount)}`;
  if (isRejection) throw Error('rejected', { cause: kunser(capdata) });
  return kunser(capdata);
};

const eph1 = Far('ephemeral1');
const eph2 = Far('ephemeral2');

const initHolder = fields => ({ ...fields });
const holderMethods = {
  get: ({ state }, ...fields) =>
    // We require fields to be explicit because they are currently defined on
    // the state *prototype*.
    Object.fromEntries(
      fields.flatMap(key => (key in state ? [[key, state[key]]] : [])),
    ),
  set: ({ state }, fields) => {
    Object.assign(state, fields);
  },
};
/**
 * Define a virtual or durable kind for getting and setting state constrained
 * by the provided shape.
 *
 * @template {VatData.defineKind | VatData.defineDurableKind} D
 * @param {D} defineKind
 * @param {Parameters<D>[0]} kindIdentifier
 * @param {import('@endo/patterns').Pattern} stateShape
 */
const defineHolder = (defineKind, kindIdentifier, stateShape) =>
  defineKind(kindIdentifier, initHolder, holderMethods, { stateShape });

// virtual/durable Kinds can specify a 'stateShape', which should be
// enforced at both initialization and subsequent state changes
const testStateShape = test.macro((t, valueShape, config) => {
  const { goodValues, badValues, throwsExpectation } = config;
  const { vom } = makeFakeVirtualStuff();
  const { defineKind } = vom;
  const makeHolder = defineHolder(defineKind, 'kindTag', { value: valueShape });
  const instance = goodValues.map(value => makeHolder({ value })).at(-1);
  for (const value of goodValues) {
    instance.set({ value });
  }
  for (const value of badValues || []) {
    t.throws(() => makeHolder({ value }), throwsExpectation);
    t.throws(() => instance.set({ value }), throwsExpectation);
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
    return defineHolder(defineDurableKind, kh, { value: valueShape });
  };

  const makeKind1 = defineNextKind();
  makeKind1({ value: undefined });

  const makeKind2 = defineNextKind();
  makeKind2();

  const makeKind3 = defineNextKind(M.any());
  const obj3 = makeKind3();

  const makeKind4 = defineNextKind(M.string());
  const obj4 = makeKind4({ value: 'string' });

  const makeKind5 = defineNextKind(M.remotable());
  const durableValueFail = { message: /value for "value" is not durable/ };
  t.throws(() => makeKind5({ value: eph1 }), durableValueFail);

  const durableShapeFail = { message: /stateShape.*is not durable: slot 0 of/ };
  t.throws(() => defineNextKind(eph1), durableShapeFail);

  const makeKind7 = defineNextKind(obj4); // obj4 is durable
  makeKind7({ value: obj4 });
  const specificRemotableFail = { message: /kind3.*Must be:.*kind4/ };
  t.throws(() => makeKind7({ value: obj3 }), specificRemotableFail);
});

// durable Kinds maintain refcounts on their serialized stateShape
test('durable stateShape refcounts', async t => {
  const kvStore = new Map();
  const { syscall: sc1 } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  const ls1 = makeLiveSlots(sc1, 'vatA', {}, {}, gcTools, undefined, () => {
    const buildRootObject = (vatPowers, _vatParameters, baggage) => {
      const { VatData } = vatPowers;
      const { makeKindHandle, defineDurableKind } = VatData;

      return Far('root', {
        acceptRef: _ref => {}, // assigns a vref
        defineDurableKind: valueShape => {
          const kh = makeKindHandle('shaped');
          baggage.init('kh', kh);
          defineHolder(defineDurableKind, kh, { value: valueShape });
        },
      });
    };
    return { buildRootObject };
  });
  await ls1.dispatch(makeStartVat());
  const root = 'o+0';

  // accepting a ref but doing nothing with it does not increment its refcount
  const vref1 = 'o-1';
  await ls1.dispatch(makeMessage(root, 'acceptRef', [kslot(vref1)]));
  t.is(ls1.testHooks.getReachableRefCount(vref1), 0);

  // ...but using it in stateShape does
  await ls1.dispatch(makeMessage(root, 'defineDurableKind', [kslot(vref1)]));
  t.is(ls1.testHooks.getReachableRefCount(vref1), 1);

  // ------

  // Simulate upgrade by starting from the non-empty kvStore.
  const clonedStore = new Map(kvStore);
  const { syscall: sc2 } = buildSyscall({ kvStore: clonedStore });

  // to test refcount increment/decrement, we need to override the
  // usual rule that the new version must exactly match the original
  // stateShape
  const opts = { allowStateShapeChanges: true };
  const ls2 = makeLiveSlots(sc2, 'vatA', {}, opts, gcTools, undefined, () => {
    const buildRootObject = (vatPowers, vatParameters, baggage) => {
      const { VatData } = vatPowers;
      const { defineDurableKind } = VatData;
      const { valueShape } = vatParameters;
      const kh = baggage.get('kh');
      defineHolder(defineDurableKind, kh, { value: valueShape });

      return Far('root', {});
    };
    return { buildRootObject };
  });

  // redefining the durable kind's stateShape to replace its vref1 reference
  // with a vref2 reference will decrement the former refcount and increment the
  // latter
  const vref2 = 'o-2';
  const vatParameters = { valueShape: kslot(vref2) };
  await ls2.dispatch(makeStartVat(kser(vatParameters)));
  t.is(ls2.testHooks.getReachableRefCount(vref1), 0);
  t.is(ls2.testHooks.getReachableRefCount(vref2), 1);
});

test.failing('durable stateShape must match or extend', async t => {
  const store1 = new Map();
  const { syscall: sc1, log: log1 } = buildSyscall({ kvStore: store1 });
  const gcTools = makeMockGC();

  const fields = ['x', 'x2', 'y']; // but "x2" is not initially present
  const ls1 = makeLiveSlots(sc1, 'vatA', {}, {}, gcTools, undefined, () => {
    const buildRootObject = (vatPowers, _vatParameters, baggage) => {
      const { VatData } = vatPowers;
      const { makeKindHandle, defineDurableKind } = VatData;

      return Far('root', {
        makeShapedDurable: (x, y) => {
          const kh = makeKindHandle('shaped');
          baggage.init('kh', kh);
          const makeInstance = defineHolder(defineDurableKind, kh, { x, y });
          return makeInstance(harden({ x, y }));
        },
      });
    };
    return { buildRootObject };
  });
  await ls1.dispatch(makeStartVat());
  const root = 'o+0';

  const vref1 = 'o-1';
  const vref2 = 'o-2';
  const passables = new Map([
    [vref1, kslot(vref1, vref1)],
    [vref2, kslot(vref2, vref2)],
  ]);
  const instance1 = await dispatchForResult(ls1, log1, [
    root,
    'makeShapedDurable',
    [passables.get(vref1), passables.get(vref2)],
  ]);
  const objRef = instance1.getKref();
  const state1 = await dispatchForResult(ls1, log1, [objRef, 'get', fields]);
  t.deepEqual(
    kser(state1),
    kser({ x: passables.get(vref1), y: passables.get(vref2) }),
  );

  // ------

  // Simulate upgrade by starting from the non-empty kvStore.
  const store2 = new Map(store1);
  const { syscall: sc2, log: log2 } = buildSyscall({ kvStore: store2 });

  // we do *not* override allowStateShapeChanges
  // const opts = { allowStateShapeChanges: true };
  const opts = undefined;
  const stateShapeMismatch = { message: /durable Kind stateShape mismatch/ };
  const ls2 = makeLiveSlots(sc2, 'vatA', {}, opts, gcTools, undefined, () => {
    const buildRootObject = (vatPowers, vatParameters, baggage) => {
      const { VatData } = vatPowers;
      const { x, y } = vatParameters;
      const kh = baggage.get('kh');
      const redefineDurableKind = stateShape =>
        defineHolder(VatData.defineDurableKind, kh, stateShape);
      // several shapes that are not compatible
      const badShapes = [
        { x, y: M.any() },
        { x },
        { x, y, z: M.string() },
        { x: M.or(x, M.string()), y },
        { x: y, y: x }, // wrong slots
      ];
      for (const stateShape of badShapes) {
        t.throws(() => redefineDurableKind(stateShape), stateShapeMismatch);
      }
      // the correct shape
      redefineDurableKind({ x, y });

      return Far('root', {});
    };
    return { buildRootObject };
  });

  const vatParameters2 = { x: passables.get(vref1), y: passables.get(vref2) };
  await ls2.dispatch(makeStartVat(kser(vatParameters2)));

  const state2 = await dispatchForResult(ls2, log2, [objRef, 'get', fields]);
  t.deepEqual(kser(state2), kser(state1));

  // ------

  // Now upgrade again, first to add a new optional stateShape field x2 and then
  // to preserve the new shape.
  const store3 = new Map(store2);
  const { syscall: sc3, log: log3 } = buildSyscall({ kvStore: store3 });
  const ls3 = makeLiveSlots(sc3, 'vatA', {}, {}, gcTools, undefined, () => {
    const buildRootObject = ({ VatData }, vatParameters, baggage) => {
      const { x, y } = vatParameters;
      const kh = baggage.get('kh');
      const redefineDurableKind = stateShape =>
        defineHolder(VatData.defineDurableKind, kh, stateShape);
      const badShapes = [{ x, x2: x, y }];
      for (const stateShape of badShapes) {
        t.throws(() => redefineDurableKind(stateShape), stateShapeMismatch);
      }
      redefineDurableKind({ x, x2: M.or(M.undefined(), x), y });
      return Far('root', {});
    };
    return { buildRootObject };
  });
  const vatParameters3 = { x: passables.get(vref1), y: passables.get(vref2) };
  await ls3.dispatch(makeStartVat(kser(vatParameters3)));

  const state3 = await dispatchForResult(ls3, log3, [objRef, 'get', fields]);
  t.deepEqual(kser(state3), kser({ ...state1, x2: undefined }));
  const makeVerificationCase = (x, x2, y, throwsMessage) => [
    `{ x: ${x}, x2: ${x2}, y: ${y} }`,
    { x: passables.get(x), x2: passables.get(x2), y: passables.get(y) },
    throwsMessage,
  ];
  const verifications = [
    makeVerificationCase(vref1, vref2, vref2, 'rejected'),
    makeVerificationCase(vref1, vref1, vref2),
    makeVerificationCase(vref1, undefined, vref2),
  ];
  let lastState = state3;
  for (const [label, value, message] of verifications) {
    const tryUpdate = () =>
      dispatchForResult(ls3, log3, [objRef, 'set', [value]]);
    await (message
      ? t.throwsAsync(tryUpdate, { message }, `${label} ${message}`)
      : tryUpdate());
    const state = await dispatchForResult(ls3, log3, [objRef, 'get', fields]);
    const expectState = message ? lastState : value;
    t.deepEqual(kser(state), kser(expectState), `${label}`);
    lastState = state;
  }

  const store4 = new Map(store3);
  const { syscall: sc4, log: log4 } = buildSyscall({ kvStore: store4 });
  const ls4 = makeLiveSlots(sc4, 'vatA', {}, {}, gcTools, undefined, () => {
    const buildRootObject = ({ VatData }, vatParameters, baggage) => {
      const { x, y } = vatParameters;
      const kh = baggage.get('kh');
      const redefineDurableKind = stateShape =>
        defineHolder(VatData.defineDurableKind, kh, stateShape);
      const badShapes = [
        // Removing optionality from x2.
        { x, x2: x, y },
        // Equivalent but not *equal* to M.or(M.undefined(), x).
        { x, x2: M.or(undefined, x), y },
        { x, x2: M.or(x, M.undefined()), y },
      ];
      for (const stateShape of badShapes) {
        t.throws(() => redefineDurableKind(stateShape), stateShapeMismatch);
      }
      redefineDurableKind({ x, x2: M.or(M.undefined(), x), y });
      return Far('root', {});
    };
    return { buildRootObject };
  });
  const vatParameters4 = { x: passables.get(vref1), y: passables.get(vref2) };
  await ls4.dispatch(makeStartVat(kser(vatParameters4)));

  for (const [label, value, message] of verifications) {
    const tryUpdate = () =>
      dispatchForResult(ls4, log4, [objRef, 'set', [value]]);
    await (message
      ? t.throwsAsync(tryUpdate, { message }, `${label} ${message}`)
      : tryUpdate());
    const state = await dispatchForResult(ls4, log4, [objRef, 'get', fields]);
    const expectState = message ? lastState : value;
    t.deepEqual(kser(state), kser(expectState), `${label}`);
    lastState = state;
  }
});
