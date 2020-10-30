// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { HandledPromise } from './get-hp';

test('chained properties', async t => {
  const pr = {};
  const data = {};
  const queue = [];
  const handler = {
    applyMethod(_o, prop, args) {
      // Support: o~.[prop](...args) remote method invocation
      queue.push([0, prop, args]);
      return data;
      // return queueMessage(slot, prop, args);
    },
  };
  data.prop = new HandledPromise(_ => {}, handler);

  pr.p = new HandledPromise((res, rej, resolveWithPresence) => {
    pr.res = res;
    pr.rej = rej;
    pr.resPres = resolveWithPresence;
  }, handler);

  const hp = HandledPromise.applyMethod(
    HandledPromise.get(HandledPromise.applyMethod(pr.p, 'cont0', []), 'prop'),
    'cont1',
    [],
  );
  t.deepEqual(queue, [], `zeroth turn`);
  pr.resPres(handler);
  await hp;
  t.deepEqual(
    queue,
    [
      [0, 'cont0', []],
      [0, 'cont1', []],
    ],
    `first turn`,
  );
  await pr.p;
});

test('no local stalls', async t => {
  const log = [];
  const target = {
    call(count) {
      log.push(`called ${count}`);
    },
  };

  let resolve;
  const p = new HandledPromise(r => (resolve = r));
  resolve(target);
  await Promise.resolve();

  log.push('calling 1');
  HandledPromise.applyMethod(p, 'call', [1]);
  log.push(`end of turn 1`);
  await Promise.resolve();

  log.push('calling 2');
  HandledPromise.applyMethod(p, 'call', [2]);
  log.push(`end of turn 2`);
  await Promise.resolve();
  log.push(`end of turn 3`);
  await Promise.resolve();

  t.deepEqual(
    log,
    [
      'calling 1',
      'end of turn 1',
      'called 1',
      'calling 2',
      'end of turn 2',
      'called 2',
      'end of turn 3',
    ],
    'log is golden',
  );
});

test('resolveWithPresence test nr 1', async t => {
  const log = [];
  const presenceHandler = {
    applyMethod(target, verb, args) {
      log.push(['applyMethod', target, verb, args]);
      return undefined;
    },
  };
  let presence;
  const pr = new HandledPromise((res, rej, rWp) => {
    presence = rWp(presenceHandler);
    return presence;
  });
  HandledPromise.applyMethod(pr, 'aðferð', [1]);
  await Promise.resolve();
  t.deepEqual(log, [['applyMethod', presence, 'aðferð', [1]]], 'log a-ok');
});

test('resolveWithPresence test nr 2', async t => {
  const logA = [];
  const unresolvedHandler = {
    applyMethod(target, verb, args) {
      logA.push(['applyMethod', target, verb, args]);
      return undefined;
    },
  };
  const logB = [];
  const presenceHandler = {
    applyMethod(target, verb, args) {
      logB.push(['applyMethod', target, verb, args]);
      return undefined;
    },
  };
  const p0 = {};
  p0.promise = new HandledPromise((resolve, reject, resolveWithPresence) => {
    p0.resolve = resolve;
    p0.reject = reject;
    p0.resolveWithPresence = resolveWithPresence;
  }, unresolvedHandler);
  HandledPromise.applyMethod(p0.promise, 'óðaÖnn', [1]);
  await Promise.resolve();
  const p1 = p0.resolveWithPresence(presenceHandler);
  HandledPromise.applyMethod(p0.promise, 'aðferð', [2]);
  await Promise.resolve();
  // t.log('logA:', logA);
  // t.log('logB:', logB);
  // t.log('p1:', p1);
  t.deepEqual(logA, [['applyMethod', p0.promise, 'óðaÖnn', [1]]], 'logA ok');
  t.deepEqual(logB, [['applyMethod', p1, 'aðferð', [2]]], 'logB ok');
  // t.fail('stöðva hér');
});

test('resolveWithPresence test nr 3', async t => {
  const presenceHandler = {
    applyMethod(target, verb, args) {
      const muffler = [];
      muffler.push(target);
      muffler.push(verb);
      muffler.push(args);
      return undefined;
    },
  };
  let presence;
  const vow = new HandledPromise((resolve, reject, resolveWithPresence) => {
    presence = resolveWithPresence(presenceHandler);
  });
  const p = await vow;
  t.is(presence, p);
});

