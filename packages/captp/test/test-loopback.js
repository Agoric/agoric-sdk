/* global harden */

import '@agoric/install-ses';
import test from 'ava';
import { E, makeLoopback } from '../lib/captp';

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

  const { bootstrap: rightRef, sync } = makeLoopback(
    'dean',
    harden({
      promise: pr.p,
      syncAccess: { ...syncAccess },
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
  sync(syncAccess);

  const { comment, bang } = await E(E.G(rightRef).encourager).encourage(
    'buddy',
  );
  t.is(comment, 'good work, buddy', 'got encouragement');
  t.is(await E(bang).trigger(), 'buddy BANG!', 'called on promise');
  pr.res('resolution');
  t.is(await E.G(rightRef).promise, 'resolution', 'get resolution');

  const asyncAccess = E.G(rightRef).syncAccess;
  t.not(
    await E(asyncAccess).checkHandle(syncHandle),
    'sync handle fails inband',
  );

  const asyncHandle = await E(asyncAccess).getHandle();
  // console.log('handle', ibHandle);
  t.assert(
    await E(asyncAccess).checkHandle(asyncHandle),
    'async handle check succeeds inband',
  );
  t.not(syncAccess.checkHandle(asyncHandle), 'async handle fails out of band');

  const oobHandle = syncAccess.getHandle();
  t.assert(
    syncAccess.checkHandle(oobHandle),
    'out-of-band handle succeeds out-of-band',
  );
  t.assert(
    await E(asyncAccess).checkHandle(oobHandle),
    'out-of-band handle check succeeds inband',
  );
});
