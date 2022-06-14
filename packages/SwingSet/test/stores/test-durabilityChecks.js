import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

const { vom, cm } = makeFakeVirtualStuff({ cacheSize: 3 });

const {
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
} = cm;

const { defineKind, defineDurableKind, makeKindHandle } = vom;

const durableHolderKind = makeKindHandle('holder');
const fakeDurableHolderKind = makeKindHandle('fholder');

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
const makeFakeDurableHolder = defineDurableKind(
  fakeDurableHolderKind,
  initHolder,
  holderBehavior,
  { fakeDurable: true },
);

const aString = 'zorch!';
const aVirtualObject = makeVirtualHolder();
const aDurableObject = makeDurableHolder();
const aFakeDurableObject = makeFakeDurableHolder();
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
const aFakeDurableStore = makeScalarBigMapStore('fdstore', {
  fakeDurable: true,
});

const anObjectFullOfVirtualStuff = harden({
  aString,
  aVirtualObject,
  aDurableObject,
  aFakeDurableObject,
  aRemotableObject,
  aVirtualStore,
  aDurableStore,
  aFakeDurableStore,
  durableHolderKind,
  fakeDurableHolderKind,
});
const anObjectFullOfDurableStuff = harden({
  aString,
  aDurableObject,
  aFakeDurableObject,
  aDurableStore,
  aFakeDurableStore,
  durableHolderKind,
  fakeDurableHolderKind,
});
const anArrayFullOfVirtualStuff = harden([
  aString,
  aVirtualObject,
  aDurableObject,
  aFakeDurableObject,
  aRemotableObject,
  aVirtualStore,
  aDurableStore,
  aFakeDurableStore,
  durableHolderKind,
  fakeDurableHolderKind,
]);
const anArrayFullOfDurableStuff = harden([
  aString,
  aDurableObject,
  aFakeDurableObject,
  aDurableStore,
  aFakeDurableStore,
  durableHolderKind,
  fakeDurableHolderKind,
]);

function m(s) {
  return { message: s };
}

