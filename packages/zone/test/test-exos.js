// eslint-disable-next-line import/order
import {
  annihilate,
  getBaggage,
  nextLife,
  test,
} from './prepare-test-env-ava.js';

import { M } from '@agoric/store';
import * as vatData from '@agoric/vat-data';

import { makeDurableZone } from '../durable.js';
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';
import { agoricVatDataKeys as keys } from '../src/keys.js';

/** @typedef {import('../src/index.js').Zone} Zone */

// CAUTION: Do not modify this list; it exists to ensure that future versions
// of @agoric/zone are compatible with the baggage created by older versions,
// including the legacy implementation of @agoric/vat-data.
const agoricVatDataCompatibleKeys = [
  'Greeter_kindHandle',
  'GreeterKit_kindHandle',
  'a_kindHandle',
  'a_singleton',
  'mappish',
  'subsub',
].sort();

const bindAllMethodsTo = (obj, that = obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([name, fn]) => [name, fn.bind(that)]),
  );

const greetGuard = M.interface('Greeter', {
  greet: M.call().optional(M.string()).returns(M.string()),
});
const greetFacet = {
  greet(greeting = 'Hello') {
    return `${greeting}, ${this.state.nick}`;
  },
};

const adminGuard = M.interface('GreeterAdmin', {
  setNick: M.call(M.string()).returns(),
});
const adminFacet = {
  setNick(nick) {
    this.state.nick = nick;
  },
};

const combinedGuard = M.interface('GreeterWithAdmin', {
  ...greetGuard.methodGuards,
  ...adminGuard.methodGuards,
});

const alreadyExceptionSpec = {
  message: /has already been used/,
};

const prepareGreeterSingleton = (zone, label, nick) => {
  const myThis = Object.freeze({ state: { nick } });
  return zone.exo(label, combinedGuard, {
    ...bindAllMethodsTo(greetFacet, myThis),
    ...bindAllMethodsTo(adminFacet, myThis),
  });
};

const prepareGreeter = zone =>
  zone.exoClass('Greeter', combinedGuard, nick => ({ nick }), {
    ...greetFacet,
    ...adminFacet,
  });

const prepareGreeterKit = zone =>
  zone.exoClassKit(
    'GreeterKit',
    { greeter: greetGuard, admin: adminGuard },
    nick => ({ nick }),
    {
      greeter: greetFacet,
      admin: adminFacet,
    },
  );

const testGreeter = (t, nick, obj, adminObj = obj) => {
  t.is(obj.greet('Greetings'), `Greetings, ${nick}`);
  t.is(obj.greet(), `Hello, ${nick}`);
  adminObj.setNick(`${nick}2`);
  t.is(obj.greet('Greetings'), `Greetings, ${nick}2`);
  t.is(obj.greet(), `Hello, ${nick}2`);
  adminObj.setNick(nick);
};

/**
 * @template T
 * @param {import('ava').Assertions} t
 * @param {() => T} fn
 * @param {*} spec
 * @returns {T}
 */
const secondThrows = (t, fn, spec = alreadyExceptionSpec) => {
  const ret = fn();
  t.throws(fn, spec);
  return ret;
};

/**
 * @param {import('ava').Assertions} t
 * @param {MapStore} baggage
 */
const testFirstVatDataIncarnation = (t, baggage) => {
  const subBaggage = vatData.provideDurableMapStore(baggage, 'sub');

  const myThis = Object.freeze({ state: { nick: 'Singly' } });
  const singly = vatData.prepareExo(subBaggage, 'a', combinedGuard, {
    ...bindAllMethodsTo(greetFacet, myThis),
    ...bindAllMethodsTo(adminFacet, myThis),
  });
  testGreeter(t, 'Singly', singly);

  const makeGreeter = vatData.prepareExoClass(
    subBaggage,
    'Greeter',
    combinedGuard,
    nick => ({ nick }),
    {
      ...greetFacet,
      ...adminFacet,
    },
  );
  const classy = makeGreeter('Classy');
  testGreeter(t, 'Classy', classy);

  const makeGreeterKit = vatData.prepareExoClassKit(
    subBaggage,
    'GreeterKit',
    { greeter: greetGuard, admin: adminGuard },
    nick => ({ nick }),
    {
      greeter: greetFacet,
      admin: adminFacet,
    },
  );
  const { greeter: kitty, admin: kittyAdmin } = makeGreeterKit('Kitty');
  testGreeter(t, 'Kitty', kitty, kittyAdmin);

  const mappish = vatData.provideDurableMapStore(subBaggage, 'mappish');
  mappish.init('singly', singly);
  mappish.init('classy', classy);
  mappish.init('kitty', kitty);
  mappish.init('kittyAdmin', kittyAdmin);

  vatData.provideDurableMapStore(subBaggage, 'subsub');
};

