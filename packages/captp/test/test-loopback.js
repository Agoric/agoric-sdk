/* global harden */

import '@agoric/install-ses';
import test from 'ava';
import { E, makeFar } from '../lib/captp';

test('try loopback captp', async t => {
  const pr = {};
  pr.p = new Promise((resolve, reject) => {
    pr.res = resolve;
    pr.rej = reject;
  });

  const syncHandle = harden({});
  const syncAccess = {
    checkHandle(hnd) {
      // console.log('check', hnd, oobHandle);
      return hnd === syncHandle;
    },
    getHandle() {
      return syncHandle;
    },
  };

  const { objFar: rightRef, makeNear } = makeFar(
    'dean',
    harden({
      promise: pr.p,
      syncAccess,
      encourager: {
        encourage(name) {
          const bang = new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  trigger() {
                    return `${name} BANG!`;
                  },
                }),
              200,
            );
          });
          return { comment: `good work, ${name}`, bang };
        },
      },
    }),
  );

  // Mark syncAccess as synchronous.
  const sa = makeNear(syncAccess);

  const { comment, bang } = await E(E.G(rightRef).encourager).encourage(
    'buddy',
  );
  t.is(comment, 'good work, buddy', 'got encouragement');
  t.is(await E(bang).trigger(), 'buddy BANG!', 'called on promise');
  pr.res('resolution');
  t.is(await E.G(rightRef).promise, 'resolution', 'get resolution');

  const asyncAccess = E.G(rightRef).syncAccess;
  t.is(
    await E(asyncAccess).checkHandle(syncHandle),
    false,
    'sync handle fails inband',
  );

  const asyncHandle = await E(asyncAccess).getHandle();
  // console.log('handle', ibHandle);
  t.is(
    await E(asyncAccess).checkHandle(asyncHandle),
    true,
    'async handle succeeds inband',
  );
  t.assert(sa.checkHandle(asyncHandle), 'async handle succeeds out of band');

  const oobHandle = sa.getHandle();
  t.assert(
    sa.checkHandle(oobHandle),
    'out-of-band handle succeeds out-of-band',
  );
  t.assert(
    await E(asyncAccess).checkHandle(oobHandle),
    'out-of-band handle succeeds inband',
  );
});
