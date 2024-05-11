// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
  asyncFlowVerbose,
} from './prepare-test-env-ava.js';

import { X, makeError, q } from '@endo/errors';
import { Far, getInterfaceOf, passStyleOf } from '@endo/pass-style';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { makeConvertKit } from '../src/convert.js';
import { prepareWeakBijection } from '../src/weak-bijection.js';

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {boolean} [showOnConsole]
 */
const testConvert = (t, zone, { makeVowKit }, showOnConsole = false) => {
  const makeBijection = prepareWeakBijection(zone);
  const bij = zone.makeOnce('bij', makeBijection);

  const makeGuestForHostRemotable = hRem => {
    const iface = getInterfaceOf(hRem);
    return Far(`${iface} guest wrapper`, {});
  };

  const makeGuestForHostVow = _hVow => Promise.resolve('guest P');

  const { guestToHost, hostToGuest } = makeConvertKit(
    bij,
    makeGuestForHostRemotable,
    makeGuestForHostVow,
  );

  t.is(hostToGuest(8), 8);
  const h1 = zone.exo('h1', undefined, {});
  const h2 = zone.exo('h2', undefined, {});
  const h3 = zone.makeOnce('h3', () => makeVowKit().vow);
  t.true(isVow(h3));

  const g1 = hostToGuest(h1);
  const g2 = hostToGuest(h2);
  const g3 = hostToGuest(h3);
  t.is(passStyleOf(g1), 'remotable');
  t.is(passStyleOf(g2), 'remotable');
  t.is(passStyleOf(g3), 'promise');
  t.not(g1, g2);
  t.is(hostToGuest(h1), g1);
  t.is(hostToGuest(h2), g2);
  t.is(hostToGuest(h3), g3);

  const h4 = harden(makeError(X`open ${'redacted'} ${q('quoted')}`));
  const g4a = hostToGuest(h4);
  const g4b = hostToGuest(h4);
  t.not(g4a, g4b);
  t.deepEqual(g4a, g4b);

  t.is(guestToHost(g1), h1);
  t.is(guestToHost(g2), h2);
  t.is(guestToHost(g3), h3);

  t.deepEqual(guestToHost(harden([g1, g3])), harden([h1, h3]));

  const gErr1 = harden(makeError(X`error ${'redacted message'}`, URIError));
  const hErr1 = guestToHost(gErr1);
  const gErr2 = hostToGuest(hErr1);

  t.not(gErr1, hErr1);
  t.not(hErr1, gErr2);
  t.not(gErr1, gErr2);
  t.is(gErr1.name, 'URIError');
  t.is(hErr1.name, 'URIError');
  t.is(gErr2.name, 'URIError');

  if (showOnConsole) {
    t.log('gErr2', gErr2);
  }
};

test('test heap convert', t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  testConvert(t, zone, vowTools, asyncFlowVerbose());
});

test.serial('test virtual convert', t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  testConvert(t, zone, vowTools);
});

test.serial('test durable convert', t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools1 = prepareWatchableVowTools(zone1);
  testConvert(t, zone1, vowTools1);

  // These converters keep their state only in the bijection,
  // which loses all its memory between incarnations.

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools2 = prepareWatchableVowTools(zone2);
  testConvert(t, zone2, vowTools2);
});
