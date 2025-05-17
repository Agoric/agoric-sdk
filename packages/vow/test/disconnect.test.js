// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { makeTagged } from '@endo/pass-style';
import { prepareBasicVowTools } from '../src/tools.js';

/** @import {Vow} from '../src/types.js' */

test('retry on disconnection', async t => {
  const zone = makeHeapZone();
  const isRetryableReason = e => e && e.message === 'disconnected';

  const { watch, when } = prepareBasicVowTools(zone, {
    isRetryableReason,
  });
  const makeTestVowV0 = zone.exoClass(
    'TestVowV0',
    undefined,
    plan => ({ plan }),
    {
      shorten() {
        const { plan } = this.state;
        const [step, ...rest] = plan;
        this.state.plan = rest;
        switch (step) {
          case 'disco': {
            const p = Promise.reject(Error('disconnected'));
            return p;
          }
          case 'happy': {
            const p = Promise.resolve('resolved');
            return p;
          }
          case 'sad': {
            const p = Promise.reject(Error('dejected'));
            return p;
          }
          default: {
            return Promise.reject(Error(`unknown plan step ${step}`));
          }
        }
      },
    },
  );
  const makeFinalWatcher = zone.exoClass(
    'FinalWatcher',
    undefined,
    final => ({ final }),
    {
      onFulfilled(value) {
        t.is(this.state.final, 'happy');
        t.is(value, 'resolved');
        return value;
      },
      onRejected(reason) {
        t.is(this.state.final, 'sad');
        t.is(reason && reason.message, 'dejected');
        return ['rejected', reason];
      },
    },
  );

  const PLANS = [
    [0, 'happy'],
    [0, 'sad', 'happy'],
    [1, 'disco', 'happy'],
    [1, 'disco', 'sad'],
    [1, 'disco', 'sad', 'disco', 'happy'],
    [2, 'disco', 'disco', 'happy'],
    [2, 'disco', 'disco', 'sad'],
  ];

  for await (const pattern of [
    'when',
    'when-with-handlers',
    'watch',
    'watch-with-handler',
  ]) {
    t.log('testing', pattern);
    for await (const [final, ...plan] of PLANS) {
      t.log(`testing (plan=${plan}, ${pattern})`);

      /** @type {Vow<string>} */
      const vow = makeTagged('Vow', {
        vowV0: makeTestVowV0(plan),
      });

      let resultP;
      switch (pattern) {
        case 'watch-with-handler': {
          const resultW = watch(vow, makeFinalWatcher(plan[final]));
          t.is('then' in resultW, false, 'watch resultW.then is undefined');
          resultP = when(resultW);
          break;
        }
        case 'watch': {
          const resultW = watch(vow);
          t.is('then' in resultW, false, 'watch resultW.then is undefined');
          resultP = when(resultW).catch(e => ['rejected', e]);
          break;
        }
        case 'when': {
          resultP = when(vow).catch(e => ['rejected', e]);
          break;
        }
        case 'when-with-handlers': {
          resultP = when(
            vow,
            v => v,
            e => ['rejected', e],
          );
          break;
        }
        default: {
          t.fail(`unknown pattern ${pattern}`);
        }
      }

      switch (plan[final]) {
        case 'happy': {
          t.is(
            await resultP,
            'resolved',
            `resolve expected (plan=${plan}, ${pattern})`,
          );
          break;
        }
        case 'sad': {
          t.like(
            await resultP,
            ['rejected', Error('dejected')],
            `reject expected (plan=${plan}, ${pattern})`,
          );
          break;
        }
        default: {
          t.fail(`unknown final plan step ${plan[final]}`);
        }
      }
    }
  }
});
