// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Far } from '@endo/pass-style';
import { prepareVowTools } from '@agoric/vow';
import { isVow, toPassableCap } from '@agoric/vow/src/vow-utils.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareBijection } from '../src/bijection.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Ephemera} from './types.js';
 */

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testBijection = (t, zone) => {
  const { makeVowKit } = prepareVowTools(zone);
  const makeBijection = prepareBijection(zone);
  const bij = zone.makeOnce('bij', makeBijection);

  const h1 = zone.exo('h1', undefined, {});
  const h2 = zone.exo('h2', undefined, {});
  const h3 = zone.makeOnce('h3', () => makeVowKit().vow);
  t.true(isVow(h3));

  const g1 = Far('g1', {});
  const g2 = Far('g2', {});
  const g3 = harden(Promise.resolve('g3'));

  t.false(bij.has(g1, h1));
  t.throws(() => bij.guestToHost(g1), {
    message: 'guestToHost key not found: "[Alleged: g1]"',
  });
  t.throws(() => bij.hostToGuest(h1), {
    message: 'hostToGuest key not found: "[Alleged: h1]"',
  });
  t.false(bij.hasGuest(g1));
  t.false(bij.hasHost(h1));
  t.false(bij.hasGuest(h1));
  t.false(bij.hasHost(g1));

  bij.unwrapInit(g1, h1);

  t.true(bij.has(g1, h1));
  t.is(toPassableCap(bij.guestToHost(g1)), toPassableCap(h1));
  t.is(bij.hostToGuest(h1), g1);
  t.true(bij.hasGuest(g1));
  t.true(bij.hasHost(h1));
  t.false(bij.hasGuest(h1));
  t.false(bij.hasHost(g1));

  t.throws(() => bij.unwrapInit(g1, h2), {
    message:
      'guestToHost key already bound: "[Alleged: g1]" -> "[Alleged: h1]" vs "[Alleged: h2]"',
  });
  t.throws(() => bij.unwrapInit(g2, h1), {
    message:
      'hostToGuest key already bound: "[Alleged: h1]" -> "[Alleged: g1]" vs "[Alleged: g2]"',
  });
  t.throws(() => bij.has(g1, h2), {
    message:
      'internal: g->h "[Alleged: g1]" -> "[Alleged: h2]" vs "[Alleged: h1]"',
  });
  t.false(bij.has(g2, h2));
  bij.unwrapInit(g2, h2);
  t.true(bij.has(g2, h2));

  t.false(bij.has(g3, h3));
  bij.unwrapInit(g3, h3);
  t.true(bij.has(g3, h3));
  t.false(bij.has(h3, g3));
};

test('test heap bijection', t => {
  const zone = makeHeapZone('heapRoot');
  testBijection(t, zone);
});

test.serial('test virtual bijection', t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  testBijection(t, zone);
});

test.serial('test durable bijection', t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  testBijection(t, zone1);

  // Bijections persist but revive empty since all the guests disappear anyway

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  testBijection(t, zone2);
});

test('test heap bijection reset', t => {
  const zone = makeHeapZone('heapRoot');
  const makeBijection = prepareBijection(zone);
  const bij = makeBijection();

  const h1 = zone.exo('h1', undefined, {});
  const g1 = Far('g1', {});

  t.false(bij.has(g1, h1));
  bij.unwrapInit(g1, h1);
  t.true(bij.has(g1, h1));
  bij.reset();
  t.false(bij.has(g1, h1));
});
