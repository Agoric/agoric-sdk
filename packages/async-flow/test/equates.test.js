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
import { makeEquatesKit } from '../src/equates.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 */

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {boolean} [showOnConsole]
 */
const testEquates = (t, zone, showOnConsole = false) => {
  const { makeVowKit } = prepareVowTools(zone);
  const makeBijection = prepareBijection(zone);
  const bij = zone.makeOnce('bij', makeBijection);

  t.throws(() => zone.makeOnce('equates', () => makeEquatesKit(bij).equates), {
    message: 'maker return value "[Function equates]" is not storable',
  });

  const { equates, mustEquate } = makeEquatesKit(bij);

  t.true(equates(8, 8));
  t.false(equates(8, 9));
  t.throws(() => mustEquate(8, 9), {
    message: 'unequal 8 vs 9',
  });
  const h1 = zone.exo('h1', undefined, {});
  const h2 = zone.makeOnce('h2', () => makeVowKit().vow);
  t.true(isVow(h2));

  const g1 = Far('g1', {});
  const g2 = harden(Promise.resolve('g2'));

  t.throws(() => equates(g1, h1), {
    message:
      'cannot yet send guest remotables to host "[Alleged: g1]" vs "[Alleged: h1]"',
  });
  bij.unwrapInit(g1, h1);
  t.true(equates(g1, h1));
  t.false(equates(g1, h2));
  t.throws(() => mustEquate(g1, h2), {
    message: 'unequal passStyles "remotable" vs "tagged"',
  });

  t.throws(() => mustEquate(g2, h1), {
    message: 'unequal passStyles "promise" vs "remotable"',
  });
  bij.unwrapInit(g2, h2);
  t.true(equates(g2, h2));

  t.throws(() => mustEquate(g1, h2), {
    message: 'unequal passStyles "remotable" vs "tagged"',
  });
  t.throws(() => mustEquate(g2, h1), {
    message: 'unequal passStyles "promise" vs "remotable"',
  });
  t.true(equates(harden([g1, g2]), harden([h1, h2])));
  t.throws(() => mustEquate(harden([g1, g2]), harden([h1, h1])), {
    message: '[1]: unequal passStyles "promise" vs "remotable"',
  });
  const gErr1 = harden(makeError(X`error ${'redacted message'}`, URIError));
  const hErr1 = harden(makeError(X`another message`, URIError));
  const gErr2 = harden(makeError(X`another error`, TypeError));

  t.true(equates(gErr1, hErr1));
  t.throws(() => mustEquate(gErr2, hErr1), {
    message: 'error name: unequal "TypeError" vs "URIError"',
  });
  if (showOnConsole) {
    // To see the annotation chain. Once we're synced with the next ses-ava,
    // change this to a t.log, so we will see the annotation chain in context.
    t.log('hErr1', hErr1);
  }
};

test('test heap equates', t => {
  const zone = makeHeapZone('heapRoot');
  testEquates(t, zone, asyncFlowVerbose());
});

test.serial('test virtual equates', t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  testEquates(t, zone);
});

test.serial('test durable equates', t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  testEquates(t, zone1);

  // equates keeps its state only in the bijection,
  // which loses all its memory between incarnations.

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  testEquates(t, zone2);
});
