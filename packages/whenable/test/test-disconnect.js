// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { makeTagged } from '@endo/pass-style';
import { prepareWhenableModule } from '../src/module.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @returns {import('ava').ImplementationFn<[]>}
 */
const testRetryOnDisconnect = zone => async t => {
  const rejectionMeansRetry = e => e && e.message === 'disconnected';

  const { watch, when } = prepareWhenableModule(zone, {
    rejectionMeansRetry,
  });
  const makeTestWhenableV0 = zone.exoClass(
    'TestWhenableV0',
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

  for await (const watchWhenable of [false, true]) {
    t.log('testing watchWhenable', watchWhenable);
    for await (const [final, ...plan] of PLANS) {
      t.log(`testing (plan=${plan}, watchWhenable=${watchWhenable})`);

      /** @type {import('../src/types.js').Whenable<string>} */
      const whenable = makeTagged('Whenable', {
        whenableV0: makeTestWhenableV0(plan),
      });

      let resultP;
      if (watchWhenable) {
        const resultW = watch(whenable, {
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
        resultP = when(whenable).catch(e => ['rejected', e]);
      }

      switch (plan[final]) {
        case 'happy': {
          t.is(
            await resultP,
            'resolved',
            `resolve expected (plan=${plan}, watchWhenable=${watchWhenable})`,
          );
          break;
        }
        case 'sad': {
          t.like(
            await resultP,
            ['rejected', Error('dejected')],
            `reject expected (plan=${plan}, watchWhenable=${watchWhenable})`,
          );
          break;
        }
        default: {
          t.fail(`unknown final plan step ${plan[final]}`);
        }
      }
    }
  }
};

test('retry on disconnection', testRetryOnDisconnect(makeHeapZone()));
