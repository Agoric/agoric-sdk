import { M } from '@endo/patterns';
import {
  annihilate,
  getBaggage,
  nextLife,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import * as vatData from '@agoric/vat-data';

import { agoricVatDataKeys as keys } from '@agoric/base-zone';
import {
  agoricVatDataCompatibleKeys,
  testFirstZoneIncarnation,
  testSecondZoneIncarnation,
  testGreeter,
} from '@agoric/base-zone/tools/testers.js';
import * as g from '@agoric/base-zone/tools/greeter.js';

import { makeDurableZone } from '../durable.js';
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';

/**
 * @param {import('ava').Assertions} t
 * @param {MapStore} baggage
 */
const testFirstVatDataIncarnation = (t, baggage) => {
  const subBaggage = vatData.provideDurableMapStore(baggage, 'sub');

  const myThis = Object.freeze({ state: { nick: 'Singly' } });
  const singly = vatData.prepareExo(subBaggage, 'a', g.GreeterWithAdminI, {
    ...g.bindAllMethodsTo(g.greetFacet, myThis),
    ...g.bindAllMethodsTo(g.adminFacet, myThis),
  });
  testGreeter(t, 'Singly', singly);

  const makeGreeter = vatData.prepareExoClass(
    subBaggage,
    'Greeter',
    g.GreeterWithAdminI,
    nick => ({ nick }),
    {
      ...g.greetFacet,
      ...g.adminFacet,
    },
  );
  const classy = makeGreeter('Classy');
  testGreeter(t, 'Classy', classy);

  const makeGreeterKit = vatData.prepareExoClassKit(
    subBaggage,
    'GreeterKit',
    { greeter: g.GreeterI, admin: g.GreeterAdminI },
    nick => ({ nick }),
    {
      greeter: g.greetFacet,
      admin: g.adminFacet,
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

test.serial('exoClass stateShape expansion', t => {
  annihilate();

  // See ../../swingset-liveslots/test/virtual-objects/state-shape.test.js
  const stateShapeMismatch = { message: /stateShape mismatch/ };
  const HolderI = M.interface('Holder', {
    get: M.call().rest(M.arrayOf(M.string())).returns(M.record()),
    set: M.call(M.record()).returns(),
  });
  const initHolder = fields => ({ ...fields });
  const holderMethods = {
    get(...fields) {
      const { state } = this;
      // We require fields to be explicit because they are currently defined on
      // the state *prototype*.
      return Object.fromEntries(
        fields.flatMap(key => (key in state ? [[key, state[key]]] : [])),
      );
    },
    set(fields) {
      Object.assign(this.state, fields);
    },
  };
  const prepareHolder = (zone, stateShape) =>
    zone.exoClass('Holder', HolderI, initHolder, holderMethods, { stateShape });

  const fields = ['foo', 'bar', 'baz']; // but "baz" is not initially present
  const baggage1 = getBaggage();
  const zone1 = makeDurableZone(baggage1);
  const makeHolder1 = prepareHolder(zone1, {
    foo: M.number(),
    bar: M.number(),
  });
  const holder1 = makeHolder1({ foo: 0, bar: 1 });
  t.deepEqual(holder1.get(...fields), { foo: 0, bar: 1 });
  holder1.set({ foo: 2, bar: 2 });
  t.deepEqual(holder1.get(...fields), { foo: 2, bar: 2 });
  t.throws(() => makeHolder1({ foo: 0, bar: 1, baz: 2 }));
  t.throws(() => makeHolder1({ foo: 0, bar: 'string' }));

  nextLife();
  t.throws(
    () =>
      prepareHolder(makeDurableZone(getBaggage()), {
        foo: M.string(),
        bar: M.number(),
      }),
    stateShapeMismatch,
    'backwards-incompatible stateShape change',
  );

  nextLife();
  t.throws(
    () =>
      prepareHolder(makeDurableZone(getBaggage()), {
        foo: M.or(M.number(), M.string()),
        bar: M.number(),
        baz: M.or(undefined, M.number()),
      }),
    stateShapeMismatch,
    'stateShape field value expansion (needs #7407)',
  );

  nextLife();
  const baggage2 = getBaggage();
  const zone2 = makeDurableZone(baggage2);
  const makeHolder2 = prepareHolder(zone2, {
    foo: M.number(),
    bar: M.number(),
    baz: M.or(undefined, M.number()),
  });
  const holder2 = makeHolder2({ foo: 0, bar: 1, baz: 2 });
  t.deepEqual(holder2.get(...fields), { foo: 0, bar: 1, baz: 2 });
  holder2.set({ foo: 2, bar: 2, baz: undefined });
  t.deepEqual(holder2.get(...fields), { foo: 2, bar: 2, baz: undefined });
});