test.skip('resolveWithPresence test nr 4', async t => {
  t.log('proxy support being now tested');
  const log = [];
  const presenceEventualHandler = {
    applyMethod(target, verb, args) {
      log.push(['eventualSend', target, verb, args]);
      return undefined;
    },
    apply(target, args) {
      log.push(['eventualApply', target, args]);
      return undefined;
    },
    get(target, property) {
      log.push(['eventualGet', target, property]);
      return undefined;
    },
    set(target, property, value, receiver) {
      // this trap should never run, but it does the default hardcoded behaviour
      presenceEventualHandler.setOnly(target, property, value, receiver);
      return value;
    },
    setOnly(target, property, value, receiver) {
      log.push(['eventualSetOnly', target, property, value, receiver]);
      return undefined; // traps return value is always ignored
    },
  };
  const presenceImmediateHandler = {
    apply: function(target, thisArg, args) {
      log.push(['apply', target, thisArg, args]);
      return undefined;
    },
    construct: function(target, args, newTarget) {
      log.push(['construct', target, args, newTarget]);
      return {};
    },
    defineProperty: function (target, property, descriptor) {
      log.push(['defineProperty', target, property, descriptor]);
      return false;
    },
    deleteProperty: function (target, property) {
      log.push(['deleteProperty', target, property]);
      return false;
    },
    get: function (target, property, receiver) {
      log.push(['get', target, property, receiver]);
      if (target === receiver) {
        if ('then' === property) {
          return (callback, errback) => {
            try {
              return Promise.resolve(callback(target));
            } catch (problem) {
              return Promise.reject(proplem);
            }
          }
        }
        if ('catch' === property) {
          return errback => Promise.resolve(target);
        }
        if ('finally' === property) {
          return callback => {
            try {
              callback();
            } catch (problem) { }
          }
        }
        if('there' === property) {
          /*
          const minOf = (a, b) => {
            if (b === undefined) { return a; }
            if (a === undefined) { return b; }
            if (b === null) { return a; }
            if (a === null) { return b; }
            switch (typeof(a)) {
              case 'number': // fallthrough
              case 'bigint': return (BigInt(a) < BigInt(b)) ? a : b ;
              case 'object':
                if (typeof(b) !== 'object') {
                  throw new Error('minOf got two mutually incompareable objects');
                }
                if (Array.isArray(a) && Array.isArray(b)) {
                  const t1 = (a.length < b.length);
                  const t2 = t1 ? b : a ;
                  const t3 = t1 ? a : b ;
                  return t2.map((aItem, idx) => minOf(aItem, t3[idx]));
                } else {
                  const t4 = Object.entries(a);
                  const t5 = Object.entries(b);
                  const t6 = (t4.length < t5.length);
                  const t7 = t6 ? t5 : t4 ;
                  const t8 = t6 ? t4 : t5 ;
                  const t9 = t6 ? a : b ;
                  return Object.fromEntries(
                    t7.map((item, idx) => {
                      const [name, valueA] = item;
                      const valueB = t9[name];
                      return [name, minOf(valueA, valueB)];
                    }),
                  );
                }
            }
          }
          */
          const there = nomad => {
            if (typeof(nomad) === 'function') {
              try {
                return Promise.resolve(there());
              } catch (problem) {
                return Promise.reject(problem);
              }
            } else {
              return Promise.reject(new Error('tbi, until then, unhelpfull'));
            }
          };
          return there;
        }
      }
      return undefined;
    },
    getOwnPropertyDescriptor: function (target, property) {
      log.push(['getOwnPropertyDescriptor', target, property]);
      return undefined;
    },
    getPrototypeOf: function(target) {
      log.push(['getPrototypeOf', target]);
      return null;
    },
    has: function(target, property) {
      log.push(['has', target, property]);
      return false;
    },
    isExtensible: function(target) {
      log.push(['isExtensible', target]);
      return false;
    },
    ownKeys: function(target) {
      log.push(['ownKeys', target]);
      return [];
    },
    preventExtensions: function(target) {
      log.push(['preventExtensions', target]);
      return false;
    },
    set: function(target, property, value, receiver) {
      log.push(['set', target, property, value, receiver]);
      return false;
    },
    setPrototypeOf: function(target, prototype) {
      log.push(['setPrototypeOf', target, prototype]);
      return false;
    },
  };
  let pr = {};
  pr.promise = HandledPromise((resolve, reject, resolveWithPresence) => {
    pr = { ...pr, resolve, reject, resolveWithPresence };
  });
  await Promise.resolve();
  pr.resolveWithPresence(
    presenceEventualHandler,
    { proxy: { handler: presenceImmediateHandler, target: {} },
  );
});
