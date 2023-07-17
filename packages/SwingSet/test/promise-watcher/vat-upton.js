// @ts-nocheck
import { Far, E } from '@endo/far';
import { initEmpty } from '@agoric/store';
import { makePromiseKit } from '@endo/promise-kit';
import {
  provideKindHandle,
  providePromiseWatcher,
  defineDurableKindMulti,
  watchPromise,
} from '@agoric/vat-data';

export function buildRootObject(vatPowers, vatParameters, baggage) {
  const log = vatPowers.testLog;
  const pwHandle = provideKindHandle(baggage, 'pwhandle');
  const dkHandle = provideKindHandle(baggage, 'dkhandle');

  // prettier-ignore
  const pw = providePromiseWatcher(
    pwHandle,
    (res, tag, ...args) =>
      log(
        `${tag} resolved ${res} version ${vatParameters.version} via watcher [${args.join(',')}]`,
      ),
    (err, tag, ...args) =>
      log(
        `${tag} rejected ${JSON.stringify(err)} version ${vatParameters.version} via watcher [${args.join(',')}]`,
      ),
  );

  // prettier-ignore
  const makeDK = defineDurableKindMulti(dkHandle, initEmpty, {
    full: {
      onFulfilled: (_context, res, tag) =>
        log(`${tag} resolved ${res} version ${vatParameters.version} via VDO`),
      onRejected: (_context, err, tag) =>
        log(`${tag} rejected ${JSON.stringify(err)} version ${vatParameters.version} via VDO`),
    },
    res: {
      onFulfilled: (_context, res, tag) =>
        log(
          `${tag} resolved ${res} version ${vatParameters.version} via VDO (res)`,
        ),
    },
    rej: {
      onRejected: (_context, err, tag) =>
        log(
          `${tag} rejected ${JSON.stringify(err)} version ${vatParameters.version} via VDO (rej)`,
        ),
    },
  });

  return Far('root', {
    haveSomePromises(other, p1, p2, p3, p4) {
      const dk = makeDK();
      const lpk1 = makePromiseKit();
      const lpk2 = makePromiseKit();
      const lpk3 = makePromiseKit();
      const lpk4 = makePromiseKit();
      const rp1 = E(other).replyToThis(true, true);
      const rp2 = E(other).replyToThis(false, true);
      const rp3 = E(other).replyToThis(true, false);
      const rp4 = E(other).replyToThis(false, false);
      watchPromise(p1, pw, 'p1-pw');
      watchPromise(p2, pw, 'p2-pw', 'a');
      watchPromise(p3, pw, 'p3-pw', 'b', 'c');
      watchPromise(p4, pw, 'p4-pw', 'd', 'e', 'f');
      watchPromise(p1, dk.full, 'p1-dk.full');
      watchPromise(p1, dk.res, 'p1-dk.res');
      watchPromise(p1, dk.rej, 'p1-dk.rej');
      watchPromise(p2, dk.full, 'p2-dk.full');
      watchPromise(p2, dk.res, 'p2-dk.res');
      watchPromise(p2, dk.rej, 'p2-dk.rej');
      watchPromise(p3, dk.full, 'p3-dk.full');
      watchPromise(p3, dk.res, 'p3-dk.res');
      watchPromise(p3, dk.rej, 'p3-dk.rej');
      watchPromise(p4, dk.full, 'p4-dk.full');
      watchPromise(p4, dk.res, 'p4-dk.res');
      watchPromise(p4, dk.rej, 'p4-dk.rej');
      watchPromise(lpk1.promise, pw, 'lp1-pw');
      watchPromise(lpk2.promise, pw, 'lp2-pw');
      watchPromise(lpk3.promise, pw, 'lp3-pw');
      watchPromise(lpk4.promise, pw, 'lp4-pw');
      watchPromise(lpk1.promise, dk.full, 'lp1-dk');
      watchPromise(lpk2.promise, dk.full, 'lp2-dk');
      watchPromise(lpk3.promise, dk.full, 'lp3-dk');
      watchPromise(lpk4.promise, dk.full, 'lp4-dk');
      watchPromise(rp1, pw, 'rp1-pw');
      watchPromise(rp2, pw, 'rp2-pw');
      watchPromise(rp3, pw, 'rp3-pw');
      watchPromise(rp4, pw, 'rp4-pw');
      watchPromise(rp1, dk.full, 'rp1-dk');
      watchPromise(rp2, dk.full, 'rp2-dk');
      watchPromise(rp3, dk.full, 'rp3-dk');
      watchPromise(rp4, dk.full, 'rp4-dk');
      lpk1.resolve('lval1');
      lpk2.reject('lerr2');
    },
  });
}