/**
 * @param {import('ava').Assertions} t
 * @param {Zone} rootZone
 */
const testFirstZoneIncarnation = (t, rootZone) => {
  const subZone = secondThrows(t, () => rootZone.subZone('sub'));
  const singly = secondThrows(t, () =>
    prepareGreeterSingleton(subZone, 'a', 'Singly'),
  );
  testGreeter(t, 'Singly', singly);

  const makeGreeter = secondThrows(t, () => prepareGreeter(subZone));
  const classy = makeGreeter('Classy');
  testGreeter(t, 'Classy', classy);

  const makeGreeterKit = secondThrows(t, () => prepareGreeterKit(subZone));

  const { greeter: kitty, admin: kittyAdmin } = makeGreeterKit('Kitty');
  testGreeter(t, 'Kitty', kitty, kittyAdmin);

  const mappish = secondThrows(t, () => subZone.mapStore('mappish'));
  mappish.init('singly', singly);
  mappish.init('classy', classy);
  mappish.init('kitty', kitty);
  mappish.init('kittyAdmin', kittyAdmin);

  secondThrows(t, () => subZone.subZone('subsub'));
};

/**
 * @param {import('ava').Assertions} t
 * @param {Zone} rootZone
 */
const testSecondZoneIncarnation = (t, rootZone) => {
  const subZone = secondThrows(t, () => rootZone.subZone('sub'));
  const mappish = secondThrows(t, () => subZone.mapStore('mappish'));

  const singlyReload = secondThrows(t, () =>
    prepareGreeterSingleton(subZone, 'a', 'Singly'),
  );
  const makeGreeter = secondThrows(t, () => prepareGreeter(subZone));
  const makeGreeterKit = secondThrows(t, () => prepareGreeterKit(subZone));

  const singly = mappish.get('singly');
  t.is(singlyReload, singly);
  testGreeter(t, 'Singly', singly);
  testGreeter(t, 'Classy', mappish.get('classy'));
  testGreeter(t, 'Kitty', mappish.get('kitty'), mappish.get('kittyAdmin'));

  const classy2 = makeGreeter('Classy2');
  testGreeter(t, 'Classy2', classy2);

  const { greeter: kitty2, admin: kittyAdmin2 } = makeGreeterKit('Kitty2');
  testGreeter(t, 'Kitty2', kitty2, kittyAdmin2);
};

test('heapZone', t => {
  const zone = makeHeapZone();
  testFirstZoneIncarnation(t, zone);
});

test.serial('virtualZone', t => {
  annihilate();
  const zone = makeVirtualZone();
  testFirstZoneIncarnation(t, zone);
});

test.serial('durableZone', t => {
  annihilate();

  const expectedKeys = [
    ...keys.exo('a'),
    ...keys.exoClass('Greeter'),
    ...keys.exoClassKit('GreeterKit'),
    ...keys.store('mappish'),
    ...keys.zone('subsub'),
  ].sort();
  t.deepEqual(agoricVatDataCompatibleKeys, expectedKeys);

  nextLife();
  const baggage1 = getBaggage();
  testFirstZoneIncarnation(t, makeDurableZone(baggage1));
  t.deepEqual(
    [...baggage1.get('sub').keys()].sort(),
    agoricVatDataCompatibleKeys,
  );

  nextLife();
  const baggage2 = getBaggage();
  t.deepEqual(
    [...baggage2.get('sub').keys()].sort(),
    agoricVatDataCompatibleKeys,
  );
  testSecondZoneIncarnation(t, makeDurableZone(baggage2));
});

test.serial('vatData migrate to durableZone', t => {
  annihilate();

  const baggage1 = getBaggage();
  testFirstVatDataIncarnation(t, baggage1);
  t.deepEqual(
    [...baggage1.get('sub').keys()].sort(),
    agoricVatDataCompatibleKeys,
  );

  nextLife();
  const baggage2 = getBaggage();
  testSecondZoneIncarnation(t, makeDurableZone(baggage2));
});
