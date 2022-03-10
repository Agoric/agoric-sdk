import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

const { vom, cm } = makeFakeVirtualStuff({ cacheSize: 3 });

const { makeScalarBigMapStore, makeScalarBigSetStore } = cm;

const { defineKind, defineDurableKind } = vom;

const initHolder = (held = null) => ({ held });
const actualizeHolder = state => ({
  hold: value => {
    state.held = value;
  },
});

const makeVirtualHolder = defineKind('holder', initHolder, actualizeHolder);
const makeDurableHolder = defineDurableKind(
  'holder',
  initHolder,
  actualizeHolder,
);

const aString = 'zorch!';
const aVirtualObject = makeVirtualHolder();
const aDurableObject = makeDurableHolder();
const aRemotableObject = Far('what', {
  aMethod() {
    return 'remote whatever';
  },
});
const aVirtualStore = makeScalarBigMapStore('vstore');
const aDurableStore = makeScalarBigMapStore('dstore', { durable: true });

const anObjectFullOfVirtualStuff = harden({
  aString,
  aVirtualObject,
  aDurableObject,
  aRemotableObject,
  aVirtualStore,
  aDurableStore,
});
const anObjectFullOfDurableStuff = harden({
  aString,
  aDurableObject,
  aDurableStore,
});
const anArrayFullOfVirtualStuff = harden([
  aString,
  aVirtualObject,
  aDurableObject,
  aRemotableObject,
  aVirtualStore,
  aDurableStore,
]);
const anArrayFullOfDurableStuff = harden([
  aString,
  aDurableObject,
  aDurableStore,
]);

function m(s) {
  return { message: s };
}

// prettier-ignore
test('durability checks', t => {
  const failKey = f => t.throws(f, m('key is not durable'));
  const failVal = f => t.throws(f, m('value is not durable'));
  const failHold = f => t.throws(f, m('value for "held" is not durable'));
  const passKey = f => t.notThrows(f);
  const passVal = f => t.notThrows(f);
  const passHold = f => t.notThrows(f);

  const virtualMap = makeScalarBigMapStore('vmap');
  const durableMap = makeScalarBigMapStore('dmap', { durable: true });

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

  passKey(() => durableMap.init(aString, 'simple string key'));
  passKey(() => durableMap.set(aString, 'revise string key'));
  failKey(() => durableMap.init(aVirtualObject, 'virtual object as key'));
  passKey(() => durableMap.init(aDurableObject, 'durable object as key'));
  passKey(() => durableMap.set(aDurableObject, 'revise durable object key'));
  failKey(() => durableMap.init(aRemotableObject, 'remotable object as key'));
  failKey(() => durableMap.init(aVirtualStore, 'virtual store as key'));
  passKey(() => durableMap.init(aDurableStore, 'durable store as key'));
  passKey(() => durableMap.set(aDurableStore, 'revise durable store key'));

  passVal(() => durableMap.init('simple string value', aString));
  failVal(() => durableMap.init('virtual object value', aVirtualObject));
  passVal(() => durableMap.init('durable object value', aDurableObject));
  failVal(() => durableMap.init('remotable object value', aRemotableObject));
  failVal(() => durableMap.init('virtual store value', aVirtualStore));
  passVal(() => durableMap.init('durable store value', aDurableStore));
  failVal(() => durableMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
  failVal(() => durableMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
  passVal(() => durableMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
  passVal(() => durableMap.init('array full of durable stuff', anArrayFullOfDurableStuff));

  passVal(() => durableMap.init('changeme', 47));
  passVal(() => durableMap.set('changeme', aString));
  failVal(() => durableMap.set('changeme', aVirtualObject));
  passVal(() => durableMap.set('changeme', aDurableObject));
  failVal(() => durableMap.set('changeme', aRemotableObject));
  failVal(() => durableMap.set('changeme', aVirtualStore));
  passVal(() => durableMap.set('changeme', aDurableStore));
  failVal(() => durableMap.set('changeme', anObjectFullOfVirtualStuff));
  failVal(() => durableMap.set('changeme', anArrayFullOfVirtualStuff));
  passVal(() => durableMap.set('changeme', anObjectFullOfDurableStuff));
  passVal(() => durableMap.set('changeme', anArrayFullOfDurableStuff));

  const virtualSet = makeScalarBigSetStore('vset');
  const durableSet = makeScalarBigSetStore('dset', { durable: true });

  passKey(() => virtualSet.add(aString));
  passKey(() => virtualSet.add(aVirtualObject));
  passKey(() => virtualSet.add(aDurableObject));
  passKey(() => virtualSet.add(aRemotableObject));
  passKey(() => virtualSet.add(aVirtualStore));
  passKey(() => virtualSet.add(aDurableStore));

  passKey(() => durableSet.add(aString));
  failKey(() => durableSet.add(aVirtualObject));
  passKey(() => durableSet.add(aDurableObject));
  failKey(() => durableSet.add(aRemotableObject));
  failKey(() => durableSet.add(aVirtualStore));
  passKey(() => durableSet.add(aDurableStore));

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

  const durableHolder = makeDurableHolder();

  passHold(() => makeDurableHolder(aString));
  failHold(() => makeDurableHolder(aVirtualObject));
  passHold(() => makeDurableHolder(aDurableObject));
  failHold(() => makeDurableHolder(aRemotableObject));
  failHold(() => makeDurableHolder(aVirtualStore));
  passHold(() => makeDurableHolder(aDurableStore));
  failHold(() => makeDurableHolder(anObjectFullOfVirtualStuff));
  failHold(() => makeDurableHolder(anArrayFullOfVirtualStuff));
  passHold(() => makeDurableHolder(anObjectFullOfDurableStuff));
  passHold(() => makeDurableHolder(anArrayFullOfDurableStuff));

  passHold(() => durableHolder.hold(aString));
  failHold(() => durableHolder.hold(aVirtualObject));
  passHold(() => durableHolder.hold(aDurableObject));
  failHold(() => durableHolder.hold(aRemotableObject));
  failHold(() => durableHolder.hold(aVirtualStore));
  passHold(() => durableHolder.hold(aDurableStore));
  failHold(() => durableHolder.hold(anObjectFullOfVirtualStuff));
  failHold(() => durableHolder.hold(anArrayFullOfVirtualStuff));
  passHold(() => durableHolder.hold(anObjectFullOfDurableStuff));
  passHold(() => durableHolder.hold(anArrayFullOfDurableStuff));
});
