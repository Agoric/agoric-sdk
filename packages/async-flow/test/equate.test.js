// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
  asyncFlowVerbose,
} from './prepare-test-env-ava.js';

import { X, makeError } from '@endo/errors';
import { Far } from '@endo/pass-style';
import { prepareVowTools } from '@agoric/vow';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareBijection } from '../src/bijection.js';
import { makeEquate } from '../src/equate.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 */

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {boolean} [showOnConsole]
 */
const testEquate = (t, zone, showOnConsole = false) => {
  const { makeVowKit } = prepareVowTools(zone);
  const makeBijection = prepareBijection(zone);
  const bij = zone.makeOnce('bij', makeBijection);

  t.throws(() => zone.makeOnce('equate', () => makeEquate(bij)), {
    message: 'maker return value "[Function equate]" is not storable',
  });

  const equate = makeEquate(bij);

  equate(8, 8);
  t.throws(() => equate(8, 9), {
    message: 'unequal 8 vs 9',
  });

  const h1 = zone.exo('h1', undefined, {});
  const h2 = zone.makeOnce('h2', () => makeVowKit().vow);
  t.true(isVow(h2));

  const g1 = Far('g1', {});
  const g2 = harden(Promise.resolve('g2'));

  t.throws(() => equate(g1, h1), {
    message:
      'cannot yet send guest remotables to host "[Alleged: g1]" vs "[Alleged: h1]"',
  });
  bij.unwrapInit(g1, h1);
  t.notThrows(() => equate(g1, h1));
  t.throws(() => equate(g1, h2), {
    message: 'unequal passStyles "remotable" vs "tagged"',
  });
  t.throws(() => equate(g2, h1), {
    message: 'unequal passStyles "promise" vs "remotable"',
  });
  bij.unwrapInit(g2, h2);
  equate(g2, h2);

  t.throws(() => equate(g1, h2), {
    message: 'unequal passStyles "remotable" vs "tagged"',
  });
  t.throws(() => equate(g2, h1), {
    message: 'unequal passStyles "promise" vs "remotable"',
  });

  equate(harden([g1, g2]), harden([h1, h2]));
  t.throws(() => equate(harden([g1, g2]), harden([h1, h1])), {
    message: '[1]: unequal passStyles "promise" vs "remotable"',
  });

  const gErr1 = harden(makeError(X`error ${'redacted message'}`, URIError));
  const hErr1 = harden(makeError(X`another message`, URIError));
  const gErr2 = harden(makeError(X`another error`, TypeError));

  equate(gErr1, hErr1);
  t.throws(() => equate(gErr2, hErr1), {
    message: 'error name: unequal "TypeError" vs "URIError"',
  });

  if (showOnConsole) {
    // To see the annotation chain. Once we're synced with the next ses-ava,
    // change this to a t.log, so we will see the annotation chain in context.
    t.log('hErr1', hErr1);
  }
};

test('test heap equate', t => {
  const zone = makeHeapZone('heapRoot');
  testEquate(t, zone, asyncFlowVerbose());
});

test.serial('test virtual equate', t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  testEquate(t, zone);
});

test.serial('test durable equate', t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  testEquate(t, zone1);

  // equate keeps its state only in the bijection,
  // which loses all its memory between incarnations.

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  testEquate(t, zone2);
});
