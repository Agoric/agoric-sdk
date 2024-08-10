import test from 'ava';

import { Far } from '@endo/marshal';
import { makeFakeVirtualStuff } from '../tools/fakeVirtualSupport.js';

async function runDurabilityCheckTest(t, relaxDurabilityRules) {
  const { vom, cm } = makeFakeVirtualStuff({
    relaxDurabilityRules,
  });
  const strict = !relaxDurabilityRules;

  const { makeScalarBigMapStore, makeScalarBigSetStore } = cm;

  const { defineKind, defineDurableKind, makeKindHandle } = vom;

  const durableHolderKind = makeKindHandle('holder');

  /** @param {any} held */
  const initHolder = (held = null) => ({ held });
  const holderBehavior = {
    hold: ({ state }, value) => {
      state.held = value;
    },
  };

  const makeVirtualHolder = defineKind('holder', initHolder, holderBehavior);
  const makeDurableHolder = defineDurableKind(
    durableHolderKind,
    initHolder,
    holderBehavior,
  );

  const aString = 'zorch!';
  const aVirtualObject = makeVirtualHolder();
  const aDurableObject = makeDurableHolder();
  const aRemotableObject = Far('what', {
    aMethod() {
      return 'remote whatever';
    },
  });
  const aPassablePromise = harden(Promise.resolve(aString));
  const aPassableError = harden(Error(aString));
  const aNonScalarKey = harden([]);
  const aNonScalarNonKey = harden([aPassableError]);

  const aVirtualStore = makeScalarBigMapStore('vstore');
  const aDurableStore = makeScalarBigMapStore('dstore', { durable: true });

  const anObjectFullOfVirtualStuff = harden({
    aString,
    aVirtualObject,
    aDurableObject,
    aRemotableObject,
    aVirtualStore,
    aDurableStore,
    durableHolderKind,
  });
  const anObjectFullOfDurableStuff = harden({
    aString,
    aDurableObject,
    aDurableStore,
    durableHolderKind,
  });
  const anArrayFullOfVirtualStuff = harden([
    aString,
    aVirtualObject,
    aDurableObject,
    aRemotableObject,
    aVirtualStore,
    aDurableStore,
    durableHolderKind,
  ]);
  const anArrayFullOfDurableStuff = harden([
    aString,
    aDurableObject,
    aDurableStore,
    durableHolderKind,
  ]);

  function m(s) {
    return { message: s };
  }

  const failKey = f => t.throws(f, m(/^key .* is not durable in /));
  const failVal = f => t.throws(f, m(/^value is not durable: /));
  const failHold = f => t.throws(f, m(/^value for "held" is not durable/));
  const passKey = f => t.notThrows(f);
  const passVal = f => t.notThrows(f);
  const passHold = f => t.notThrows(f);

  const condKey = f => (strict ? failKey(f) : passKey(f));
  const condVal = f => (strict ? failVal(f) : passVal(f));
  const condHold = f => (strict ? failHold(f) : passHold(f));

  const failNonKey = f => t.throws(f, m(/invalid key type for collection .*/));

  const virtualMap = makeScalarBigMapStore('vmap');
  const durableMap = makeScalarBigMapStore('dmap', { durable: true });

  // prettier-ignore
  {
    passKey(() => virtualMap.init(aString, 'simple string key'));
    passKey(() => virtualMap.set(aString, 'revise string key'));
    passKey(() => virtualMap.init(aVirtualObject, 'virtual object as key'));
    passKey(() => virtualMap.set(aVirtualObject, 'revise virtual object key'));
    passKey(() => virtualMap.init(aDurableObject, 'durable object as key'));
    passKey(() => virtualMap.set(aDurableObject, 'revise durable object key'));
    passKey(() => virtualMap.init(aRemotableObject, 'remotable object as key'));
    passKey(() => virtualMap.set(aRemotableObject, 'revise remotable object key'));
    passKey(() => virtualMap.init(aVirtualStore, 'virtual store as key'));
    passKey(() => virtualMap.set(aVirtualStore, 'revise virtual store key'));
    passKey(() => virtualMap.init(aDurableStore, 'durable store as key'));
    passKey(() => virtualMap.set(aDurableStore, 'revise durable store key'));
    passKey(() => virtualMap.init(durableHolderKind, 'durable kind as key'));
    passKey(() => virtualMap.set(durableHolderKind, 'revise durable kind key'));

    passKey(() => virtualMap.init('simple string value', aString));
    passKey(() => virtualMap.init('virtual object value', aVirtualObject));
    passKey(() => virtualMap.init('durable object value', aDurableObject));
    passKey(() => virtualMap.init('remotable object value', aRemotableObject));
    passKey(() => virtualMap.init('virtual store value', aVirtualStore));
    passKey(() => virtualMap.init('durable store value', aDurableStore));
    passKey(() => virtualMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
    passKey(() => virtualMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
    passKey(() => virtualMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
    passKey(() => virtualMap.init('array full of durable stuff', anArrayFullOfDurableStuff));
    passKey(() => virtualMap.init('durable kind', durableHolderKind));

    passKey(() => virtualMap.init('changeme', 47));
    passKey(() => virtualMap.set('changeme', aString));
    passKey(() => virtualMap.set('changeme', aVirtualObject));
    passKey(() => virtualMap.set('changeme', aDurableObject));
    passKey(() => virtualMap.set('changeme', aRemotableObject));
    passKey(() => virtualMap.set('changeme', aVirtualStore));
    passKey(() => virtualMap.set('changeme', aDurableStore));
    passKey(() => virtualMap.set('changeme', anObjectFullOfVirtualStuff));
    passKey(() => virtualMap.set('changeme', anArrayFullOfVirtualStuff));
    passKey(() => virtualMap.set('changeme', anObjectFullOfDurableStuff));
    passKey(() => virtualMap.set('changeme', anArrayFullOfDurableStuff));
    passKey(() => virtualMap.set('changeme', durableHolderKind));

    passKey(() => durableMap.init(aString, 'simple string key'));
    passKey(() => durableMap.set(aString, 'revise string key'));
    condKey(() => durableMap.init(aVirtualObject, 'virtual object as key'));
    passKey(() => durableMap.init(aDurableObject, 'durable object as key'));
    passKey(() => durableMap.set(aDurableObject, 'revise durable object key'));
    condKey(() => durableMap.init(aRemotableObject, 'remotable object as key'));
    condKey(() => durableMap.init(aVirtualStore, 'virtual store as key'));
    passKey(() => durableMap.init(aDurableStore, 'durable store as key'));
    passKey(() => durableMap.set(aDurableStore, 'revise durable store key'));
    passKey(() => durableMap.init(durableHolderKind, 'durable kind as key'));
    passKey(() => durableMap.set(durableHolderKind, 'revise durable kind key'));

    passVal(() => durableMap.init('simple string value', aString));
    condVal(() => durableMap.init('virtual object value', aVirtualObject));
    passVal(() => durableMap.init('durable object value', aDurableObject));
    condVal(() => durableMap.init('remotable object value', aRemotableObject));
    condVal(() => durableMap.init('virtual store value', aVirtualStore));
    passVal(() => durableMap.init('durable store value', aDurableStore));
    condVal(() => durableMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
    condVal(() => durableMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
    passVal(() => durableMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
    passVal(() => durableMap.init('array full of durable stuff', anArrayFullOfDurableStuff));
    passVal(() => durableMap.init('durable kind', durableHolderKind));

    passVal(() => durableMap.init('changeme', 47));
    passVal(() => durableMap.set('changeme', aString));
    condVal(() => durableMap.set('changeme', aVirtualObject));
    passVal(() => durableMap.set('changeme', aDurableObject));
    condVal(() => durableMap.set('changeme', aRemotableObject));
    condVal(() => durableMap.set('changeme', aVirtualStore));
    passVal(() => durableMap.set('changeme', aDurableStore));
    condVal(() => durableMap.set('changeme', anObjectFullOfVirtualStuff));
    condVal(() => durableMap.set('changeme', anArrayFullOfVirtualStuff));
    passVal(() => durableMap.set('changeme', anObjectFullOfDurableStuff));
    passVal(() => durableMap.set('changeme', anArrayFullOfDurableStuff));
    passVal(() => durableMap.set('changeme', durableHolderKind));

    const virtualSet = makeScalarBigSetStore('vset');
    const durableSet = makeScalarBigSetStore('dset', { durable: true });

    passKey(() => virtualSet.add(aString));
    passKey(() => virtualSet.add(aVirtualObject));
    passKey(() => virtualSet.add(aDurableObject));
    passKey(() => virtualSet.add(aRemotableObject));
    passKey(() => virtualSet.add(aVirtualStore));
    passKey(() => virtualSet.add(aDurableStore));
    passKey(() => virtualSet.add(durableHolderKind));

    passKey(() => durableSet.add(aString));
    condKey(() => durableSet.add(aVirtualObject));
    passKey(() => durableSet.add(aDurableObject));
    condKey(() => durableSet.add(aRemotableObject));
    condKey(() => durableSet.add(aVirtualStore));
    passKey(() => durableSet.add(aDurableStore));
    passKey(() => durableSet.add(durableHolderKind));

    const virtualHolder = makeVirtualHolder();

    passHold(() => makeVirtualHolder(aString));
    passHold(() => makeVirtualHolder(aVirtualObject));
    passHold(() => makeVirtualHolder(aDurableObject));
    passHold(() => makeVirtualHolder(aRemotableObject));
    passHold(() => makeVirtualHolder(aVirtualStore));
    passHold(() => makeVirtualHolder(aDurableStore));
    passHold(() => makeVirtualHolder(anObjectFullOfVirtualStuff));
    passHold(() => makeVirtualHolder(anArrayFullOfVirtualStuff));
    passHold(() => makeVirtualHolder(anObjectFullOfDurableStuff));
    passHold(() => makeVirtualHolder(anArrayFullOfDurableStuff));
    passHold(() => makeVirtualHolder(durableHolderKind));

    passHold(() => virtualHolder.hold(aString));
    passHold(() => virtualHolder.hold(aVirtualObject));
    passHold(() => virtualHolder.hold(aDurableObject));
    passHold(() => virtualHolder.hold(aRemotableObject));
    passHold(() => virtualHolder.hold(aVirtualStore));
    passHold(() => virtualHolder.hold(aDurableStore));
    passHold(() => virtualHolder.hold(anObjectFullOfVirtualStuff));
    passHold(() => virtualHolder.hold(anArrayFullOfVirtualStuff));
    passHold(() => virtualHolder.hold(anObjectFullOfDurableStuff));
    passHold(() => virtualHolder.hold(anArrayFullOfDurableStuff));
    passHold(() => virtualHolder.hold(durableHolderKind));

    const durableHolder = makeDurableHolder();

    passHold(() => makeDurableHolder(aString));
    condHold(() => makeDurableHolder(aVirtualObject));
    passHold(() => makeDurableHolder(aDurableObject));
    condHold(() => makeDurableHolder(aRemotableObject));
    condHold(() => makeDurableHolder(aVirtualStore));
    passHold(() => makeDurableHolder(aDurableStore));
    condHold(() => makeDurableHolder(anObjectFullOfVirtualStuff));
    condHold(() => makeDurableHolder(anArrayFullOfVirtualStuff));
    passHold(() => makeDurableHolder(anObjectFullOfDurableStuff));
    passHold(() => makeDurableHolder(anArrayFullOfDurableStuff));
    passHold(() => makeDurableHolder(durableHolderKind));

    passHold(() => durableHolder.hold(aString));
    condHold(() => durableHolder.hold(aVirtualObject));
    passHold(() => durableHolder.hold(aDurableObject));
    condHold(() => durableHolder.hold(aRemotableObject));
    condHold(() => durableHolder.hold(aVirtualStore));
    passHold(() => durableHolder.hold(aDurableStore));
    condHold(() => durableHolder.hold(anObjectFullOfVirtualStuff));
    condHold(() => durableHolder.hold(anArrayFullOfVirtualStuff));
    passHold(() => durableHolder.hold(anObjectFullOfDurableStuff));
    passHold(() => durableHolder.hold(anArrayFullOfDurableStuff));
    passHold(() => durableHolder.hold(durableHolderKind));

    failNonKey(() => virtualMap.init(aPassablePromise, 47));
    failNonKey(() => virtualMap.init(aPassableError, 47));
    failNonKey(() => virtualMap.init(aNonScalarKey, 47));
    failNonKey(() => virtualMap.init(aNonScalarNonKey, 47));

    failNonKey(() => durableMap.init(aPassablePromise, 47));
    failNonKey(() => durableMap.init(aPassableError, 47));
    failNonKey(() => durableMap.init(aNonScalarKey, 47));
    failNonKey(() => durableMap.init(aNonScalarNonKey, 47));

    passVal(() => virtualMap.init('promise', aPassablePromise));
    passVal(() => virtualMap.init('error', aPassableError));
    passVal(() => virtualMap.init('non-scalar key', aNonScalarKey));
    passVal(() => virtualMap.init('non-scalar non-key', aNonScalarNonKey));

    failVal(() => durableMap.init('promise', aPassablePromise));
    passVal(() => durableMap.init('error', aPassableError));
    passVal(() => durableMap.init('non-scalar key', aNonScalarKey));
    passVal(() => durableMap.init('non-scalar non-key', aNonScalarNonKey));
  }
}

test('durability checks (strict)', runDurabilityCheckTest, false);
test('durability checks (relaxed)', runDurabilityCheckTest, true);
