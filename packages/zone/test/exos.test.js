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
