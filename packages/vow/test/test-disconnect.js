// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { makeTagged } from '@endo/pass-style';
import { prepareVowTools } from '../src/tools.js';

test('retry on disconnection', async t => {
  const zone = makeHeapZone();
  const rejectionMeansRetry = e => e && e.message === 'disconnected';

  const { watch, when } = prepareVowTools(zone, {
    rejectionMeansRetry,
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

  const PLANS = [
    [0, 'happy'],
    [0, 'sad', 'happy'],
    [1, 'disco', 'happy'],
    [1, 'disco', 'sad'],
    [1, 'disco', 'sad', 'disco', 'happy'],
    [2, 'disco', 'disco', 'happy'],
    [2, 'disco', 'disco', 'sad'],
  ];

  for await (const watchVow of [false, true]) {
    t.log('testing watchVow', watchVow);
    for await (const [final, ...plan] of PLANS) {
      t.log(`testing (plan=${plan}, watchVow=${watchVow})`);

      /** @type {import('../src/types.js').Vow<string>} */
      const vow = makeTagged('Vow', {
        vowV0: makeTestVowV0(plan),
      });

      let resultP;
      if (watchVow) {
        const resultW = watch(vow, {
          onFulfilled(value) {
            t.is(plan[final], 'happy');
            t.is(value, 'resolved');
            return value;
          },
          onRejected(reason) {
            t.is(plan[final], 'sad');
            t.is(reason && reason.message, 'dejected');
            return ['rejected', reason];
          },
        });
        t.is('then' in resultW, false, 'watch resultW.then is undefined');
        resultP = when(resultW);
      } else {
        resultP = when(vow).catch(e => ['rejected', e]);
      }

      switch (plan[final]) {
        case 'happy': {
          t.is(
            await resultP,
            'resolved',
            `resolve expected (plan=${plan}, watchVow=${watchVow})`,
          );
          break;
        }
        case 'sad': {
          t.like(
            await resultP,
            ['rejected', Error('dejected')],
            `reject expected (plan=${plan}, watchVow=${watchVow})`,
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
