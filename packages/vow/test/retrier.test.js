import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import test from '@endo/ses-ava/prepare-endo.js';

import { Fail } from '@endo/errors';
import { passStyleOf } from '@endo/pass-style';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { makeUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';

import { prepareVowTools } from '../vat.js';
import { prepareRetrierTools } from '../src/retrier.js';
import { isVow } from '../src/vow-utils.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 */

/** @type {ReturnType<typeof reincarnate>} */
let incarnation;

const annihilate = () => {
  incarnation = reincarnate({ relaxDurabilityRules: false });
};

const getBaggage = () => {
  return incarnation.fakeVomKit.cm.provideBaggage();
};

const nextLife = () => {
  incarnation = reincarnate(incarnation);
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const retrierPlay1 = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { retry, retrierAdmin } = prepareRetrierTools(zone, vowTools);

  const makeBob = zone.exoClass('Bob', undefined, count => ({ count }), {
    foo(carol) {
      const { state } = this;
      state.count += 1;
      carol.ping(state.count);
      if (state.count < 102) {
        throw makeUpgradeDisconnection('emulated upgrade1', state.count);
      } else {
        t.log('postponed at', state.count);
        return new Promise(() => {}); // never resolves
      }
    },
  });
  const bob = makeBob(100);
  const carol = zone.exo('carol', undefined, {
    ping(count) {
      t.log('ping at', count);
    },
  });
  const v = zone.makeOnce('v', () => retry(bob, 'foo', [carol]));
  t.true(isVow(v));
  t.is(passStyleOf(retrierAdmin.getRetrierForOutcomeVow(v)), 'remotable');
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const retrierPlay2 = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { when } = vowTools;
  const { retrierAdmin } = prepareRetrierTools(zone, vowTools);

  zone.exoClass('Bob', undefined, count => ({ count }), {
    foo(carol) {
      const { state } = this;
      t.true(state.count >= 102);
      state.count += 1;
      carol.ping(state.count);
      if (state.count < 104) {
        throw makeUpgradeDisconnection('emulated upgrade2', state.count);
      } else {
        return carol;
      }
    },
  });
  const carol = zone.exo('carol', undefined, {
    ping(count) {
      t.log('ping at', count);
    },
  });
  const v = zone.makeOnce('v', () => Fail`need v`);
  t.true(isVow(v));
  const retrier = retrierAdmin.getRetrierForOutcomeVow(v);

  // Emulate waking up after upgrade
  // Should only be needed because of low fidelity of this
  // lightweight upgrade testing framework.
  // TODO remove once ported to a higher fidelity upgrade testing framework.
  // See https://github.com/Agoric/agoric-sdk/issues/9303
  retrier.retry();
  t.is(await when(v), carol);
  t.log('carol finally returned');
};

test.serial('test heap retrier', async t => {
  const zone = makeHeapZone('heapRoot');
  return retrierPlay1(t, zone);
});

test.serial('test virtual retrier', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return retrierPlay1(t, zone);
});

test.serial('test durable retrier', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await retrierPlay1(t, zone1);

  await eventLoopIteration();

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  await retrierPlay2(t, zone2);
});
