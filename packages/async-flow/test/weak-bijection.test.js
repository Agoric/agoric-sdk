// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Far } from '@endo/pass-style';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareWeakBijection } from '../src/weak-bijection.js';

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testBijection = (t, zone, { makeVowKit }) => {
  const makeBijection = prepareWeakBijection(zone);
  const bij = zone.makeOnce('bij', makeBijection);

  const h1 = zone.exo('h1', undefined, {});
  const h2 = zone.exo('h2', undefined, {});
  const h3 = zone.makeOnce('h3', () => makeVowKit().vow);
  t.true(isVow(h3));

  const g1 = Far('g1', {});
  const g2 = Far('g2', {});
  const g3 = harden(Promise.resolve('g3'));

  t.false(bij.has(g1, h1));
  bij.init(g1, h1);
  t.true(bij.has(g1, h1));
  t.throws(() => bij.init(g1, h2), {
    message:
      'key already bound: "[Alleged: g1]" -> "[Alleged: h1]" vs "[Alleged: h2]"',
  });
  t.throws(() => bij.init(g2, h1), {
    message:
      'key already bound: "[Alleged: h1]" -> "[Alleged: g1]" vs "[Alleged: g2]"',
  });
  t.throws(() => bij.has(g1, h2), {
    message:
      'internal: g->h "[Alleged: g1]" -> "[Alleged: h2]" vs "[Alleged: h1]"',
  });
  t.false(bij.has(g2, h2));
  bij.init(g2, h2);
  t.true(bij.has(g2, h2));

  t.false(bij.has(g3, h3));
  bij.init(g3, h3);
  t.true(bij.has(g3, h3));
  t.false(bij.has(h3, g3));
};

test('test heap bijection', t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  testBijection(t, zone, vowTools);
});

test.serial('test virtual bijection', t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  testBijection(t, zone, vowTools);
});

test.serial('test durable bijection', t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools1 = prepareWatchableVowTools(zone1);
  testBijection(t, zone1, vowTools1);

  // Bijections persist but revive empty since all the guests disappear anyway

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools2 = prepareWatchableVowTools(zone2);
  testBijection(t, zone2, vowTools2);
});