// prettier-ignore
test('durability checks', t => {
  const failKey = f => t.throws(f, m(/^key .* is not durable in /));
  const failVal = f => t.throws(f, m(/^value is not durable: /));
  const failHold = f => t.throws(f, m(/^value for "held" is not durable/));
  const passKey = f => t.notThrows(f);
  const passVal = f => t.notThrows(f);
  const passHold = f => t.notThrows(f);

  const failNonKey = f => t.throws(f, m(/invalid key type for collection .*/));

  const virtualMap = makeScalarBigMapStore('vmap');
  const durableMap = makeScalarBigMapStore('dmap', { durable: true });
  const fakeDurableMap = makeScalarBigMapStore('fdmap', { fakeDurable: true });

  passKey(() => virtualMap.init(aString, 'simple string key'));
  passKey(() => virtualMap.set(aString, 'revise string key'));
  passKey(() => virtualMap.init(aVirtualObject, 'virtual object as key'));
  passKey(() => virtualMap.set(aVirtualObject, 'revise virtual object key'));
  passKey(() => virtualMap.init(aDurableObject, 'durable object as key'));
  passKey(() => virtualMap.set(aDurableObject, 'revise durable object key'));
  passKey(() => virtualMap.init(aFakeDurableObject, 'fake durable object as key'));
  passKey(() => virtualMap.set(aFakeDurableObject, 'revise fake durable object key'));
  passKey(() => virtualMap.init(aRemotableObject, 'remotable object as key'));
  passKey(() => virtualMap.set(aRemotableObject, 'revise remotable object key'));
  passKey(() => virtualMap.init(aVirtualStore, 'virtual store as key'));
  passKey(() => virtualMap.set(aVirtualStore, 'revise virtual store key'));
  passKey(() => virtualMap.init(aDurableStore, 'durable store as key'));
  passKey(() => virtualMap.set(aDurableStore, 'revise durable store key'));
  passKey(() => virtualMap.init(aFakeDurableStore, 'fake durable store as key'));
  passKey(() => virtualMap.set(aFakeDurableStore, 'revise fake durable store key'));
  passKey(() => virtualMap.init(durableHolderKind, 'durable kind as key'));
  passKey(() => virtualMap.set(durableHolderKind, 'revise durable kind key'));
  passKey(() => virtualMap.init(fakeDurableHolderKind, 'fake durable kind as key'));
  passKey(() => virtualMap.set(fakeDurableHolderKind, 'revise fake durable kind key'));

  passKey(() => virtualMap.init('simple string value', aString));
  passKey(() => virtualMap.init('virtual object value', aVirtualObject));
  passKey(() => virtualMap.init('durable object value', aDurableObject));
  passKey(() => virtualMap.init('fake durable object value', aFakeDurableObject));
  passKey(() => virtualMap.init('remotable object value', aRemotableObject));
  passKey(() => virtualMap.init('virtual store value', aVirtualStore));
  passKey(() => virtualMap.init('durable store value', aDurableStore));
  passKey(() => virtualMap.init('fake durable store value', aFakeDurableStore));
  passKey(() => virtualMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
  passKey(() => virtualMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
  passKey(() => virtualMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
  passKey(() => virtualMap.init('array full of durable stuff', anArrayFullOfDurableStuff));
  passKey(() => virtualMap.init('durable kind', durableHolderKind));
  passKey(() => virtualMap.init('fake durable kind', fakeDurableHolderKind));

  passKey(() => virtualMap.init('changeme', 47));
  passKey(() => virtualMap.set('changeme', aString));
  passKey(() => virtualMap.set('changeme', aVirtualObject));
  passKey(() => virtualMap.set('changeme', aDurableObject));
  passKey(() => virtualMap.set('changeme', aFakeDurableObject));
  passKey(() => virtualMap.set('changeme', aRemotableObject));
  passKey(() => virtualMap.set('changeme', aVirtualStore));
  passKey(() => virtualMap.set('changeme', aDurableStore));
  passKey(() => virtualMap.set('changeme', aFakeDurableStore));
  passKey(() => virtualMap.set('changeme', anObjectFullOfVirtualStuff));
  passKey(() => virtualMap.set('changeme', anArrayFullOfVirtualStuff));
  passKey(() => virtualMap.set('changeme', anObjectFullOfDurableStuff));
  passKey(() => virtualMap.set('changeme', anArrayFullOfDurableStuff));
  passKey(() => virtualMap.set('changeme', durableHolderKind));
  passKey(() => virtualMap.set('changeme', fakeDurableHolderKind));

  passKey(() => durableMap.init(aString, 'simple string key'));
  passKey(() => durableMap.set(aString, 'revise string key'));
  failKey(() => durableMap.init(aVirtualObject, 'virtual object as key'));
  passKey(() => durableMap.init(aDurableObject, 'durable object as key'));
  passKey(() => durableMap.set(aDurableObject, 'revise durable object key'));
  passKey(() => durableMap.init(aFakeDurableObject, 'fake durable object as key'));
  passKey(() => durableMap.set(aFakeDurableObject, 'revise fake durable object key'));
  failKey(() => durableMap.init(aRemotableObject, 'remotable object as key'));
  failKey(() => durableMap.init(aVirtualStore, 'virtual store as key'));
  passKey(() => durableMap.init(aDurableStore, 'durable store as key'));
  passKey(() => durableMap.set(aDurableStore, 'revise durable store key'));
  passKey(() => durableMap.init(aFakeDurableStore, 'fake durable store as key'));
  passKey(() => durableMap.set(aFakeDurableStore, 'revise fake durable store key'));
  passKey(() => durableMap.init(durableHolderKind, 'durable kind as key'));
  passKey(() => durableMap.set(durableHolderKind, 'revise durable kind key'));
  passKey(() => durableMap.init(fakeDurableHolderKind, 'fake durable kind as key'));
  passKey(() => durableMap.set(fakeDurableHolderKind, 'revise fake durable kind key'));

  passVal(() => durableMap.init('simple string value', aString));
  failVal(() => durableMap.init('virtual object value', aVirtualObject));
  passVal(() => durableMap.init('durable object value', aDurableObject));
  passVal(() => durableMap.init('fake durable object value', aFakeDurableObject));
  failVal(() => durableMap.init('remotable object value', aRemotableObject));
  failVal(() => durableMap.init('virtual store value', aVirtualStore));
  passVal(() => durableMap.init('durable store value', aDurableStore));
  passVal(() => durableMap.init('fake durable store value', aFakeDurableStore));
  failVal(() => durableMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
  failVal(() => durableMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
  passVal(() => durableMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
  passVal(() => durableMap.init('array full of durable stuff', anArrayFullOfDurableStuff));
  passVal(() => durableMap.init('durable kind', durableHolderKind));
  passVal(() => durableMap.init('fake durable kind', fakeDurableHolderKind));

  passVal(() => durableMap.init('changeme', 47));
  passVal(() => durableMap.set('changeme', aString));
  failVal(() => durableMap.set('changeme', aVirtualObject));
  passVal(() => durableMap.set('changeme', aDurableObject));
  passVal(() => durableMap.set('changeme', aFakeDurableObject));
  failVal(() => durableMap.set('changeme', aRemotableObject));
  failVal(() => durableMap.set('changeme', aVirtualStore));
  passVal(() => durableMap.set('changeme', aDurableStore));
  passVal(() => durableMap.set('changeme', aFakeDurableStore));
  failVal(() => durableMap.set('changeme', anObjectFullOfVirtualStuff));
  failVal(() => durableMap.set('changeme', anArrayFullOfVirtualStuff));
  passVal(() => durableMap.set('changeme', anObjectFullOfDurableStuff));
  passVal(() => durableMap.set('changeme', anArrayFullOfDurableStuff));
  passVal(() => durableMap.set('changeme', durableHolderKind));
  passVal(() => durableMap.set('changeme', fakeDurableHolderKind));

  passKey(() => fakeDurableMap.init(aString, 'simple string key'));
  passKey(() => fakeDurableMap.set(aString, 'revise string key'));
  passKey(() => fakeDurableMap.init(aVirtualObject, 'virtual object as key'));
  passKey(() => fakeDurableMap.set(aVirtualObject, 'revise virtual object key'));
  passKey(() => fakeDurableMap.init(aDurableObject, 'durable object as key'));
  passKey(() => fakeDurableMap.set(aDurableObject, 'revise durable object key'));
  passKey(() => fakeDurableMap.init(aFakeDurableObject, 'fake durable object as key'));
  passKey(() => fakeDurableMap.set(aFakeDurableObject, 'revise fake durable object key'));
  passKey(() => fakeDurableMap.init(aRemotableObject, 'remotable object as key'));
  passKey(() => fakeDurableMap.set(aRemotableObject, 'revise remotable object key'));
  passKey(() => fakeDurableMap.init(aVirtualStore, 'virtual store as key'));
  passKey(() => fakeDurableMap.set(aVirtualStore, 'revise virtual store key'));
  passKey(() => fakeDurableMap.init(aDurableStore, 'durable store as key'));
  passKey(() => fakeDurableMap.set(aDurableStore, 'revise durable store key'));
  passKey(() => fakeDurableMap.init(aFakeDurableStore, 'fake durable store as key'));
  passKey(() => fakeDurableMap.set(aFakeDurableStore, 'revise fake durable store key'));
  passKey(() => fakeDurableMap.init(durableHolderKind, 'durable kind as key'));
  passKey(() => fakeDurableMap.set(durableHolderKind, 'revise durable kind key'));
  passKey(() => fakeDurableMap.init(fakeDurableHolderKind, 'fake durable kind as key'));
  passKey(() => fakeDurableMap.set(fakeDurableHolderKind, 'revise fake durable kind key'));

  passKey(() => fakeDurableMap.init('simple string value', aString));
  passKey(() => fakeDurableMap.init('virtual object value', aVirtualObject));
  passKey(() => fakeDurableMap.init('durable object value', aDurableObject));
  passKey(() => fakeDurableMap.init('fake durable object value', aFakeDurableObject));
  passKey(() => fakeDurableMap.init('remotable object value', aRemotableObject));
  passKey(() => fakeDurableMap.init('virtual store value', aVirtualStore));
  passKey(() => fakeDurableMap.init('durable store value', aDurableStore));
  passKey(() => fakeDurableMap.init('fake durable store value', aFakeDurableStore));
  passKey(() => fakeDurableMap.init('object full of virtual stuff', anObjectFullOfVirtualStuff));
  passKey(() => fakeDurableMap.init('array full of virtual stuff', anArrayFullOfVirtualStuff));
  passKey(() => fakeDurableMap.init('object full of durable stuff', anObjectFullOfDurableStuff));
  passKey(() => fakeDurableMap.init('array full of durable stuff', anArrayFullOfDurableStuff));
  passKey(() => fakeDurableMap.init('durable kind', durableHolderKind));
  passKey(() => fakeDurableMap.init('fake durable kind', fakeDurableHolderKind));

  passKey(() => fakeDurableMap.init('changeme', 47));
  passKey(() => fakeDurableMap.set('changeme', aString));
  passKey(() => fakeDurableMap.set('changeme', aVirtualObject));
  passKey(() => fakeDurableMap.set('changeme', aDurableObject));
  passKey(() => fakeDurableMap.set('changeme', aFakeDurableObject));
  passKey(() => fakeDurableMap.set('changeme', aRemotableObject));
  passKey(() => fakeDurableMap.set('changeme', aVirtualStore));
  passKey(() => fakeDurableMap.set('changeme', aDurableStore));
  passKey(() => fakeDurableMap.set('changeme', aFakeDurableStore));
  passKey(() => fakeDurableMap.set('changeme', anObjectFullOfVirtualStuff));
  passKey(() => fakeDurableMap.set('changeme', anArrayFullOfVirtualStuff));
  passKey(() => fakeDurableMap.set('changeme', anObjectFullOfDurableStuff));
  passKey(() => fakeDurableMap.set('changeme', anArrayFullOfDurableStuff));
  passKey(() => fakeDurableMap.set('changeme', durableHolderKind));
  passKey(() => fakeDurableMap.set('changeme', fakeDurableHolderKind));

  const virtualSet = makeScalarBigSetStore('vset');
  const durableSet = makeScalarBigSetStore('dset', { durable: true });
  const fakeDurableSet = makeScalarBigSetStore('fdset', { fakeDurable: true });

  passKey(() => virtualSet.add(aString));
  passKey(() => virtualSet.add(aVirtualObject));
  passKey(() => virtualSet.add(aDurableObject));
  passKey(() => virtualSet.add(aFakeDurableObject));
  passKey(() => virtualSet.add(aRemotableObject));
  passKey(() => virtualSet.add(aVirtualStore));
  passKey(() => virtualSet.add(aDurableStore));
  passKey(() => virtualSet.add(aFakeDurableStore));
  passKey(() => virtualSet.add(durableHolderKind));
  passKey(() => virtualSet.add(fakeDurableHolderKind));

  passKey(() => durableSet.add(aString));
  failKey(() => durableSet.add(aVirtualObject));
  passKey(() => durableSet.add(aDurableObject));
  passKey(() => durableSet.add(aFakeDurableObject));
  failKey(() => durableSet.add(aRemotableObject));
  failKey(() => durableSet.add(aVirtualStore));
  passKey(() => durableSet.add(aDurableStore));
  passKey(() => durableSet.add(aFakeDurableStore));
  passKey(() => durableSet.add(durableHolderKind));
  passKey(() => durableSet.add(fakeDurableHolderKind));

  passKey(() => fakeDurableSet.add(aString));
  passKey(() => fakeDurableSet.add(aVirtualObject));
  passKey(() => fakeDurableSet.add(aDurableObject));
  passKey(() => fakeDurableSet.add(aFakeDurableObject));
  passKey(() => fakeDurableSet.add(aRemotableObject));
  passKey(() => fakeDurableSet.add(aVirtualStore));
  passKey(() => fakeDurableSet.add(aDurableStore));
  passKey(() => fakeDurableSet.add(aFakeDurableStore));
  passKey(() => fakeDurableSet.add(durableHolderKind));
  passKey(() => fakeDurableSet.add(fakeDurableHolderKind));

  const virtualHolder = makeVirtualHolder();

  passHold(() => makeVirtualHolder(aString));
  passHold(() => makeVirtualHolder(aVirtualObject));
  passHold(() => makeVirtualHolder(aDurableObject));
  passHold(() => makeVirtualHolder(aFakeDurableObject));
  passHold(() => makeVirtualHolder(aRemotableObject));
  passHold(() => makeVirtualHolder(aVirtualStore));
  passHold(() => makeVirtualHolder(aDurableStore));
  passHold(() => makeVirtualHolder(aFakeDurableStore));
  passHold(() => makeVirtualHolder(anObjectFullOfVirtualStuff));
  passHold(() => makeVirtualHolder(anArrayFullOfVirtualStuff));
  passHold(() => makeVirtualHolder(anObjectFullOfDurableStuff));
  passHold(() => makeVirtualHolder(anArrayFullOfDurableStuff));
  passHold(() => makeVirtualHolder(durableHolderKind));
  passHold(() => makeVirtualHolder(fakeDurableHolderKind));

  passHold(() => virtualHolder.hold(aString));
  passHold(() => virtualHolder.hold(aVirtualObject));
  passHold(() => virtualHolder.hold(aDurableObject));
  passHold(() => virtualHolder.hold(aFakeDurableObject));
  passHold(() => virtualHolder.hold(aRemotableObject));
  passHold(() => virtualHolder.hold(aVirtualStore));
  passHold(() => virtualHolder.hold(aDurableStore));
  passHold(() => virtualHolder.hold(aFakeDurableStore));
  passHold(() => virtualHolder.hold(anObjectFullOfVirtualStuff));
  passHold(() => virtualHolder.hold(anArrayFullOfVirtualStuff));
  passHold(() => virtualHolder.hold(anObjectFullOfDurableStuff));
  passHold(() => virtualHolder.hold(anArrayFullOfDurableStuff));
  passHold(() => virtualHolder.hold(durableHolderKind));
  passHold(() => virtualHolder.hold(fakeDurableHolderKind));

  const durableHolder = makeDurableHolder();

  passHold(() => makeDurableHolder(aString));
  failHold(() => makeDurableHolder(aVirtualObject));
  passHold(() => makeDurableHolder(aDurableObject));
  passHold(() => makeDurableHolder(aFakeDurableObject));
  failHold(() => makeDurableHolder(aRemotableObject));
  failHold(() => makeDurableHolder(aVirtualStore));
  passHold(() => makeDurableHolder(aDurableStore));
  passHold(() => makeDurableHolder(aFakeDurableStore));
  failHold(() => makeDurableHolder(anObjectFullOfVirtualStuff));
  failHold(() => makeDurableHolder(anArrayFullOfVirtualStuff));
  passHold(() => makeDurableHolder(anObjectFullOfDurableStuff));
  passHold(() => makeDurableHolder(anArrayFullOfDurableStuff));
  passHold(() => makeDurableHolder(durableHolderKind));
  passHold(() => makeDurableHolder(fakeDurableHolderKind));

  passHold(() => durableHolder.hold(aString));
  failHold(() => durableHolder.hold(aVirtualObject));
  passHold(() => durableHolder.hold(aDurableObject));
  passHold(() => durableHolder.hold(aFakeDurableObject));
  failHold(() => durableHolder.hold(aRemotableObject));
  failHold(() => durableHolder.hold(aVirtualStore));
  passHold(() => durableHolder.hold(aDurableStore));
  passHold(() => durableHolder.hold(aFakeDurableStore));
  failHold(() => durableHolder.hold(anObjectFullOfVirtualStuff));
  failHold(() => durableHolder.hold(anArrayFullOfVirtualStuff));
  passHold(() => durableHolder.hold(anObjectFullOfDurableStuff));
  passHold(() => durableHolder.hold(anArrayFullOfDurableStuff));
  passHold(() => durableHolder.hold(durableHolderKind));
  passHold(() => durableHolder.hold(fakeDurableHolderKind));

  const fakeDurableHolder = makeFakeDurableHolder();

  passHold(() => makeFakeDurableHolder(aString));
  passHold(() => makeFakeDurableHolder(aVirtualObject));
  passHold(() => makeFakeDurableHolder(aDurableObject));
  passHold(() => makeFakeDurableHolder(aFakeDurableObject));
  passHold(() => makeFakeDurableHolder(aRemotableObject));
  passHold(() => makeFakeDurableHolder(aVirtualStore));
  passHold(() => makeFakeDurableHolder(aDurableStore));
  passHold(() => makeFakeDurableHolder(aFakeDurableStore));
  passHold(() => makeFakeDurableHolder(anObjectFullOfVirtualStuff));
  passHold(() => makeFakeDurableHolder(anArrayFullOfVirtualStuff));
  passHold(() => makeFakeDurableHolder(anObjectFullOfDurableStuff));
  passHold(() => makeFakeDurableHolder(anArrayFullOfDurableStuff));
  passHold(() => makeFakeDurableHolder(durableHolderKind));
  passHold(() => makeFakeDurableHolder(fakeDurableHolderKind));

  passHold(() => fakeDurableHolder.hold(aString));
  passHold(() => fakeDurableHolder.hold(aVirtualObject));
  passHold(() => fakeDurableHolder.hold(aDurableObject));
  passHold(() => fakeDurableHolder.hold(aFakeDurableObject));
  passHold(() => fakeDurableHolder.hold(aRemotableObject));
  passHold(() => fakeDurableHolder.hold(aVirtualStore));
  passHold(() => fakeDurableHolder.hold(aDurableStore));
  passHold(() => fakeDurableHolder.hold(aFakeDurableStore));
  passHold(() => fakeDurableHolder.hold(anObjectFullOfVirtualStuff));
  passHold(() => fakeDurableHolder.hold(anArrayFullOfVirtualStuff));
  passHold(() => fakeDurableHolder.hold(anObjectFullOfDurableStuff));
  passHold(() => fakeDurableHolder.hold(anArrayFullOfDurableStuff));
  passHold(() => fakeDurableHolder.hold(durableHolderKind));
  passHold(() => fakeDurableHolder.hold(fakeDurableHolderKind));

  failNonKey(() => virtualMap.init(aPassablePromise, 47));
  failNonKey(() => virtualMap.init(aPassableError, 47));
  failNonKey(() => virtualMap.init(aNonScalarKey, 47));
  failNonKey(() => virtualMap.init(aNonScalarNonKey, 47));

  failNonKey(() => durableMap.init(aPassablePromise, 47));
  failNonKey(() => durableMap.init(aPassableError, 47));
  failNonKey(() => durableMap.init(aNonScalarKey, 47));
  failNonKey(() => durableMap.init(aNonScalarNonKey, 47));

  failNonKey(() => fakeDurableMap.init(aPassablePromise, 47));
  failNonKey(() => fakeDurableMap.init(aPassableError, 47));
  failNonKey(() => fakeDurableMap.init(aNonScalarKey, 47));
  failNonKey(() => fakeDurableMap.init(aNonScalarNonKey, 47));

  passVal(() => virtualMap.init('promise', aPassablePromise));
  passVal(() => virtualMap.init('error', aPassableError));
  passVal(() => virtualMap.init('non-scalar key', aNonScalarKey));
  passVal(() => virtualMap.init('non-scalar non-key', aNonScalarNonKey));

  failVal(() => durableMap.init('promise', aPassablePromise));
  passVal(() => durableMap.init('error', aPassableError));
  passVal(() => durableMap.init('non-scalar key', aNonScalarKey));
  passVal(() => durableMap.init('non-scalar non-key', aNonScalarNonKey));

  passVal(() => fakeDurableMap.init('promise', aPassablePromise));
  passVal(() => fakeDurableMap.init('error', aPassableError));
  passVal(() => fakeDurableMap.init('non-scalar key', aNonScalarKey));
  passVal(() => fakeDurableMap.init('non-scalar non-key', aNonScalarNonKey));
});

test('fake durability flag sanity', t => {
  const badOpts = { durable: true, fakeDurable: true };
  t.throws(() => makeScalarBigMapStore('badflag1', badOpts), {
    message: 'durable and fakeDurable are mutually exclusive',
  });
  t.throws(() => makeScalarBigWeakMapStore('badflag2', badOpts), {
    message: 'durable and fakeDurable are mutually exclusive',
  });
  t.throws(() => makeScalarBigSetStore('badflag3', badOpts), {
    message: 'durable and fakeDurable are mutually exclusive',
  });
  t.throws(() => makeScalarBigWeakSetStore('badflag4', badOpts), {
    message: 'durable and fakeDurable are mutually exclusive',
  });
  t.throws(
    () =>
      defineKind('badflag5', initHolder, holderBehavior, { fakeDurable: true }),
    {
      message: 'the fakeDurable option may only be applied to durable objects',
    },
  );
});
